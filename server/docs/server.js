// Dev-only HTTP server that exposes the auto-generated OpenAPI spec and a Scalar UI.
//
//   GET /            -> redirects to /docs
//   GET /docs        -> Scalar API reference (renders the spec; "rival swagger")
//   GET /openapi.json-> the generated spec (JSON)
//   GET /openapi.yaml-> the generated spec (YAML)
//   GET /health      -> liveness + spec stats
//
// Bound to 127.0.0.1 only. Started from main.js exclusively when !app.isPackaged.
// Hono is ESM-only, so it is loaded via dynamic import from this CommonJS module.

const YAML = require('yaml');
const { generateSpec, clearCache } = require('./openapiGenerator');

const SCALAR_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Startup ERP — IPC Backend API</title>
  </head>
  <body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  </body>
</html>`;

let runningServer = null;

async function startDocsServer({ port = 5180, hostname = '127.0.0.1' } = {}) {
  if (runningServer) return runningServer;

  const { Hono } = await import('hono');
  const { serve } = await import('@hono/node-server');

  const app = new Hono();

  app.get('/', (c) => c.redirect('/docs'));
  app.get('/docs', (c) => c.html(SCALAR_HTML));

  // `?force=1` rebuilds the spec from disk (useful after editing fragments while running).
  app.get('/openapi.json', (c) => c.json(generateSpec({ force: c.req.query('force') != null })));
  app.get('/openapi.yaml', (c) => {
    const spec = generateSpec({ force: c.req.query('force') != null });
    return c.body(YAML.stringify(spec), 200, { 'content-type': 'application/yaml; charset=utf-8' });
  });

  app.get('/health', (c) => {
    const spec = generateSpec();
    return c.json({ ok: true, ...spec['x-generated'] });
  });

  runningServer = serve({ fetch: app.fetch, port, hostname });
  return runningServer;
}

function stopDocsServer() {
  if (runningServer && typeof runningServer.close === 'function') runningServer.close();
  runningServer = null;
  clearCache();
}

module.exports = { startDocsServer, stopDocsServer };
