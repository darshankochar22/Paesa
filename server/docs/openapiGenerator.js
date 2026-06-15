// Auto-generates a single OpenAPI 3.1 spec for the Electron IPC backend at runtime.
//
// Source of truth (no hand-maintained bundle):
//   1. Per-module OpenAPI fragments in  docs/api/modules/*.yaml  (rich request/response schemas).
//   2. The live IPC channel registrations in  server/index.js     (ground-truth channel list).
//
// The fragments are merged (schemas namespaced per-module to avoid `$ref` collisions),
// then cross-checked against the channels actually registered in server/index.js. Any channel
// that exists in code but is missing from the fragments is injected as a minimal stub operation
// and flagged `x-undocumented: true`, so newly added IPC handlers show up in /docs automatically.
//
// Pure docs concern: this file never imports controllers/services and never touches app data.

const fs = require('fs');
const path = require('path');
const YAML = require('yaml');

const ROOT = path.resolve(__dirname, '..', '..');
const FRAGMENTS_DIR = path.join(ROOT, 'docs', 'api', 'modules');
const INDEX_JS = path.join(ROOT, 'server', 'index.js');

let cached = null;

// "company" -> "Company", "gstClassification" -> "GstClassification"
function toPascal(name) {
  return name.replace(/(^|[^a-zA-Z0-9])([a-zA-Z0-9])/g, (_, __, c) => c.toUpperCase());
}

// Recursively rewrite every local schema `$ref` using the provided rename map.
function rewriteRefs(node, renameMap) {
  if (Array.isArray(node)) {
    node.forEach((item) => rewriteRefs(item, renameMap));
    return;
  }
  if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      if (key === '$ref' && typeof node[key] === 'string') {
        const m = node[key].match(/^#\/components\/schemas\/(.+)$/);
        if (m && renameMap[m[1]]) {
          node[key] = `#/components/schemas/${renameMap[m[1]]}`;
        }
      } else {
        rewriteRefs(node[key], renameMap);
      }
    }
  }
}

// Read + merge all per-module fragments into { paths, schemas, tags, modules }.
function loadFragments() {
  const paths = {};
  const schemas = {};
  const tags = [];
  const modules = [];
  const warnings = [];

  if (!fs.existsSync(FRAGMENTS_DIR)) {
    warnings.push(`Fragments dir not found: ${FRAGMENTS_DIR}`);
    return { paths, schemas, tags, modules, warnings };
  }

  const files = fs.readdirSync(FRAGMENTS_DIR).filter((f) => /\.ya?ml$/.test(f)).sort();

  for (const file of files) {
    const moduleName = file.replace(/\.ya?ml$/, '');
    let frag;
    try {
      frag = YAML.parse(fs.readFileSync(path.join(FRAGMENTS_DIR, file), 'utf8'));
    } catch (err) {
      warnings.push(`Failed to parse ${file}: ${err.message}`);
      continue;
    }
    if (!frag) continue;

    const prefix = toPascal(moduleName);
    modules.push(moduleName);

    // Namespace this fragment's component schemas, building a rename map.
    const renameMap = {};
    const fragSchemas = (frag.components && frag.components.schemas) || {};
    for (const schemaName of Object.keys(fragSchemas)) {
      const newName = schemaName.startsWith(prefix) ? schemaName : `${prefix}_${schemaName}`;
      renameMap[schemaName] = newName;
    }

    // Rewrite refs inside both paths and schemas before merging.
    rewriteRefs(frag.paths || {}, renameMap);
    rewriteRefs(fragSchemas, renameMap);

    for (const [name, def] of Object.entries(fragSchemas)) {
      schemas[renameMap[name]] = def;
    }
    for (const [p, def] of Object.entries(frag.paths || {})) {
      if (paths[p]) {
        warnings.push(`Duplicate path "${p}" from module ${moduleName} (kept first)`);
        continue;
      }
      paths[p] = def;
    }

    tags.push({
      name: moduleName,
      description:
        (frag.info && frag.info.title) ? `${frag.info.title}` : `${moduleName} module`,
    });
  }

  return { paths, schemas, tags, modules, warnings };
}

