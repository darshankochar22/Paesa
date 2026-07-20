'use strict';

// Materialises `gst_voucher_tax_lines` for Tally-imported vouchers.
//
// That table is the app's canonical GST-line model — it carries HSN/SAC, component,
// rate, assessable value, the interstate flag and the party's GSTIN/state — and
// gstTaxCompute writes it for every voucher entered in the app. The Tally import runs
// with `import_mode`, which deliberately skips GST recompute, so imported vouchers have
// NO lines at all. With the source of truth empty, each consumer re-derives GST its own
// way (the statistics classifier from stock entries + duty postings, gstr1Service from
// stock entries, gstr3bService differently again) and they disagree — which is why a
// return's sections never tie to its own "Included in Return" count.
//
// The lines are reconstructed from what the voucher ACTUALLY BOOKED — the Duties & Taxes
// postings — never recomputed from today's masters, so a historical invoice keeps the
// tax it was filed with even if the item's or ledger's rate has since changed.
//
// Two shapes, mirroring TallyPrime's two billing modes:
//   ITEM INVOICE       — one line per stock line per component; HSN and rate off the
//                        stock line; booked tax apportioned across lines by value.
//   ACCOUNTING INVOICE — no stock lines (a service bill): one line per component, with
//                        the assessable value taken as party total minus booked tax and
//                        the SAC off the service ledger.

const { db } = require('../../db/index');

const r2 = (n) => Number((Number(n) || 0).toFixed(2));

// Which GST component a duty ledger represents, from its configured type or its name.
const componentOf = (taxType, name) => {
  const s = `${taxType || ''} ${name || ''}`.toUpperCase();
  if (s.includes('CESS')) return 'CESS';
  if (s.includes('CGST')) return 'CGST';
  if (s.includes('SGST') || s.includes('UTGST')) return 'SGST';
  if (s.includes('IGST')) return 'IGST';
  return null;
};

const SLABS = [0.25, 3, 5, 12, 18, 28];
const snapRate = (pct) => {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  const hit = SLABS.find((s) => Math.abs(pct - s) <= 0.3);
  return hit != null ? hit : Number(pct.toFixed(2));
};

// Split a booked component total across weighted lines so the parts sum EXACTLY back to
// the total — the remainder lands on the last line rather than being lost to rounding.
const apportion = (total, weights) => {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!(sum > 0)) return weights.map(() => 0);
  const out = weights.map((w) => r2((total * w) / sum));
  const drift = r2(total - out.reduce((s, v) => s + v, 0));
  if (out.length) out[out.length - 1] = r2(out[out.length - 1] + drift);
  return out;
};

// Everything one voucher needs, in three queries rather than three per voucher.
async function loadContext(company_id) {
  const gst = await db.execute(
    `SELECT sd.ledger_id, sd.gst_tax_type, l.name
       FROM ledger_statutory_details sd
       JOIN ledgers l ON l.ledger_id = sd.ledger_id
      WHERE l.company_id = ? AND sd.type_of_duty_tax = 'GST'`,
    [company_id],
  );
  const gstLedger = new Map(
    (gst.rows || []).map((r) => [Number(r.ledger_id), componentOf(r.gst_tax_type, r.name)]),
  );
  const sac = await db.execute(
    `SELECT sd.ledger_id, sd.hsn_sac_code
       FROM ledger_statutory_details sd
       JOIN ledgers l ON l.ledger_id = sd.ledger_id
      WHERE l.company_id = ? AND sd.hsn_sac_code IS NOT NULL AND TRIM(sd.hsn_sac_code) != ''`,
    [company_id],
  );
  const ledgerSac = new Map(
    (sac.rows || []).map((r) => [Number(r.ledger_id), String(r.hsn_sac_code).trim()]),
  );
  return { gstLedger, ledgerSac };
}

