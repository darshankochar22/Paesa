// ---------------------------------------------------------------------------
// Tally importer (orchestrator).
//
// Maps the parser's ParsedTally objects (see xmlParser.js / the design contract)
// onto the app's existing services and imports them, in dependency order, for a
// given { company_id, fy_id } context:
//
//     groups -> units -> ledgers -> stock items -> vouchers
//
// HARD RULES honoured here:
//   * NO direct DB access. Every write goes through the existing services
//     (groupService / unitService / ledgerService / stockItemService /
//     voucherService). This module owns ordering, name->id resolution, the
//     company_id/fy_id stamping, and the per-voucher balance check ONLY.
//   * Duplicates are resolved by name (case-insensitive, scoped to company_id):
//     existing rows are pre-loaded; the services also self-guard with an
//     "... already exists" error which we treat as `skipped`, never `failed`.
//   * Vouchers are double-entry checked (sum(Dr) === sum(Cr)) BEFORE create;
//     unbalanced or unresolved-ledger vouchers are recorded as failed.
//
// Pure-parser dependency: this file consumes the parser output shape only; it
// never re-parses XML.
// ---------------------------------------------------------------------------
const groupService = require("../../group/groupService");
const ledgerService = require("../../ledger/ledgerService");
const stockItemService = require("../../stockItem/stockItemService");
const unitService = require("../../unit/unitService");
const voucherService = require("../../voucher/voucherService");

// ----- small helpers --------------------------------------------------------

const norm = (s) => (s == null ? "" : String(s).trim().toLowerCase());

// Nature map for Tally's reserved primary groups, used as a fallback when a
// group's parent cannot be resolved to an already-seeded/created row (so we can
// still satisfy groupService.create, which has no `nature` default). Mirrors
// groupService.PRIMARY_GROUPS (not exported there) + a few common Tally roots.
const TALLY_PRIMARY_NATURE = {
  "branch/divisions": "Assets",
  "capital account": "Liabilities",
  "current assets": "Assets",
  "current liabilities": "Liabilities",
  "direct expenses": "Expenses",
  "direct incomes": "Income",
  "fixed assets": "Assets",
  "indirect expenses": "Expenses",
  "indirect incomes": "Income",
  investments: "Assets",
  "loans (liability)": "Liabilities",
  "loans(liability)": "Liabilities",
  "misc. expenses (asset)": "Assets",
  "misc.expenses(asset)": "Assets",
  "purchase accounts": "Expenses",
  "sales accounts": "Income",
  "suspense a/c": "Liabilities",
};

// Map a Tally GST registration type to the app's enum.
const mapRegistrationType = (rt) => {
  const t = norm(rt);
  if (t === "regular") return "Regular";
  if (t === "composition") return "Composition";
  if (t === "consumer") return "Consumer";
  // Unknown / Unregistered / empty -> Unregistered
  return "Unregistered";
};

// Known app voucher types (voucherService.prefixMap). Unknown -> Journal.
const KNOWN_VOUCHER_TYPES = new Set([
  "Payment", "Receipt", "Journal", "Contra", "Sales", "Purchase",
  "Debit Note", "Credit Note", "Stock Journal", "Delivery Note",
  "Receipt Note", "Rejection In", "Rejection Out", "Material In",
  "Material Out", "Manufacturing Journal", "Payroll",
]);

const mapVoucherType = (vt) => {
  if (vt == null) return "Journal";
  const exact = String(vt).trim();
  if (KNOWN_VOUCHER_TYPES.has(exact)) return exact;
  // Case-insensitive match against known types.
  const lower = norm(exact);
  for (const k of KNOWN_VOUCHER_TYPES) {
    if (norm(k) === lower) return k;
  }
  return "Journal";
};

const isDuplicateError = (err) =>
  typeof err === "string" && /already exists/i.test(err);

// ----- resolution context ---------------------------------------------------

