/**
 * orbiter status
 * Shows pod health, entry counts, size, and last modified.
 *
 * Usage:
 *   orbiter status [pod-path]
 */
import { resolve, basename } from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { openPod } from '@a83/orbiter-core';

function fmtBytes(b) {
  if (b < 1024)        return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

export function run(args) {
  const podArg  = args.find(a => !a.startsWith('-')) ?? null;
  const podPath = resolve(process.cwd(), podArg ?? 'content.pod');

  if (!existsSync(podPath)) {
    console.error(`\n  ✕  Pod not found: ${podPath}\n`);
    process.exit(1);
  }

  const db   = openPod(podPath);
  const stat = statSync(podPath);
  const meta = db.getMeta?.('site') ?? {};
  let siteMeta = {};
  try { siteMeta = typeof meta === 'string' ? JSON.parse(meta) : (meta ?? {}); } catch {}

  const cols   = db.getCollections();
  const users  = db.db.prepare(`SELECT COUNT(*) AS n FROM _users`).get();
  const lastMod = db.db.prepare(
    `SELECT MAX(updated_at) AS t FROM _entries WHERE status = 'published'`
  ).get();

  // Public API info
  const publicCols   = db.getMeta('public.collections') ?? '';
  const requireKey   = db.getMeta('api.requireKey') === '1';
  const apiKeys      = (() => { try { return JSON.parse(db.getMeta('api.keys') ?? '[]'); } catch { return []; } })();
  const siteUrl      = (db.getMeta('site.url') ?? '').replace(/\/$/, '');
  const publicActive = publicCols.trim().length > 0;

  console.log(`\n  ◆  ${basename(podPath)}\n`);
  console.log(`  Site      ${siteMeta.name ?? '—'}  (${siteMeta.locale ?? '?'})`);
  console.log(`  File      ${fmtBytes(stat.size)}  →  ${podPath}`);
  console.log(`  Modified  ${fmtDate(lastMod?.t)}`);
  console.log(`  Users     ${users?.n ?? 0}\n`);

  if (cols.length === 0) {
    console.log('  No collections yet.\n');
  } else {
    const maxLen = Math.max(...cols.map(c => (c.label || c.id).length));
    for (const col of cols) {
      const counts = db.db.prepare(
        `SELECT status, COUNT(*) AS n FROM _entries WHERE collection_id = ? GROUP BY status`
      ).all(col.id);
      const byStatus = Object.fromEntries(counts.map(r => [r.status, r.n]));
      const pub   = byStatus.published ?? 0;
      const draft = byStatus.draft     ?? 0;
      const sched = byStatus.scheduled ?? 0;
      const trash = byStatus.trashed   ?? 0;
      const lbl   = (col.label || col.id).padEnd(maxLen);
      const parts = [`${pub} published`];
      if (draft) parts.push(`${draft} draft${draft > 1 ? 's' : ''}`);
      if (sched) parts.push(`${sched} scheduled`);
      if (trash) parts.push(`${trash} trashed`);
      console.log(`  ${lbl}  ${parts.join('  ·  ')}`);
    }
    console.log('');
  }

  // Public API section
  if (publicActive) {
    const colList = publicCols.trim() === '*' ? 'all collections' : publicCols;
    const authNote = requireKey
      ? `key required  (${apiKeys.length} key${apiKeys.length !== 1 ? 's' : ''} active)`
      : 'open (no key required)';
    console.log(`  Public API  ${authNote}`);
    console.log(`  Collections ${colList}`);
    if (siteUrl) {
      console.log(`  Endpoint    ${siteUrl}/api/public`);
      console.log(`  OpenAPI     ${siteUrl}/api/public/openapi.json`);
    }
    console.log('');
  } else {
    console.log(`  Public API  disabled\n`);
  }

  db.close();
}
