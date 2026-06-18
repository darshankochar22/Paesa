import { test, expect, _electron, type ElectronApplication, type Page } from '@playwright/test';
import os from 'os';
import path from 'path';

// E2E: launch the packaged-style app (E2E_PROD loads client/dist; fresh temp DB) and drive
// the REAL renderer → preload → ipcMain → service → SQLite chain. Catches the things backend
// unit tests can't: window.api wiring, boot/renderer crashes, and integration against a real DB.

let app: ElectronApplication;
let page: Page;
const consoleErrors: string[] = [];

// Noise that isn't an app bug.
const IGNORE = [
  'Electron Security Warning', 'Content-Security-Policy', 'Insecure Content',
  'DevTools', 'react-devtools', 'Download the React', 'DEP0205', 'DeprecationWarning',
  'Autofill.enable', 'Autofill.setAddresses',
];
const isRealError = (t: string) => !IGNORE.some((n) => t.includes(n));

test.beforeAll(async () => {
  app = await _electron.launch({
    args: ['.'],
    cwd: path.resolve(__dirname, '..'),
    env: {
      ...process.env,
      E2E_PROD: '1',
      STARTUP_DB_PATH: path.join(os.tmpdir(), `mvp_e2e_${Date.now()}.db`),
    },
  });
  page = await app.firstWindow();
  page.on('console', (m) => { if (m.type() === 'error' && isRealError(m.text())) consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1500); // let CompanyContext + first effects settle
});

test.afterAll(async () => { await app?.close(); });

test('app boots and renders the shell without console errors', async () => {
  // The Tally-style top menu is always present.
  await expect(page.getByText('Company', { exact: false }).first()).toBeVisible();
  expect(consoleErrors, `console errors on boot:\n${consoleErrors.join('\n')}`).toEqual([]);
});

test('full master + voucher chain works through window.api (real IPC + DB)', async () => {
  const result = await page.evaluate(async () => {
    const api = (window as any).api;
    if (!api) return { step: 'window.api', error: 'window.api is undefined' };

    const c = await api.company.create({
      name: 'E2E Co', mailing_name: 'E2E', address1: 'a', state: 'Maharashtra', country: 'India',
      pincode: '400001', email: 'e@e.com', base_currency_symbol: '₹', formal_name: 'INR',
      financial_year_beginning_from: '2026-04-01', books_beginning_from: '2026-04-01', password: 'secret123',
    });
    if (!c.success) return { step: 'company.create', error: c.error };
    const cid = c.company.company_id;

    const fyRes = await api.fy.getAll(cid);
    const fy = (fyRes.financialYears || [])[0]?.fy_id;

    const groups = (await api.group.getAll(cid)).groups || [];
    const capital = groups.find((g: any) => g.name === 'Capital Account');
    const bank = groups.find((g: any) => g.name === 'Bank Accounts');

    const g = await api.group.create({
      company_id: cid, name: 'E2E Group', parent_group_id: capital?.group_id, nature: 'Liabilities',
      slab_based_rates: '[]', allocation_method: 'Not Applicable',
    });
    if (!g.success) return { step: 'group.create', error: g.error };

    const l = await api.ledger.create({ company_id: cid, name: 'E2E Bank', group_id: bank?.group_id, opening_balance: 0 });
    if (!l.success) return { step: 'ledger.create', error: l.error };

    const si = await api.stockItem.create({ company_id: cid, name: 'E2E Item', gst_applicable: 'Not Applicable' });
    if (!si.success) return { step: 'stockItem.create', error: si.error };

    const ledgers = (await api.ledger.getAll(cid)).ledgers || [];
    const cash = ledgers.find((x: any) => x.name === 'Cash');
    const pl = ledgers.find((x: any) => x.name === 'Profit & Loss A/c');
    const v = await api.voucher.create({
      company_id: cid, fy_id: fy, voucher_type: 'Receipt', date: '2026-04-15', is_accounting_voucher: 1,
      entries: [{ ledger_id: cash.ledger_id, type: 'Dr', amount: 1000 }, { ledger_id: pl.ledger_id, type: 'Cr', amount: 1000 }],
    });
    if (!v.success) return { step: 'voucher.create', error: v.error };

    return { ok: true };
  });
  expect(result).toEqual({ ok: true });
});

test('key create screens render without crashing or "Failed query"', async () => {
  const before = consoleErrors.length;
  for (const route of ['/company/create', '/master/create/group', '/master/create/stock-item', '/transactions/vouchers']) {
    await page.evaluate((r) => { window.location.hash = r; }, route);
    await page.waitForTimeout(700);
    await expect(page.locator('text=Failed query')).toHaveCount(0);
    await expect(page.locator('body')).toBeVisible();
  }
  expect(consoleErrors.slice(before), `console errors while navigating:\n${consoleErrors.slice(before).join('\n')}`).toEqual([]);
});