// Build the in-memory case-insensitive resolution maps and pre-load every
// existing row for this company so later phases (and re-runs) resolve names to
// the rows that are already there. Returns a `ctx`-like resolver object.
const buildResolver = async (company_id) => {
  const groupNameToId = new Map(); // name -> group_id
  const groupNatureById = new Map(); // group_id -> nature
  const ledgerNameToId = new Map(); // name -> ledger_id
  const stockNameToId = new Map(); // name -> item_id
  const unitSymbolToId = new Map(); // symbol AND name -> unit_id

  const [g, l, s, u] = await Promise.all([
    groupService.getAll(company_id),
    ledgerService.getAll(company_id),
    stockItemService.getAll(company_id),
    unitService.getAll(company_id),
  ]);

  if (g.success) {
    for (const row of g.groups) {
      groupNameToId.set(norm(row.name), row.group_id);
      groupNatureById.set(row.group_id, row.nature);
    }
  }
  if (l.success) {
    for (const row of l.ledgers) ledgerNameToId.set(norm(row.name), row.ledger_id);
  }
  if (s.success) {
    for (const row of s.stockItems) stockNameToId.set(norm(row.name), row.item_id);
  }
  if (u.success) {
    for (const row of u.units) {
      if (row.symbol != null) unitSymbolToId.set(norm(row.symbol), row.unit_id);
      if (row.name != null) unitSymbolToId.set(norm(row.name), row.unit_id);
    }
  }

  return {
    groupNameToId,
    groupNatureById,
    ledgerNameToId,
    stockNameToId,
    unitSymbolToId,
    resolveGroup: (name) => groupNameToId.get(norm(name)),
    resolveLedger: (name) => ledgerNameToId.get(norm(name)),
    resolveStock: (name) => stockNameToId.get(norm(name)),
    resolveUnit: (sym) => unitSymbolToId.get(norm(sym)),
    natureOfGroup: (group_id) =>
      group_id != null ? groupNatureById.get(group_id) : undefined,
  };
};

// Topologically order parsed groups so a group is created after its parent.
// Roots (no parent, or a parent that is not itself an imported group) come
// first. Stable within a depth level (preserves XML order).
const orderGroupsByDepth = (groups) => {
  const byName = new Map();
  for (const grp of groups) byName.set(norm(grp.name), grp);

  const depthCache = new Map();
  const depthOf = (grp, seen = new Set()) => {
    const key = norm(grp.name);
    if (depthCache.has(key)) return depthCache.get(key);
    if (seen.has(key)) return 0; // cycle guard
    seen.add(key);
    let depth = 0;
    if (grp.parent) {
      const parent = byName.get(norm(grp.parent));
      // Only count depth against parents that are themselves in this import
      // batch; parents that resolve to pre-seeded rows act as roots (depth 0).
      if (parent) depth = depthOf(parent, seen) + 1;
    }
    depthCache.set(key, depth);
    return depth;
  };

  return groups
    .map((grp, idx) => ({ grp, idx, depth: depthOf(grp) }))
    .sort((a, b) => (a.depth - b.depth) || (a.idx - b.idx))
    .map((x) => x.grp);
};

// ----- per-phase importers --------------------------------------------------

const importGroups = async (parsedGroups, ctx, resolver) => {
  const summary = { created: 0, skipped: 0, failed: 0, errors: [] };
  const ordered = orderGroupsByDepth(parsedGroups || []);

  for (const grp of ordered) {
    if (!grp.name) continue;

    // Already present (pre-seeded reserved/primary group or earlier create).
    if (resolver.resolveGroup(grp.name) != null) {
      summary.skipped++;
      continue;
    }

    const parentId =
      grp.parent != null ? resolver.resolveGroup(grp.parent) : null;
    if (grp.parent != null && parentId == null) {
      summary.errors.push(
        `Group "${grp.name}": parent "${grp.parent}" not found; created unparented`
      );
    }

    // Resolve nature: explicit -> inherit from resolved parent -> Tally primary
    // map -> 'Assets' fallback (service requires a nature).
    let nature = grp.nature || null;
    if (!nature && parentId != null) nature = resolver.natureOfGroup(parentId);
    if (!nature) nature = TALLY_PRIMARY_NATURE[norm(grp.name)] || null;
    if (!nature && grp.parent) nature = TALLY_PRIMARY_NATURE[norm(grp.parent)] || null;
    if (!nature) nature = "Assets";

    const res = await groupService.create({
      company_id: ctx.company_id,
      name: grp.name,
      parent_group_id: parentId || null,
      nature,
      is_primary: false,
    });

    if (res.success) {
      summary.created++;
      resolver.groupNameToId.set(norm(grp.name), res.group.group_id);
      resolver.groupNatureById.set(res.group.group_id, res.group.nature);
    } else if (isDuplicateError(res.error)) {
      summary.skipped++;
      // Make sure it is resolvable for later phases.
      if (resolver.resolveGroup(grp.name) == null) {
        const all = await groupService.getAll(ctx.company_id);
        if (all.success) {
          const row = all.groups.find((r) => norm(r.name) === norm(grp.name));
          if (row) {
            resolver.groupNameToId.set(norm(grp.name), row.group_id);
            resolver.groupNatureById.set(row.group_id, row.nature);
          }
        }
      }
    } else {
      summary.failed++;
      summary.errors.push(`Group "${grp.name}": ${res.error}`);
    }
  }

  return summary;
};