// Parse server/index.js for every `ipcMain.handle('namespace:action', ...)` channel.
function readRegisteredChannels() {
  try {
    const src = fs.readFileSync(INDEX_JS, 'utf8');
    const channels = new Set();
    const re = /ipcMain\.handle\(\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) channels.add(m[1]);
    return channels;
  } catch {
    return new Set();
  }
}

// Collect channels already documented via the `x-ipc-channel` extension.
function documentedChannels(paths) {
  const set = new Set();
  for (const ops of Object.values(paths)) {
    for (const op of Object.values(ops || {})) {
      if (op && op['x-ipc-channel']) set.add(op['x-ipc-channel']);
    }
  }
  return set;
}

function stubOperation(channel) {
  const [ns, action] = channel.split(':');
  return {
    [`/${ns}/${action || 'invoke'}`]: {
      post: {
        operationId: channel.replace(/:/g, '.'),
        tags: [ns],
        summary: `(Undocumented) IPC channel ${channel} — registered in server/index.js but no fragment schema yet.`,
        'x-ipc-channel': channel,
        'x-window-api': `window.api.${ns}.${action || ''}`,
        'x-undocumented': true,
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { type: 'object', additionalProperties: true } } },
        },
        responses: {
          200: { description: 'Channel result (shape not yet documented).' },
        },
      },
    },
  };
}

function generateSpec({ force = false } = {}) {
  if (cached && !force) return cached;

  const { paths, schemas, tags, modules, warnings } = loadFragments();

  // Auto-include any registered-but-undocumented channels.
  const registered = readRegisteredChannels();
  const documented = documentedChannels(paths);
  const missing = [...registered].filter((c) => !documented.has(c));
  const knownTags = new Set(tags.map((t) => t.name));
  for (const channel of missing) {
    const stub = stubOperation(channel);
    for (const [p, def] of Object.entries(stub)) {
      if (!paths[p]) paths[p] = def;
    }
    const ns = channel.split(':')[0];
    if (!knownTags.has(ns)) {
      tags.push({ name: ns, description: `${ns} module (auto-detected)` });
      knownTags.add(ns);
    }
  }

  schemas.Error = {
    type: 'object',
    properties: {
      error: { type: 'string' },
      message: { type: 'string' },
    },
    required: ['message'],
  };

  const operationCount = Object.values(paths).reduce(
    (n, ops) => n + Object.keys(ops || {}).length,
    0,
  );

  cached = {
    openapi: '3.1.0',
    info: {
      title: 'Startup ERP — IPC Backend API',
      version: '1.0.0',
      description:
        'Auto-generated contract for the Electron `ipcMain`/`preload` IPC backend.\n\n' +
        'Transport is Electron IPC, **not** HTTP — paths model `namespace:action` channels so the ' +
        'surface renders in Swagger UI / Scalar and to future-proof a possible Hono REST migration. ' +
        'Each operation carries `x-ipc-channel` (the registered channel), `x-window-api` (the renderer ' +
        'binding) and `x-controller` extensions.\n\n' +
        'The 3-point contract that must stay in sync: `preload.js` → `ipcMain.handle` in `server/index.js` → ' +
        '`window.api.<namespace>.<method>` at the call site.',
    },
    'x-generated': {
      from: ['docs/api/modules/*.yaml', 'server/index.js'],
      modules: modules.length,
      operations: operationCount,
      registeredChannels: registered.size,
      undocumentedChannels: missing,
      warnings,
    },
    tags: tags.sort((a, b) => a.name.localeCompare(b.name)),
    paths,
    components: { schemas },
  };
  return cached;
}

function clearCache() {
  cached = null;
}

module.exports = { generateSpec, clearCache };