// Build the tax lines for ONE voucher. Pure — returns rows, writes nothing.
function buildLines(voucher, entries, stockEntries, ctx) {
  const partyId = Number(voucher.party_ledger_id);
  const gstPostings = entries.filter((e) => ctx.gstLedger.has(Number(e.ledger_id)));
  const comp = (e) => ctx.gstLedger.get(Number(e.ledger_id));
  const booked = { IGST: 0, CGST: 0, SGST: 0, CESS: 0 };
  for (const e of gstPostings) {
    const c = comp(e);
    if (c) booked[c] += Math.abs(Number(e.amount) || 0);
  }
  const taxTotal = booked.IGST + booked.CGST + booked.SGST + booked.CESS;
  if (taxTotal < 0.01 && !stockEntries.length) return [];

  // The tax actually charged decides inter vs intra. Place of supply is frequently
  // absent on imported vouchers, and trusting it would contradict the booked tax.
  const isInter = booked.IGST > 0.001 ? 1 : 0;
  const base = {
    voucher_id: voucher.voucher_id,
    is_inter_state: isInter,
    party_gstin: voucher.party_gstin || null,
    party_state: voucher.party_state || null,
  };

  const rows = [];
  const pushComponents = (assessables, hsns, entryIds, descs) => {
    const parts = {};
    for (const c of ['IGST', 'CGST', 'SGST', 'CESS']) parts[c] = apportion(booked[c], assessables);
    assessables.forEach((av, i) => {
      const lineTax = ['IGST', 'CGST', 'SGST'].reduce((s, c) => s + parts[c][i], 0);
      const fullRate = snapRate(av > 0 ? (lineTax / av) * 100 : 0);
      for (const c of ['IGST', 'CGST', 'SGST', 'CESS']) {
        if (parts[c][i] <= 0.001) continue;
        rows.push({
          ...base,
          entry_id: entryIds[i] ?? null,
          hsn_code: hsns[i] ?? null,
          description: descs[i] ?? null,
          assessable_value: r2(av),
          tax_type: c,
          // CGST and SGST each carry half the combined rate, as GSTN expects.
          rate: c === 'CGST' || c === 'SGST' ? r2(fullRate / 2) : c === 'CESS' ? 0 : fullRate,
          amount: parts[c][i],
        });
      }
      // A line that genuinely carried no tax still belongs in the return at its value.
      if (lineTax <= 0.001 && parts.CESS[i] <= 0.001 && av > 0) {
        rows.push({
          ...base,
          entry_id: entryIds[i] ?? null,
          hsn_code: hsns[i] ?? null,
          description: descs[i] ?? null,
          assessable_value: r2(av),
          tax_type: 'TAXABLE',
          rate: 0,
          amount: 0,
        });
      }
    });
  };

  if (stockEntries.length) {
    // ITEM INVOICE — the stock lines are the supply lines.
    pushComponents(
      stockEntries.map((s) => Number(s.amount) || 0),
      stockEntries.map((s) => s.hsn_code || null),
      stockEntries.map(() => null),
      stockEntries.map((s) => s.item_name || null),
    );
  } else {
    // ACCOUNTING INVOICE — the supply lines are the REVENUE (outward) or EXPENSE
    // (inward) ledgers. Group nature is the discriminator Tally itself uses: a service
    // ledger sits under Sales Accounts (Income), while Round Off sits under Indirect
    // Expenses. Treating every non-party, non-tax ledger as a supply line made the
    // round-off its own 0.58 "supply" and produced junk rates like 17.24%.
    const outward = /^(Sales|Credit Note)$/.test(String(voucher.voucher_type || ''));
    const wantNature = outward ? 'Income' : 'Expenses';
    const candidates = entries.filter(
      (e) =>
        Number(e.ledger_id) !== partyId &&
        !ctx.gstLedger.has(Number(e.ledger_id)) &&
        !/round\s*off/i.test(String(e.ledger_name || '')),
    );
    let lines = candidates.filter((e) => e.group_nature === wantNature);
    if (!lines.length) {
      // No group nature recorded (or an unusual chart): fall back to the dominant side.
      const sideTotals = candidates.reduce((m, e) => {
        m[e.type] = (m[e.type] || 0) + Math.abs(Number(e.amount) || 0);
        return m;
      }, {});
      const mainSide = (sideTotals.Cr || 0) >= (sideTotals.Dr || 0) ? 'Cr' : 'Dr';
      lines = candidates.filter((e) => e.type === mainSide);
    }
    if (!lines.length) return [];
    pushComponents(
      lines.map((e) => Math.abs(Number(e.amount) || 0)),
      lines.map((e) => ctx.ledgerSac.get(Number(e.ledger_id)) || null),
      lines.map((e) => e.entry_id ?? null),
      lines.map((e) => e.ledger_name || null),
    );
  }
  return rows;
}

// Backfill one company/FY. Existing lines are left alone — a voucher edited in the app
// has authoritative lines already, and this must never overwrite them.
async function backfillTaxLines(company_id, fy_id, { dryRun = false, voucherTypes = null } = {}) {
  if (!company_id || !fy_id) return { success: false, error: 'company_id and fy_id are required.' };
  try {
    const ctx = await loadContext(company_id);
    const typeFilter = voucherTypes?.length
      ? ` AND v.voucher_type IN (${voucherTypes.map(() => '?').join(',')})`
      : '';
    const vres = await db.execute(
      `SELECT v.voucher_id, v.voucher_type, v.date, v.party_ledger_id, v.place_of_supply,
              l.gstin AS party_gstin, l.state AS party_state
         FROM vouchers v
         LEFT JOIN ledgers l ON l.ledger_id = v.party_ledger_id
        WHERE v.company_id = ? AND v.fy_id = ? AND COALESCE(v.is_cancelled, 0) = 0
          AND NOT EXISTS (SELECT 1 FROM gst_voucher_tax_lines t
                           WHERE t.voucher_id = v.voucher_id)${typeFilter}`,
      voucherTypes?.length ? [company_id, fy_id, ...voucherTypes] : [company_id, fy_id],
    );

    let vouchers = 0;
    let lines = 0;
    let skipped = 0;
    for (const v of vres.rows || []) {
      const [er, sr] = await Promise.all([
        db.execute(
          `SELECT e.entry_id, e.ledger_id, e.type, e.amount, l.name AS ledger_name,
                  g.nature AS group_nature
             FROM voucher_entries e
             JOIN ledgers l ON l.ledger_id = e.ledger_id
             LEFT JOIN groups g ON g.group_id = l.group_id
            WHERE e.voucher_id = ?`,
          [v.voucher_id],
        ),
        db.execute(
          `SELECT stock_entry_id, item_name, amount, hsn_code, gst_rate
             FROM voucher_stock_entries WHERE voucher_id = ?`,
          [v.voucher_id],
        ),
      ]);
      const rows = buildLines(v, er.rows || [], sr.rows || [], ctx);
      if (!rows.length) {
        skipped++;
        continue;
      }
      vouchers++;
      lines += rows.length;
      if (dryRun) continue;
      for (const r of rows) {
        await db.execute(
          `INSERT INTO gst_voucher_tax_lines
             (voucher_id, entry_id, hsn_code, description, assessable_value,
              tax_type, rate, amount, is_inter_state, party_gstin, party_state)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.voucher_id,
            r.entry_id,
            r.hsn_code,
            r.description,
            r.assessable_value,
            r.tax_type,
            r.rate,
            r.amount,
            r.is_inter_state,
            r.party_gstin,
            r.party_state,
          ],
        );
      }
    }
    return { success: true, dryRun, vouchers, lines, skippedNoGst: skipped };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { backfillTaxLines, buildLines, componentOf, snapRate, apportion };