// Ensure a base unit referenced by a stock item exists; create it if missing.
// Returns the resolved unit_id (or null on failure).
const ensureUnit = async (unitNameOrSymbol, ctx, resolver, summary) => {
  if (!unitNameOrSymbol) return null;
  const existing = resolver.resolveUnit(unitNameOrSymbol);
  if (existing != null) return existing;

  const res = await unitService.create({
    company_id: ctx.company_id,
    name: unitNameOrSymbol,
    symbol: unitNameOrSymbol,
  });

  if (res.success) {
    summary.created++;
    resolver.unitSymbolToId.set(norm(res.unit.symbol), res.unit.unit_id);
    resolver.unitSymbolToId.set(norm(res.unit.name), res.unit.unit_id);
    return res.unit.unit_id;
  }
  if (isDuplicateError(res.error)) {
    summary.skipped++;
    const all = await unitService.getAll(ctx.company_id);
    if (all.success) {
      const row = all.units.find(
        (r) => norm(r.symbol) === norm(unitNameOrSymbol) || norm(r.name) === norm(unitNameOrSymbol)
      );
      if (row) {
        resolver.unitSymbolToId.set(norm(row.symbol), row.unit_id);
        resolver.unitSymbolToId.set(norm(row.name), row.unit_id);
        return row.unit_id;
      }
    }
    return null;
  }
  summary.failed++;
  summary.errors.push(`Unit "${unitNameOrSymbol}": ${res.error}`);
  return null;
};

const importUnits = async (parsedStockItems, ctx, resolver) => {
  const summary = { created: 0, skipped: 0, failed: 0, errors: [] };
  const seen = new Set();
  for (const s of parsedStockItems || []) {
    if (!s.baseUnit) continue;
    const key = norm(s.baseUnit);
    if (seen.has(key)) continue;
    seen.add(key);
    if (resolver.resolveUnit(s.baseUnit) != null) continue; // already present
    await ensureUnit(s.baseUnit, ctx, resolver, summary);
  }
  return summary;
};

const importLedgers = async (parsedLedgers, ctx, resolver) => {
  const summary = { created: 0, skipped: 0, failed: 0, errors: [] };

  for (const led of parsedLedgers || []) {
    if (!led.name) continue;

    if (resolver.resolveLedger(led.name) != null) {
      summary.skipped++;
      continue;
    }

    const groupId =
      led.parent != null ? resolver.resolveGroup(led.parent) : null;
    if (led.parent != null && groupId == null) {
      summary.errors.push(
        `Ledger "${led.name}": group "${led.parent}" not found; created ungrouped`
      );
    }
    const nature =
      groupId != null ? resolver.natureOfGroup(groupId) || null : null;

    const payload = {
      company_id: ctx.company_id,
      name: led.name,
      group_id: groupId || null,
      nature,
      opening_balance: led.openingBalance || 0,
      gstin: led.gstin || null,
      registration_type: mapRegistrationType(led.registrationType),
      mailing_name: led.mailingName || null,
      address1: led.address || null,
      state: led.state || null,
      country: led.country || null,
      pincode: led.pincode || null,
      email: led.email || null,
      phone: led.phone || null,
      pan: led.pan || null,
    };

    if (led.bank) {
      payload.bank_details = {
        account_holder_name: led.bank.accountHolderName || null,
        account_number: led.bank.accountNumber || null,
        ifsc_code: led.bank.ifscCode || null,
        swift_code: led.bank.swiftCode || null,
        bank_name: led.bank.bankName || null,
        branch_name: led.bank.branchName || null,
      };
    }

    const res = await ledgerService.create(payload);

    if (res.success) {
      summary.created++;
      resolver.ledgerNameToId.set(norm(led.name), res.ledger.ledger_id);
    } else if (isDuplicateError(res.error)) {
      summary.skipped++;
      if (resolver.resolveLedger(led.name) == null) {
        const all = await ledgerService.getAll(ctx.company_id);
        if (all.success) {
          const row = all.ledgers.find((r) => norm(r.name) === norm(led.name));
          if (row) resolver.ledgerNameToId.set(norm(led.name), row.ledger_id);
        }
      }
    } else {
      summary.failed++;
      summary.errors.push(`Ledger "${led.name}": ${res.error}`);
    }
  }

  return summary;
};

