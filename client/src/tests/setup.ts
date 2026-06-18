/**
 * Global test setup for the React frontend.
 *
 * This file runs before every test suite. It:
 *  1. Extends Vitest's `expect` with @testing-library/jest-dom matchers
 *     (toBeInTheDocument, toHaveValue, etc.)
 *  2. Provides a full mock of `window.api` so components that call the
 *     Electron IPC bridge don't throw "window.api is undefined".
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';

// jsdom does not implement scrollIntoView — polyfill it so components that
// call element.scrollIntoView() (e.g. keyboard-navigation lists) don't throw.
Element.prototype.scrollIntoView = vi.fn();

// ─── window.api mock ────────────────────────────────────────────────────────
// Every property is a `vi.fn()` that resolves to a sensible default so
// individual tests only need to override the specific call they care about.

const defaultCompany = {
  company_id: 1,
  name: 'Test Corp',
  mailing_name: 'Test Corp Ltd',
  address1: '123 Main St',
  state: 'Maharashtra',
  country: 'India',
  financial_year_beginning_from: '2026-04-01',
};

const defaultFY = { fy_id: 1, company_id: 1, start_date: '2026-04-01', is_active: 1 };

const defaultGroup = {
  group_id: 1,
  company_id: 1,
  name: 'Capital Account',
  nature: 'Liabilities',
  parent_group_id: null,
};

window.api = {
  // ── App ──────────────────────────────────────────────────────────────────
  app: {
    getDataPath: vi.fn().mockResolvedValue('/Users/test/data'),
  },

  // ── Company ──────────────────────────────────────────────────────────────
  company: {
    getAll:         vi.fn().mockResolvedValue({ success: true, companies: [] }),
    getById:        vi.fn().mockResolvedValue({ success: true, company: defaultCompany }),
    create:         vi.fn().mockResolvedValue({ success: true, company: defaultCompany }),
    update:         vi.fn().mockResolvedValue({ success: true, company: defaultCompany }),
    verifyPassword: vi.fn().mockResolvedValue({ success: true }),
  },

  // ── Financial Year ────────────────────────────────────────────────────────
  fy: {
    getAll:    vi.fn().mockResolvedValue({ success: true, financialYears: [defaultFY] }),
    getById:   vi.fn().mockResolvedValue({ success: true, fy: defaultFY }),
    create:    vi.fn().mockResolvedValue({ success: true, fy: defaultFY }),
    setActive: vi.fn().mockResolvedValue({ success: true }),
    delete:    vi.fn().mockResolvedValue({ success: true }),
  },

  // ── Groups ────────────────────────────────────────────────────────────────
  group: {
    getAll:  vi.fn().mockResolvedValue({ success: true, groups: [defaultGroup] }),
    getById: vi.fn().mockResolvedValue({ success: true, group: defaultGroup }),
    create:  vi.fn().mockResolvedValue({ success: true, group: defaultGroup }),
    update:  vi.fn().mockResolvedValue({ success: true, group: defaultGroup }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
    getTree: vi.fn().mockResolvedValue({ success: true, tree: [] }),
  },

  // ── Ledgers ───────────────────────────────────────────────────────────────
  ledger: {
    getAll:  vi.fn().mockResolvedValue({ success: true, ledgers: [] }),
    getById: vi.fn().mockResolvedValue({ success: true, ledger: {} }),
    create:  vi.fn().mockResolvedValue({ success: true, ledger: {} }),
    update:  vi.fn().mockResolvedValue({ success: true, ledger: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },

  // ── Vouchers ──────────────────────────────────────────────────────────────
  voucher: {
    getAll:         vi.fn().mockResolvedValue({ success: true, vouchers: [] }),
    getById:        vi.fn().mockResolvedValue({ success: true, voucher: {} }),
    create:         vi.fn().mockResolvedValue({ success: true, voucher: {} }),
    update:         vi.fn().mockResolvedValue({ success: true }),
    delete:         vi.fn().mockResolvedValue({ success: true }),
    cancel:         vi.fn().mockResolvedValue({ success: true }),
    getNextNumber:  vi.fn().mockResolvedValue({ success: true, nextNumber: 'JNL-00001' }),
  },

  // ── Inventory ─────────────────────────────────────────────────────────────
  unit: {
    getAll:  vi.fn().mockResolvedValue({ success: true, units: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, unit: {} }),
    update:  vi.fn().mockResolvedValue({ success: true, unit: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },
  stockGroup: {
    getAll:  vi.fn().mockResolvedValue({ success: true, stockGroups: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, stockGroup: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },
  stockItem: {
    getAll:  vi.fn().mockResolvedValue({ success: true, stockItems: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, stockItem: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },

  // ── GST ───────────────────────────────────────────────────────────────────
  gstClassification: {
    getAll:  vi.fn().mockResolvedValue({ success: true, classifications: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, classification: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },
  gst: {
    computeTax:    vi.fn().mockResolvedValue({ success: true }),
    generateGSTR1: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    getGSTR1:      vi.fn().mockResolvedValue({ success: true, payload: {} }),
    generateGSTR3B: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    getGSTR3B:      vi.fn().mockResolvedValue({ success: true, payload: {} }),
    getAnnualComputation: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    getHSNRates:   vi.fn().mockResolvedValue({ success: true, hsnRates: [] }),
    upsertHSNRate: vi.fn().mockResolvedValue({ success: true }),
    deleteHSNRate: vi.fn().mockResolvedValue({ success: true }),
    getGSTR1Reconciliation: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    getGSTR2BReconciliation: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    getIMSInwardSupplies: vi.fn().mockResolvedValue({ success: true, payload: {} }),
    getChallanReconciliation: vi.fn().mockResolvedValue({ success: true, payload: {} }),
  },
  gstRegistration: {
    getAll:  vi.fn().mockResolvedValue({ success: true, gstRegistrations: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, gstRegistration: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },

  // ── Payroll ───────────────────────────────────────────────────────────────
  employee: {
    getAll:    vi.fn().mockResolvedValue({ success: true, employees: [] }),
    getById:   vi.fn().mockResolvedValue({ success: true, employee: {} }),
    create:    vi.fn().mockResolvedValue({ success: true, employee: {} }),
    update:    vi.fn().mockResolvedValue({ success: true, employee: {} }),
    delete:    vi.fn().mockResolvedValue({ success: true }),
    getByGroup: vi.fn().mockResolvedValue({ success: true, employees: [] }),
  },
  payHead: {
    getAll:  vi.fn().mockResolvedValue({ success: true, payHeads: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, payHead: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },

  // ── Tax Units / TDS / TCS ─────────────────────────────────────────────────
  taxUnit: {
    getAll:  vi.fn().mockResolvedValue({ success: true, taxUnits: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, taxUnit: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },
  tdsNatureOfPayment: {
    getAll:  vi.fn().mockResolvedValue({ success: true, items: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, item: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },
  tcsNatureOfGoods: {
    getAll:  vi.fn().mockResolvedValue({ success: true, items: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, item: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },

  // ── Currency ─────────────────────────────────────────────────────────────
  currency: {
    getAll:  vi.fn().mockResolvedValue({ success: true, currencies: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, currency: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },

  // ── Cost Centre ───────────────────────────────────────────────────────────
  costCentre: {
    getAll:  vi.fn().mockResolvedValue({ success: true, costCentres: [] }),
    create:  vi.fn().mockResolvedValue({ success: true, costCentre: {} }),
    delete:  vi.fn().mockResolvedValue({ success: true }),
  },
} as unknown as typeof window.api;
