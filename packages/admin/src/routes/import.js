import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { randomUUID } from 'node:crypto';
import { parseWXR, buildImportPlan, executeImport } from '../../../integration/src/wp-importer.js';

export const importRoutes = new Hono();

// In-memory token store — holds parsed WXR between analyze and execute (30 min TTL)
const pendingImports = new Map();
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of pendingImports) {
    if (v.ts < cutoff) pendingImports.delete(k);
  }
}, 5 * 60 * 1000);

// POST /api/import/analyze — upload WXR XML, return plan + token
importRoutes.post('/analyze', async (c) => {
  const form = await c.req.formData();
  const file = form.get('wxr_file');
  if (!file || typeof file === 'string' || file.size === 0)
    return c.json({ error: 'No file provided' }, 400);

  try {
    const xmlText = await file.text();
    const parsed  = parseWXR(xmlText);
    const plan    = buildImportPlan(parsed);
    const token   = randomUUID();
    pendingImports.set(token, { parsed, ts: Date.now() });
    return c.json({ token, plan });
  } catch (err) {
    return c.json({ error: `Parse error: ${err.message}` }, 422);
  }
});

// POST /api/import/execute — run WXR import using stored token
importRoutes.post('/execute', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const { token, selectedTypes, downloadMedia, onDuplicate } = body;

  if (!token || !pendingImports.has(token))
    return c.json({ error: 'Import token expired or invalid. Please re-upload your file.' }, 400);

  const { parsed } = pendingImports.get(token);
  pendingImports.delete(token);

  const db = openPod(c.get('podPath'));
  try {
    const results = await executeImport(db, parsed, {
      selectedTypes: selectedTypes ?? [],
      downloadMedia: !!downloadMedia,
      onDuplicate:   onDuplicate ?? 'skip',
    });
    db.close();
    return c.json(results);
  } catch (err) {
    db.close();
    return c.json({ error: err.message }, 500);
  }
});

// POST /api/import/markdown — import .md files with frontmatter
importRoutes.post('/markdown', async (c) => {
  const form      = await c.req.formData();
  const targetCol = form.get('md_collection')?.toString() ?? '';
  const onDup     = form.get('on_duplicate')?.toString() ?? 'skip';
  const files     = form.getAll('md_files').filter(f => f instanceof File && f.size > 0);

  if (files.length === 0) return c.json({ error: 'No files provided' }, 400);
  if (!targetCol)         return c.json({ error: 'No target collection selected' }, 400);

  const db  = openPod(c.get('podPath'));
  const col = db.getCollection(targetCol);
  if (!col) { db.close(); return c.json({ error: `Collection "${targetCol}" not found` }, 404); }

  let imported = 0, skipped = 0;
  const now = () => new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

  function parseFrontmatter(text) {
    const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { data: {}, body: text.trim() };
    const data = {};
    for (const line of m[1].split('\n')) {
      const kv = line.match(/^(\w[\w-]*):\s*(.+)$/);
      if (!kv) continue;
      let val = kv[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      else if (val === 'true')  val = true;
      else if (val === 'false') val = false;
      else if (val !== '' && !isNaN(Number(val))) val = Number(val);
      data[kv[1]] = val;
    }
    return { data, body: m[2].trim() };
  }

  for (const f of files) {
    const text   = await f.text();
    const parsed = parseFrontmatter(text);
    const slug   = String(parsed.data.slug ?? f.name.replace(/\.md$/, '').toLowerCase().replace(/\s+/g, '-'));
    delete parsed.data.slug;
    const entryData = { ...parsed.data, body: parsed.data.body ?? parsed.body };
    const status    = String(parsed.data.status ?? 'draft');
    delete entryData.status;

    const existing = db.db.prepare('SELECT id FROM _entries WHERE collection_id = ? AND slug = ?').get(targetCol, slug);
    if (existing && onDup === 'skip') { skipped++; continue; }

    if (existing) {
      db.db.prepare('UPDATE _entries SET data=?,status=?,updated_at=? WHERE id=?')
        .run(JSON.stringify(entryData), status, now(), existing.id);
    } else {
      db.db.prepare('INSERT INTO _entries (id,collection_id,slug,data,status) VALUES (?,?,?,?,?)')
        .run(randomUUID(), targetCol, slug, JSON.stringify(entryData), status);
    }
    imported++;
  }

  db.close();
  return c.json({ type: 'markdown', imported, skipped });
});