const importStockItems = async (parsedStockItems, ctx, resolver, unitSummary) => {
  const summary = { created: 0, skipped: 0, failed: 0, errors: [] };

  for (const s of parsedStockItems || []) {
    if (!s.name) continue;

    if (resolver.resolveStock(s.name) != null) {
      summary.skipped++;
      continue;
    }

    let unitId = s.baseUnit != null ? resolver.resolveUnit(s.baseUnit) : null;
    if (unitId == null && s.baseUnit) {
      // Late-create a unit not produced in the units phase (defensive).
      unitId = await ensureUnit(s.baseUnit, ctx, resolver, unitSummary || summary);
    }

    const groupId = s.parent != null ? resolver.resolveGroup(s.parent) : null;
    const gstRate = Number(s.gstRate) || 0;
    const gstApplicable =
      gstRate > 0 || norm(s.taxability) === "taxable"
        ? "Applicable"
        : "Not Applicable";

    const res = await stockItemService.create({
      company_id: ctx.company_id,
      name: s.name,
      group_id: groupId || null,
      unit_id: unitId || null,
      opening_quantity: s.openingQuantity || 0,
      opening_rate: s.openingRate || 0,
      hsn_sac: s.hsnSac || null,
      hsn_sac_description: s.hsnSacDescription || null,
      gst_rate: gstRate,
      cgst_rate: gstRate ? gstRate / 2 : 0,
      sgst_rate: gstRate ? gstRate / 2 : 0,
      igst_rate: gstRate,
      gst_applicable: gstApplicable,
      type_of_supply: s.typeOfSupply || "Goods",
      taxability_type: s.taxability || null,
    });

    if (res.success) {
      summary.created++;
      resolver.stockNameToId.set(norm(s.name), res.item.item_id);
    } else if (isDuplicateError(res.error)) {
      summary.skipped++;
      if (resolver.resolveStock(s.name) == null) {
        const all = await stockItemService.getAll(ctx.company_id);
        if (all.success) {
          const row = all.stockItems.find((r) => norm(r.name) === norm(s.name));
          if (row) resolver.stockNameToId.set(norm(s.name), row.item_id);
        }
      }
    } else {
      summary.failed++;
      summary.errors.push(`Stock item "${s.name}": ${res.error}`);
    }
  }

  return summary;
};

// Verify the parsed entries balance (sum Dr === sum Cr) before hitting the DB.
const entriesBalanced = (entries) => {
  let total = 0;
  for (const e of entries) {
    if (!(Number(e.amount) > 0)) return false;
    total += e.type === "Dr" ? Number(e.amount) : -Number(e.amount);
  }
  return Math.abs(total) < 0.01;
};

const importVouchersPhase = async (parsedVouchers, ctx, resolver) => {
  const summary = { created: 0, skipped: 0, failed: 0, errors: [] };

  for (let i = 0; i < (parsedVouchers || []).length; i++) {
    const v = parsedVouchers[i];
    const label = v.number || `#${i + 1}`;

    if (!Array.isArray(v.entries) || v.entries.length === 0) {
      summary.failed++;
      summary.errors.push(`Voucher ${label}: no ledger entries`);
      continue;
    }

    // Resolve every entry ledger by name. An unresolved entry is a hard error
    // for the voucher (cannot create an accounting side without a ledger).
    const resolvedEntries = [];
    let unresolved = null;
    for (const e of v.entries) {
      const ledgerId = resolver.resolveLedger(e.ledgerName);
      if (ledgerId == null) {
        unresolved = e.ledgerName;
        break;
      }
      resolvedEntries.push({
        ledger_id: ledgerId,
        ledger_name: e.ledgerName,
        type: e.type,
        amount: Number(e.amount),
      });
    }

    if (unresolved != null) {
      summary.failed++;
      summary.errors.push(
        `Voucher ${label}: ledger "${unresolved}" not found`
      );
      continue;
    }

    // Balance check BEFORE create (the service would reject anyway).
    if (!entriesBalanced(resolvedEntries)) {
      summary.failed++;
      summary.errors.push(`Voucher ${label}: Debit and Credit amounts must be equal`);
      continue;
    }

    const partyLedgerId =
      v.party != null ? resolver.resolveLedger(v.party) || null : null;

    const stockEntries = [];
    for (const inv of v.inventoryEntries || []) {
      stockEntries.push({
        stock_item_id: resolver.resolveStock(inv.stockItemName) || null,
        item_name: inv.stockItemName,
        quantity: Number(inv.quantity) || 0,
        rate: Number(inv.rate) || 0,
      });
    }

    const voucherType = mapVoucherType(v.voucherType);

    const payload = {
      company_id: ctx.company_id,
      fy_id: ctx.fy_id,
      voucher_type: voucherType,
      date: v.date,
      narration: v.narration || null,
      party_name: v.party || null,
      party_ledger_id: partyLedgerId,
      is_accounting_voucher: v.isAccounting ? 1 : 1, // accounting entries exist
      is_inventory_voucher: stockEntries.length > 0 ? 1 : 0,
      entries: resolvedEntries,
    };
    // Preserve original Tally number only when explicitly requested.
    if (ctx.preserveVoucherNumbers && v.number) {
      payload.voucher_number = v.number;
    }
    if (stockEntries.length > 0) payload.stock_entries = stockEntries;

    const res = await voucherService.create(payload);
    if (res.success) {
      summary.created++;
    } else {
      summary.failed++;
      summary.errors.push(`Voucher ${label}: ${res.error}`);
    }
  }

  return summary;
};

