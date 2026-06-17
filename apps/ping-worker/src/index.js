export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    // POST /ping  — count active installs
    if (request.method === 'POST' && url.pathname === '/ping') {
      const body = await request.json().catch(() => ({}));
      const day  = new Date().toISOString().slice(0, 10);          // YYYY-MM-DD
      const key  = `ping:${day}`;

      const cur  = parseInt((await env.PINGS.get(key)) ?? '0', 10);
      await env.PINGS.put(key, String(cur + 1), { expirationTtl: 60 * 60 * 24 * 120 }); // keep 120 days

      // Also keep a per-version counter
      const ver = String(body.version ?? 'unknown').replace(/[^0-9.]/g, '').slice(0, 10);
      if (ver) {
        const vkey = `ver:${ver}`;
        const vcur = parseInt((await env.PINGS.get(vkey)) ?? '0', 10);
        await env.PINGS.put(vkey, String(vcur + 1), { expirationTtl: 60 * 60 * 24 * 365 });
      }

      return new Response(null, { status: 204, headers: cors() });
    }

    // GET /stats  — simple JSON view of last 30 days + versions
    if (request.method === 'GET' && url.pathname === '/stats') {
      const secret = env.STATS_SECRET;
      if (secret && request.headers.get('x-stats-key') !== secret) {
        return new Response('Forbidden', { status: 403 });
      }

      const days = [];
      for (let i = 0; i < 30; i++) {
        const d   = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
        const val = await env.PINGS.get(`ping:${d}`);
        if (val !== null) days.push({ date: d, pings: parseInt(val, 10) });
      }

      // Top 10 versions
      const vlist = await env.PINGS.list({ prefix: 'ver:' });
      const versions = await Promise.all(
        vlist.keys.slice(0, 10).map(async k => ({
          version: k.name.replace('ver:', ''),
          total: parseInt((await env.PINGS.get(k.name)) ?? '0', 10),
        }))
      );
      versions.sort((a, b) => b.total - a.total);

      return Response.json({ days, versions }, { headers: cors() });
    }

    return new Response('Not found', { status: 404 });
  },
};

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-stats-key',
  };
}
