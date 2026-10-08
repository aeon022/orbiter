import { createServer } from 'node:http';
import { openPod } from '@a83/orbiter-core';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './mcp-server.js';
import { checkApiKey } from './auth.js';

const POD_PATH = process.env.ORBITER_POD;
if (!POD_PATH) {
  console.error('Error: ORBITER_POD environment variable is required.');
  console.error('Example: ORBITER_POD=/path/to/content.pod orbiter-mcp');
  process.exit(1);
}

const HTTP_MODE = process.env.ORBITER_MCP_HTTP === '1';
const PORT = parseInt(process.env.PORT ?? '4500', 10);

if (HTTP_MODE) {
  await startHttp();
} else {
  await startStdio();
}

// ── stdio: local trust, one long-lived db handle, full access ──────────
async function startStdio() {
  const db = openPod(POD_PATH);
  const server = createMcpServer({ db, mode: 'trusted' });
  const transport = new StdioServerTransport();

  const shutdown = () => {
    try { db.close(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  await server.connect(transport);
}

// ── http: remote, per-request auth + fresh stateless server/transport ──
async function startHttp() {
  const httpServer = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (url.pathname !== '/mcp') {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }

    const db = openPod(POD_PATH);
    try {
      // Auth is checked before the request is ever handed to the MCP
      // transport, mirroring the Public Content API's REST routes.
      if (!checkApiKey(db, req.headers['authorization'])) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized — provide a valid API key as Bearer token' }));
        return;
      }

      const body = await readJsonBody(req);
      const server = createMcpServer({ db, mode: 'public' });
      // Stateless: fresh server + transport per request, no session tracking.
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (err) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal error' }));
      }
    } finally {
      db.close();
    }
  });

  httpServer.listen(PORT, () => {
    console.log(`orbiter-mcp HTTP listening on :${PORT} (pod: ${POD_PATH})`);
  });
}

const MAX_BODY_BYTES = 1024 * 1024; // 1 MB — plenty for an MCP JSON-RPC request

function readJsonBody(req) {
  return new Promise((resolveBody, reject) => {
    let data = '';
    let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolveBody(undefined);
      try { resolveBody(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on('error', reject);
  });
}