// ----- public API -----------------------------------------------------------

const assertCtx = (ctx, needFy) => {
  if (!ctx || ctx.company_id == null) {
    throw new Error("importer: ctx.company_id is required");
  }
  if (needFy && ctx.fy_id == null) {
    throw new Error("importer: ctx.fy_id is required for voucher import");
  }
};

// Import masters only (groups -> units -> ledgers -> stock items). Returns a
// resolver so callers can chain importVouchers against the same maps.
const importMasters = async (parsed, ctx) => {
  assertCtx(ctx, false);
  const resolver = await buildResolver(ctx.company_id);

  const groups = await importGroups(parsed.groups, ctx, resolver);
  const units = await importUnits(parsed.stockItems, ctx, resolver);
  const ledgers = await importLedgers(parsed.ledgers, ctx, resolver);
  const stockItems = await importStockItems(parsed.stockItems, ctx, resolver, units);

  return { resolver, groups, units, ledgers, stockItems };
};

// Import vouchers only. Builds (or reuses) a resolver; resolves ledger names
// against existing + just-imported masters.
const importVouchers = async (parsed, ctx, resolver) => {
  assertCtx(ctx, true);
  const r = resolver || (await buildResolver(ctx.company_id));
  const vouchers = await importVouchersPhase(parsed.vouchers, ctx, r);
  return { resolver: r, vouchers };
};

// Full import: masters then vouchers, in strict dependency order. Returns the
// summary contract:
//   { groups, ledgers, stockItems:{created,skipped,failed,errors},
//     units, vouchers:{created,skipped,failed,errors} }
const importAll = async (parsed, ctx) => {
  assertCtx(ctx, true);
  const masters = await importMasters(parsed, ctx);
  const { vouchers } = await importVouchers(parsed, ctx, masters.resolver);

  return {
    groups: masters.groups,
    units: masters.units,
    ledgers: masters.ledgers,
    stockItems: masters.stockItems,
    vouchers,
  };
};

// Dry-run: counts only, no DB writes. Reports what would be imported.
const preview = (parsed) => {
  const p = parsed || {};
  const balanced = (v) =>
    Array.isArray(v.entries) && v.entries.length > 0 && entriesBalanced(
      v.entries.map((e) => ({ type: e.type, amount: Number(e.amount) }))
    );
  const vouchers = p.vouchers || [];
  const balancedCount = vouchers.filter(balanced).length;
  const baseUnits = new Set();
  for (const s of p.stockItems || []) if (s.baseUnit) baseUnits.add(norm(s.baseUnit));

  return {
    meta: p.meta || null,
    groups: (p.groups || []).length,
    units: baseUnits.size,
    ledgers: (p.ledgers || []).length,
    stockItems: (p.stockItems || []).length,
    vouchers: vouchers.length,
    balancedVouchers: balancedCount,
    unbalancedVouchers: vouchers.length - balancedCount,
  };
};

module.exports = {
  importMasters,
  importVouchers,
  importAll,
  preview,
  // exported for tests / reuse
  buildResolver,
  mapRegistrationType,
  mapVoucherType,
  orderGroupsByDepth,
  entriesBalanced,
};
