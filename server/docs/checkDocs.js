#!/usr/bin/env node
// CI guard: enforces the "openhono format only" rule.
// Fails (exit 1) if any registered IPC channel is missing its OpenAPI fragment operation,
// or if any fragment fails to parse. Keeps server/index.js and docs/api/modules/*.yaml in sync.
//
//   npm run docs:check
//
// Wire into CI before build (.github/workflows/build-win.yml) to block undocumented channels.

const { generateSpec } = require('./openapiGenerator');

const g = generateSpec({ force: true })['x-generated'];
let failed = false;

if (g.undocumentedChannels.length) {
  failed = true;
  console.error(`✖ ${g.undocumentedChannels.length} IPC channel(s) registered in server/index.js have NO OpenAPI fragment:`);
  for (const c of g.undocumentedChannels) console.error(`    - ${c}`);
  console.error(`  Add an operation for each in docs/api/modules/<module>.yaml (see docs/CONTRIBUTING.md).`);
}

if (g.warnings.length) {
  failed = true;
  console.error(`✖ ${g.warnings.length} fragment warning(s):`);
  for (const w of g.warnings) console.error(`    - ${String(w).split('\n')[0]}`);
}

if (failed) {
  process.exit(1);
}

console.log(`✓ openhono docs in sync — ${g.operations} operations cover all ${g.registeredChannels} channels, 0 warnings.`);
