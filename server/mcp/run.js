#!/usr/bin/env node
// Entry point for the standalone MCP server (stdio).
//   STARTUP_DB_PATH=/path/to/startup.db node server/mcp/run.js
require('./server').start().catch((err) => {
  console.error('MCP server failed:', err);
  process.exit(1);
});
