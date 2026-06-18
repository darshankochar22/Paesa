import { defineConfig } from '@playwright/test';

// Electron E2E — launches the real app (built renderer + main process + SQLite) and drives it.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
});
