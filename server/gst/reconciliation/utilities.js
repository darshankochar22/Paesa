'use strict';

// GST Utilities + Other Reports — Rate Setup grids, party-GSTIN validation and
// creation, GST opening advances, Marked Vouchers, Advance Receipts/Payments,
// Reverse Charge Supplies and the company-registration resolution screen.

const { db } = require('../../db/index');
const { sql } = require('drizzle-orm');
const {
  vouchers,
  ledgers,
  gstRegistrations,
  voucherStockEntries,
  companies,
} = require('../../db/schema');
const { GSTIN_RE } = require('./core');

// ───────────────────────────────────────────────────────────────────────────────
// GST Rate Setup (GST Utilities) — list the masters of one type with their GST rate
// configuration and the status bucket each falls under, so the setup grid can group
// them (GST Rate-18%, Exempt, GST Rate Details Not Provided, GST Not Applicable, …).
// All 4 master types keep their own GST columns; ledgers keep them in
// ledger_statutory_details. This is a read view — editing is via the master screens.
// ───────────────────────────────────────────────────────────────────────────────
const rateSetupStatus = ({
  gst_applicability,
  taxability_type,
  gst_rate,
  hsn,
  gst_rate_source,
}) => {
  const taxability = String(taxability_type || '').trim();
  const rate = Number(gst_rate) || 0;
  if (String(gst_applicability || '') === 'Not Applicable') return 'GST Not Applicable';
  // A ledger carrying gst_rate_source='As per Company/Group' has NOT specified a rate of its
  // own — GST applies but the rate details are inherited/blank, so it is "not provided",
  // regardless of the placeholder taxability_type='Taxable' the form leaves behind. (Stock
  // items pass gst_rate_source undefined and fall through to the value-based logic below.)
  if (String(gst_rate_source || '') === 'As per Company/Group')
    return 'GST Rate Details Not Provided';
  if (/exempt/i.test(taxability)) return 'Exempt';
  if (/nil/i.test(taxability)) return 'Nil Rated';
  if (/non[- ]?gst/i.test(taxability)) return 'Non-GST';
  if (/taxable/i.test(taxability)) return `GST Rate-${rate}%`;
  if (!taxability && rate === 0 && !String(hsn || '').trim())
    return 'GST Rate Details Not Provided';
  return `GST Rate-${rate}%`;
};

const RATE_SETUP_QUERIES = {
  // Stock items honour their own gst_applicable: an item explicitly set "Not Applicable"
  // buckets under "GST Not Applicable", while an Applicable item with no rate is "Not
  // Provided" (goods default to Applicable in the form, so Not Applicable is a deliberate choice).
  stock_item: (company_id) => sql`
    SELECT item_id AS id, name, gst_applicable AS gst_applicability,
           taxability_type, gst_rate, COALESCE(NULLIF(hsn_sac, ''), hsn_code) AS hsn
    FROM stock_items WHERE company_id = ${company_id} AND is_active = 1
    ORDER BY name COLLATE NOCASE`,
  // GST tax ledgers (Duties & Taxes, type_of_duty_tax='GST') are excluded — Tally does not
  // list tax-collection accounts in GST Rate Setup; you set rates on supplies, not on CGST/SGST/IGST.
  ledger: (company_id) => sql`
    SELECT l.ledger_id AS id, l.name,
           sd.gst_applicability AS gst_applicability,
           sd.taxability_type AS taxability_type, sd.gst_rate AS gst_rate,
           sd.hsn_sac_code AS hsn, sd.gst_rate_source AS gst_rate_source
    FROM ledgers l
    LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = l.ledger_id
    WHERE l.company_id = ${company_id} AND l.is_active = 1
      AND (sd.type_of_duty_tax IS NULL OR sd.type_of_duty_tax != 'GST')
    ORDER BY l.name COLLATE NOCASE`,
  group: (company_id) => sql`
    SELECT group_id AS id, name, NULL AS gst_applicability,
           taxability_type, gst_rate, hsn_sac_code AS hsn
    FROM groups WHERE company_id = ${company_id} AND is_active = 1
    ORDER BY name COLLATE NOCASE`,
  stock_group: (company_id) => sql`
    SELECT sg_id AS id, name, NULL AS gst_applicability,
           taxability_type, gst_rate, hsn_sac_code AS hsn
    FROM stock_groups WHERE company_id = ${company_id} AND is_active = 1
    ORDER BY name COLLATE NOCASE`,
};

