#!/usr/bin/env node
// Writes the auto-generated spec to disk so a committed copy always matches the generator.
//   npm run docs:gen   ->  docs/api/openapi.json + docs/api/openapi.yaml
//
// The live /openapi.json endpoint and this static file come from the SAME generator
// (server/docs/openapiGenerator.js), so they can never disagree.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const { generateSpec } = require('./openapiGenerator');

const OUT_DIR = path.resolve(__dirname, '..', '..', 'docs', 'api');

const spec = generateSpec({ force: true });
const g = spec['x-generated'];

fs.writeFileSync(path.join(OUT_DIR, 'openapi.json'), JSON.stringify(spec, null, 2) + '\n');
fs.writeFileSync(path.join(OUT_DIR, 'openapi.yaml'), YAML.stringify(spec));

console.log(`Generated docs/api/openapi.{json,yaml}`);
console.log(`  modules: ${g.modules}  operations: ${g.operations}  channels: ${g.registeredChannels}`);
if (g.undocumentedChannels.length) {
  console.log(`  ⚠ undocumented channels: ${g.undocumentedChannels.length} (run \`npm run docs:check\`)`);
}
if (g.warnings.length) {
  console.log(`  ⚠ warnings: ${g.warnings.length}`);
}