const getGstRateSetup = async (company_id, master_type) => {
  try {
    const build = RATE_SETUP_QUERIES[master_type];
    if (!build) return { success: false, error: `Unknown master type: ${master_type}` };
    const rows = await db.all(build(company_id));
    const masters = rows.map((r) => ({
      id: r.id,
      name: r.name,
      taxability_type: r.taxability_type || '',
      gst_rate: Number(r.gst_rate) || 0,
      hsn: r.hsn || '',
      gst_applicability: r.gst_applicability || '',
      status: rateSetupStatus(r),
    }));
    return { success: true, masters };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// GST Rate Setup — group-hierarchy view. Mirrors TallyPrime's actual drill flow: the
// screen opens at "Group: ♦ Primary" (group_id null) listing the top-level accounting
// groups, and drilling into any group shows its sub-groups + ledgers bucketed by GST
// status. Only groups that hold at least one ledger (directly or nested) are listed —
// empty predefined groups (e.g. Suspense A/c) are hidden, exactly like Tally.
const getGstRateSetupTree = async (company_id, group_id) => {
  try {
    const gid = group_id == null ? null : Number(group_id);
    const parentFilter =
      gid == null ? sql`g.parent_group_id IS NULL` : sql`g.parent_group_id = ${gid}`;

    // A group is "non-empty" if it directly holds a (non-GST-tax) ledger, or is an ancestor
    // of one. GST tax ledgers (Duties & Taxes, type_of_duty_tax='GST') are excluded from GST
    // Rate Setup like Tally — a group holding only tax ledgers is treated as empty and hidden.
    const groupRows = await db.all(sql`
      WITH RECURSIVE nonempty(gid) AS (
        SELECT DISTINCT l.group_id FROM ledgers l
          LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = l.ledger_id
          WHERE l.company_id = ${company_id} AND l.is_active = 1 AND l.group_id IS NOT NULL
            AND (sd.type_of_duty_tax IS NULL OR sd.type_of_duty_tax != 'GST')
        UNION
        SELECT g2.parent_group_id FROM groups g2
          JOIN nonempty n ON g2.group_id = n.gid
          WHERE g2.parent_group_id IS NOT NULL
      )
      SELECT g.group_id AS id, g.name, NULL AS gst_applicability,
             g.taxability_type, g.gst_rate, g.hsn_sac_code AS hsn
      FROM groups g
      WHERE g.company_id = ${company_id} AND g.is_active = 1
        AND ${parentFilter}
        AND g.group_id IN (SELECT gid FROM nonempty)
      ORDER BY g.name COLLATE NOCASE`);

    // Ledgers sit directly under a group; Primary (null) has none of its own.
    const ledgerRows =
      gid == null
        ? []
        : await db.all(sql`
            SELECT l.ledger_id AS id, l.name,
                   sd.gst_applicability AS gst_applicability,
                   sd.taxability_type AS taxability_type, sd.gst_rate AS gst_rate,
                   sd.hsn_sac_code AS hsn, sd.gst_rate_source AS gst_rate_source
            FROM ledgers l
            LEFT JOIN ledger_statutory_details sd ON sd.ledger_id = l.ledger_id
            WHERE l.company_id = ${company_id} AND l.is_active = 1 AND l.group_id = ${gid}
              AND (sd.type_of_duty_tax IS NULL OR sd.type_of_duty_tax != 'GST')
            ORDER BY l.name COLLATE NOCASE`);

    const mapMaster = (kind) => (r) => ({
      id: r.id,
      name: r.name,
      kind,
      taxability_type: r.taxability_type || '',
      gst_rate: Number(r.gst_rate) || 0,
      hsn: r.hsn || '',
      gst_applicability: r.gst_applicability || '',
      status: rateSetupStatus(r),
    });

    let current = null;
    if (gid != null) {
      const [g] = await db.all(
        sql`SELECT group_id AS id, name FROM groups WHERE group_id = ${gid} AND company_id = ${company_id}`,
      );
      if (g) current = { id: g.id, name: g.name };
    }

    return {
      success: true,
      group: current,
      groups: groupRows.map(mapMaster('group')),
      ledgers: ledgerRows.map(mapMaster('ledger')),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// GST Rate Setup — Stock Group hierarchy view. Same drill flow as getGstRateSetupTree, but
// over the inventory tree: opens at "Stock Group: ♦ Primary" (stock_group_id null) listing
// the top-level stock groups + the stock items sitting directly under Primary, and drilling
// into a stock group shows its sub-groups + items bucketed by GST status. Stock items resolve
// their status from their own value columns (no gst_rate_source), so an explicit Taxable @ 0%
// stays "GST Rate-0%" while a blank item is "GST Rate Details Not Provided".
const getGstRateSetupStockTree = async (company_id, stock_group_id) => {
  try {
    const sgid = stock_group_id == null ? null : Number(stock_group_id);
    const groupFilter =
      sgid == null ? sql`sg.parent_group_id IS NULL` : sql`sg.parent_group_id = ${sgid}`;
    const itemFilter = sgid == null ? sql`si.group_id IS NULL` : sql`si.group_id = ${sgid}`;

    const groupRows = await db.all(sql`
      SELECT sg.sg_id AS id, sg.name, NULL AS gst_applicability,
             sg.taxability_type, sg.gst_rate, sg.hsn_sac_code AS hsn
      FROM stock_groups sg
      WHERE sg.company_id = ${company_id} AND sg.is_active = 1
        AND sg.is_primary = 0 AND ${groupFilter}
      ORDER BY sg.name COLLATE NOCASE`);

    // Items honour their own gst_applicable (see RATE_SETUP_QUERIES.stock_item).
    const itemRows = await db.all(sql`
      SELECT si.item_id AS id, si.name, si.gst_applicable AS gst_applicability,
             si.taxability_type AS taxability_type, si.gst_rate AS gst_rate,
             COALESCE(NULLIF(si.hsn_sac, ''), si.hsn_code) AS hsn
      FROM stock_items si
      WHERE si.company_id = ${company_id} AND si.is_active = 1 AND ${itemFilter}
      ORDER BY si.name COLLATE NOCASE`);

    const mapMaster = (kind) => (r) => ({
      id: r.id,
      name: r.name,
      kind,
      taxability_type: r.taxability_type || '',
      gst_rate: Number(r.gst_rate) || 0,
      hsn: r.hsn || '',
      gst_applicability: r.gst_applicability || '',
      status: rateSetupStatus(r),
    });

    let current = null;
    if (sgid != null) {
      const [g] = await db.all(
        sql`SELECT sg_id AS id, name FROM stock_groups WHERE sg_id = ${sgid} AND company_id = ${company_id}`,
      );
      if (g) current = { id: g.id, name: g.name };
    }

    return {
      success: true,
      group: current,
      groups: groupRows.map(mapMaster('stock_group')),
      ledgers: itemRows.map(mapMaster('stock_item')),
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Validate Party GSTIN/UIN (GST Utilities) — list party ledgers with their GST
// registration details and an OFFLINE validity check (format + PAN-in-GSTIN). No GST
// portal round-trip exists, so "valid" = well-formed GSTIN whose embedded PAN matches
// the ledger PAN; a registered party with a missing/malformed GSTIN is an exception.
// ───────────────────────────────────────────────────────────────────────────────
const validatePartyGstin = async (company_id, opts = {}) => {
  try {
    const groupName = opts.group_name && opts.group_name !== 'All Items' ? opts.group_name : null;
    const ledgerName =
      opts.ledger_name && opts.ledger_name !== 'All Items' ? opts.ledger_name : null;

    const scope = groupName
      ? sql`AND g.name = ${groupName}`
      : sql`AND (g.name IN ('Sundry Debtors', 'Sundry Creditors', 'Branch / Divisions')
                 OR (l.gstin IS NOT NULL AND l.gstin != '')
                 OR (l.registration_type IS NOT NULL AND l.registration_type != 'Unregistered'))`;
    const ledgerFilter = ledgerName ? sql`AND l.name = ${ledgerName}` : sql``;

    const rows = await db.all(
      sql`SELECT l.ledger_id AS id, l.name, l.mailing_name,
                 l.address1, l.address2, l.state, l.country,
                 l.registration_type, l.gstin, l.pan, g.name AS group_name
          FROM ${ledgers} l
          LEFT JOIN groups g ON g.group_id = l.group_id
          WHERE l.company_id = ${company_id} AND l.is_active = 1
          ${scope} ${ledgerFilter}
          ORDER BY l.name COLLATE NOCASE`,
    );

    const parties = rows.map((r) => {
      const gstin = String(r.gstin || '')
        .trim()
        .toUpperCase();
      const pan = String(r.pan || '')
        .trim()
        .toUpperCase();
      const registered =
        !!r.registration_type &&
        r.registration_type !== 'Unregistered' &&
        r.registration_type !== 'Consumer';

      let valid = true;
      let status = 'Not Applicable';
      if (!gstin) {
        valid = !registered;
        status = registered ? 'GSTIN/UIN not specified' : 'Not Applicable';
      } else if (!GSTIN_RE.test(gstin)) {
        valid = false;
        status = 'Invalid GSTIN/UIN format';
      } else if (pan && gstin.substring(2, 12) !== pan) {
        valid = false;
        status = 'PAN in GSTIN/UIN does not match';
      } else {
        valid = true;
        status = 'Valid';
      }

      const address = [r.address1, r.address2].filter(Boolean).join(', ');
      return {
        id: r.id,
        name: r.name,
        address,
        state: r.state || '',
        country: r.country || '',
        registration_type: r.registration_type || '',
        gstin,
        pan,
        valid,
        status,
      };
    });

    return { success: true, parties };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// India GST state codes (first two digits of a GSTIN) → state name.
const GST_STATE_CODES = {
  '01': 'Jammu & Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  10: 'Bihar',
  11: 'Sikkim',
  12: 'Arunachal Pradesh',
  13: 'Nagaland',
  14: 'Manipur',
  15: 'Mizoram',
  16: 'Tripura',
  17: 'Meghalaya',
  18: 'Assam',
  19: 'West Bengal',
  20: 'Jharkhand',
  21: 'Odisha',
  22: 'Chhattisgarh',
  23: 'Madhya Pradesh',
  24: 'Gujarat',
  25: 'Daman & Diu',
  26: 'Dadra & Nagar Haveli',
  27: 'Maharashtra',
  28: 'Andhra Pradesh',
  29: 'Karnataka',
  30: 'Goa',
  31: 'Lakshadweep',
  32: 'Kerala',
  33: 'Tamil Nadu',
  34: 'Puducherry',
  35: 'Andaman & Nicobar Islands',
  36: 'Telangana',
  37: 'Andhra Pradesh',
  38: 'Ladakh',
  97: 'Other Territory',
};

// ───────────────────────────────────────────────────────────────────────────────
// Create Party Using GSTIN/UIN (GST Utilities) — create a party ledger for each
// GSTIN. Offline (no portal), the derivable details are State (from the state-code
// prefix), PAN (chars 3-12) and Registration Type; the ledger is named after the
// GSTIN and can be renamed later. Reuses ledgerService.create so the ledger is set
// up exactly like a manually-created one.
// ───────────────────────────────────────────────────────────────────────────────
const createPartiesFromGstin = async (company_id, opts = {}) => {
  try {
    const ledgerService = require('../../ledger/ledgerService');
    const groupName = opts.group_name || 'Sundry Debtors';
    const grp = await db.all(
      sql`SELECT group_id FROM groups
          WHERE company_id = ${company_id} AND name = ${groupName} AND is_active = 1 LIMIT 1`,
    );
    const groupId = grp[0] ? grp[0].group_id : null;
    if (!groupId) return { success: false, error: `Group "${groupName}" not found.` };

    const results = [];
    for (const raw of opts.gstins || []) {
      const gstin = String(raw || '')
        .trim()
        .toUpperCase();
      if (!gstin) continue;
      if (!GSTIN_RE.test(gstin)) {
        results.push({ gstin, success: false, error: 'Invalid GSTIN/UIN format' });
        continue;
      }
      const stateCode = gstin.substring(0, 2);
      const state = GST_STATE_CODES[stateCode] || '';
      const pan = gstin.substring(2, 12);
      const res = await ledgerService.create({
        company_id,
        name: gstin,
        group_id: groupId,
        state,
        country: 'India',
        gstin,
        pan,
        registration_type: 'Regular',
      });
      results.push({
        gstin,
        success: !!res.success,
        ledger_id: res.ledger?.ledger_id ?? res.ledger_id ?? null,
        state,
        error: res.error,
      });
    }
    return { success: true, results };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// Validate Party GSTIN/UIN → F9 Update Details — persist the corrected GST identity
// (Registration Type / GSTIN / PAN / State / Country) onto one party ledger. This is a
// partial, GST-only write that never touches the ledger's other flags (unlike the
// generic ledger.update). Values are saved exactly as entered — deriving PAN/State from
// the GSTIN is an explicit, visible action ("Fetch Details Using GSTIN/UIN" in the popup),
// never a silent side effect of Accept.
// ───────────────────────────────────────────────────────────────────────────────
const updatePartyGstDetails = async ({
  ledger_id,
  registration_type,
  gstin,
  pan,
  state,
  country,
} = {}) => {
  try {
    if (!ledger_id) return { success: false, error: 'ledger_id is required' };

    const found = await db.all(
      sql`SELECT ledger_id, is_predefined, state, country, gstin, pan, registration_type
          FROM ${ledgers} WHERE ledger_id = ${ledger_id} LIMIT 1`,
    );
    const led = found[0];
    if (!led) return { success: false, error: 'Ledger not found' };
    if (led.is_predefined) return { success: false, error: 'Cannot edit predefined ledgers' };

    const cleanGstin = String(gstin ?? '')
      .trim()
      .toUpperCase();
    if (cleanGstin && !GSTIN_RE.test(cleanGstin)) {
      return { success: false, error: 'Invalid GSTIN/UIN format' };
    }

    // Save exactly what the popup provides — no silent PAN/State derivation. (The popup's
    // "Fetch Details Using GSTIN/UIN" fills these from the GSTIN visibly, before Accept.)
    const cleanPan = String(pan ?? led.pan ?? '')
      .trim()
      .toUpperCase();
    // PAN: 5 letters, 4 digits, 1 letter (e.g. AAAPS1234A) — reject anything malformed.
    if (cleanPan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(cleanPan)) {
      return {
        success: false,
        error:
          'Invalid PAN format. The PAN must contain 5 alphabets, followed by 4 numbers and then 1 alphabet. For example: AAAPS1234A',
      };
    }
    const cleanState = String(state ?? led.state ?? '').trim();
    const cleanCountry = String(country ?? led.country ?? '').trim();
    const regType = String(registration_type ?? led.registration_type ?? 'Unregistered').trim();

    await db.execute(
      `UPDATE ledgers
          SET registration_type = ?, gstin = ?, pan = ?, state = ?, country = ?,
              updated_at = datetime('now')
        WHERE ledger_id = ?`,
      [
        regType || 'Unregistered',
        cleanGstin || null,
        cleanPan || null,
        cleanState || null,
        cleanCountry || null,
        ledger_id,
      ],
    );

    return {
      success: true,
      ledger: {
        ledger_id,
        registration_type: regType || 'Unregistered',
        gstin: cleanGstin,
        pan: cleanPan,
        state: cleanState,
        country: cleanCountry,
      },
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// GST Advances - Opening Balance (GST Utilities) — CRUD over gst_opening_advances,
// the unadjusted advance receipts/payments carrying GST liability at the opening date.
// The GST split (intra CGST+SGST vs inter IGST) is computed by the caller and stored.
// ───────────────────────────────────────────────────────────────────────────────
const getGstOpeningAdvances = async (company_id) => {
  try {
    const rows = await db.all(
      sql`SELECT * FROM gst_opening_advances WHERE company_id = ${company_id}
          ORDER BY advance_id DESC`,
    );
    return { success: true, advances: rows };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const createGstOpeningAdvance = async (company_id, data = {}) => {
  try {
    const n = (v) => Number(v) || 0;
    await db.execute(
      `INSERT INTO gst_opening_advances
         (company_id, gst_registration_id, registration_name, party_ledger_id, party_name,
          type_of_advance, place_of_supply, reverse_charge, date, taxability, gst_rate,
          advance_amount, taxable_amount, igst, cgst, sgst, cess)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_id,
        data.gst_registration_id ?? null,
        data.registration_name ?? null,
        data.party_ledger_id ?? null,
        data.party_name ?? null,
        data.type_of_advance === 'Payment' ? 'Payment' : 'Receipt',
        data.place_of_supply ?? null,
        data.reverse_charge ? 1 : 0,
        data.date ?? null,
        data.taxability ?? 'Taxable',
        n(data.gst_rate),
        n(data.advance_amount),
        n(data.taxable_amount),
        n(data.igst),
        n(data.cgst),
        n(data.sgst),
        n(data.cess),
      ],
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

const deleteGstOpeningAdvance = async (advance_id, company_id) => {
  try {
    await db.execute(`DELETE FROM gst_opening_advances WHERE advance_id = ? AND company_id = ?`, [
      advance_id,
      company_id,
    ]);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// ───────────────────────────────────────────────────────────────────────────────
// GST Reports → Other Reports (Marked Vouchers, Outstanding Advances, Reverse Charge).
// ───────────────────────────────────────────────────────────────────────────────

// Marked Vouchers register — the full voucher register (day-book style). The amount
// shows on the party ledger's own side (Dr→Debit, Cr→Credit); no-party vouchers show
// the total under Debit. Rows drill to the voucher.
const getMarkedVouchers = async (company_id, fy_id) => {
  try {
    const rows = await db.all(
      sql`SELECT v.voucher_id, v.date, v.voucher_type, v.voucher_number,
                 COALESCE(NULLIF(v.party_name, ''), l.name, '') AS particulars,
                 COALESCE(e.dr_total, 0) AS dr_total,
                 COALESCE(e.cr_total, 0) AS cr_total,
                 COALESCE(p.party_type, '') AS party_type
          FROM ${vouchers} v
          LEFT JOIN ${ledgers} l ON l.ledger_id = v.party_ledger_id
          LEFT JOIN (
            SELECT voucher_id,
                   SUM(CASE WHEN type = 'Dr' THEN amount ELSE 0 END) AS dr_total,
                   SUM(CASE WHEN type = 'Cr' THEN amount ELSE 0 END) AS cr_total
            FROM voucher_entries GROUP BY voucher_id
          ) e ON e.voucher_id = v.voucher_id
          LEFT JOIN (
            SELECT voucher_id, ledger_id, MAX(type) AS party_type
            FROM voucher_entries GROUP BY voucher_id, ledger_id
          ) p ON p.voucher_id = v.voucher_id AND p.ledger_id = v.party_ledger_id
          WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
          ORDER BY v.date ASC, v.voucher_id ASC`,
    );
    const list = rows.map((r) => {
      const total = Math.max(Number(r.dr_total) || 0, Number(r.cr_total) || 0);
      const onCredit = r.party_type === 'Cr';
      return {
        voucher_id: r.voucher_id,
        date: r.date,
        particulars: r.particulars,
        voucher_type: r.voucher_type,
        voucher_number: r.voucher_number,
        debit: onCredit ? 0 : total,
        credit: onCredit ? total : 0,
      };
    });
    return { success: true, vouchers: list };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Outstanding Advance Receipts / Advance Paid — per-party opening / received / adjusted
// GST on unadjusted advances. Opening Balance comes from gst_opening_advances (the
// GST Advances - Opening Balance utility). Received/Adjusted are 0 until the app tracks
// GST-bearing advance receipts and their invoice adjustments as distinct data.
const getGstAdvancesReport = async (company_id, fy_id, type = 'Receipt') => {
  try {
    const kind = type === 'Payment' ? 'Payment' : 'Receipt';
    const rows = await db.all(
      sql`SELECT party_name, place_of_supply, registration_name,
                 COALESCE(SUM(taxable_amount), 0) AS taxable,
                 COALESCE(SUM(igst), 0) AS igst,
                 COALESCE(SUM(cgst), 0) AS cgst,
                 COALESCE(SUM(sgst), 0) AS sgst,
                 COALESCE(SUM(cess), 0) AS cess
          FROM gst_opening_advances
          WHERE company_id = ${company_id} AND type_of_advance = ${kind}
          GROUP BY party_name, place_of_supply
          ORDER BY party_name COLLATE NOCASE`,
    );
    const parties = rows.map((r) => {
      const igst = Number(r.igst) || 0;
      const cgst = Number(r.cgst) || 0;
      const sgst = Number(r.sgst) || 0;
      const cess = Number(r.cess) || 0;
      return {
        party_name: r.party_name || '',
        place_of_supply: r.place_of_supply || '',
        registration_name: r.registration_name || '',
        opening: {
          taxable: Number(r.taxable) || 0,
          igst,
          cgst,
          sgst,
          cess,
          tax: igst + cgst + sgst + cess,
        },
      };
    });
    return { success: true, type: kind, parties };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

// Reverse Charge Supplies — RCM liability/ITC per party. Purchases from unregistered
// parties or flagged reverse-charge attract RCM; the app does not persist an RCM flag
// on vouchers, so this is honestly empty until that data exists (matches TallyPrime EDU).
const getReverseChargeSupplies = async () => {
  // Honestly empty until an RCM flag is persisted on vouchers (matches TallyPrime EDU).
  return { success: true, rows: [] };
};

// Resolution list for the "GST Registration Details of the Company are invalid or not
// specified" exception. Groups the affected outward vouchers under each of the company's
// own registrations whose GSTIN is missing/invalid — the rows the user edits (via the GST
// Registration Details popup) to clear the exception. `gst_registration_id` scopes to one
// registration; null lists every invalid one ("All Registrations").
const getRegistrationResolution = async (
  company_id,
  fy_id,
  { gst_registration_id = null } = {},
) => {
  try {
    const comp =
      (await db.all(sql`SELECT * FROM ${companies} WHERE company_id = ${company_id} LIMIT 1`))[0] ||
      {};
    const address = comp.address1 || comp.mailing_name || comp.city || comp.name || '';

    const regRows = await db.all(
      sql`SELECT * FROM ${gstRegistrations}
          WHERE ${gstRegistrations.companyId} = ${company_id} AND ${gstRegistrations.isActive} = 1
          ORDER BY gst_id ASC`,
    );

    const rows = [];
    for (let idx = 0; idx < regRows.length; idx++) {
      const reg = regRows[idx];
      const invalid = !GSTIN_RE.test(String(reg.gstin || '').toUpperCase());
      if (!invalid) continue;
      if (gst_registration_id && reg.gst_id !== gst_registration_id) continue;

      const isPrimary = idx === 0;
      const regFilter = isPrimary
        ? sql`(v.gst_registration_id = ${reg.gst_id} OR v.gst_registration_id IS NULL)`
        : sql`v.gst_registration_id = ${reg.gst_id}`;
      const cnt =
        (
          await db.all(sql`
            SELECT COUNT(DISTINCT v.voucher_id) AS c
            FROM ${vouchers} v
            WHERE v.company_id = ${company_id} AND v.fy_id = ${fy_id} AND v.is_cancelled = 0
              AND v.voucher_type IN ('Sales', 'Credit Note', 'Debit Note')
              AND ${regFilter}
          `)
        )[0]?.c || 0;

      rows.push({
        gst_id: reg.gst_id,
        name: reg.state_id ? `${reg.state_id} Registration` : 'Company Registration',
        voucher_count: cnt,
        address,
        state_id: reg.state_id || '',
        registration_status: reg.registration_status || 'Active',
        address_type: reg.address_type || 'Primary',
        registration_type: reg.registration_type || 'Regular',
        assessee_of_other_territory: reg.assessee_of_other_territory ? 1 : 0,
        periodicity_of_gstr1: reg.periodicity_of_gstr1 || 'Monthly',
        gstin: reg.gstin || '',
        place_of_supply: reg.state_id || '',
      });
    }

    return { success: true, rows, address };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

module.exports = {
  getGstRateSetup,
  getGstRateSetupTree,
  getGstRateSetupStockTree,
  validatePartyGstin,
  createPartiesFromGstin,
  updatePartyGstDetails,
  getGstOpeningAdvances,
  createGstOpeningAdvance,
  deleteGstOpeningAdvance,
  getMarkedVouchers,
  getGstAdvancesReport,
  getReverseChargeSupplies,
  getRegistrationResolution,
};
