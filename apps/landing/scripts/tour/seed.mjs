import { createPod, openPod, hashPassword } from '../../../../packages/core/src/index.js';
const p = process.argv[2]; createPod(p); const db = openPod(p);
db.insertUser('u-admin', 'admin', await hashPassword('orbiter-demo-1'), 'admin');
db.insertUser('u-ed', 'editor', await hashPassword('orbiter-demo-2'), 'editor');
db.insertUser('u-rev', 'reviewer', await hashPassword('orbiter-demo-3'), 'reviewer');
db.setMeta('site.name', 'Studio Nordlicht'); db.setMeta('site.url', 'https://nordlicht.example');
db.setMeta('workflow.review', '1');
db.setMeta('api.enabled', '1');          // open Content API, no token → shows up in the security check
db.setMeta('ftp.password', 'plain-demo-password'); db.setMeta('ftp.host', 'ftp.example.com'); db.setMeta('ftp.user', 'deploy');
db.setMeta('dashboard.notes', 'Autumn campaign: copy review by Friday.\nRenew the domain in November.');

const ago = (h) => new Date(Date.now() - h * 3600e3).toISOString().replace('T', ' ').slice(0, 19);
const touch = (id, h) => db.db.prepare('UPDATE _entries SET updated_at = ?, created_at = ? WHERE id = ?').run(ago(h), ago(h + 48), id);

db.createCollection('people', 'People', { title: { type: 'string', label: 'Name' }, role: { type: 'string', label: 'Role' }, bio: { type: 'richtext', label: 'Bio' } }, false);
const people = {};
for (const [slug, name, role] of [['mara-lindqvist', 'Mara Lindqvist', 'Creative director'], ['jonas-weber', 'Jonas Weber', 'Typographer'], ['ines-ferreira', 'Inês Ferreira', 'Content strategist'], ['tomas-novak', 'Tomáš Novák', 'Developer']])
  people[slug] = db.createEntry('people', slug, { title: name, role, bio: `${name} works on ${role.toLowerCase()} projects at the studio.` }, 'published');

db.createCollection('journal', 'Journal', {
  title:        { type: 'string',   label: 'Title', required: true },
  body:         { type: 'richtext', label: 'Body' },
  excerpt:      { type: 'richtext', label: 'Excerpt', group: 'Basics' },
  category:     { type: 'select',   label: 'Category', options: ['Process', 'Typography', 'Case study', 'Studio'], group: 'Basics' },
  featured:     { type: 'boolean',  label: 'Featured', group: 'Basics' },
  published_on: { type: 'date',     label: 'Publish date', group: 'Basics' },
  tags:         { type: 'array',    label: 'Tags', group: 'Basics' },
  authors:      { type: 'relation', label: 'Authors', collection: 'people', group: 'Author & links' },
  cover:        { type: 'media',    label: 'Cover image', group: 'Author & links' },
  source_url:   { type: 'url',      label: 'Source URL', group: 'Author & links' },
  seo_title:       { type: 'string',   label: 'SEO title', group: 'SEO' },
  seo_description: { type: 'richtext', label: 'SEO description', group: 'SEO' },
}, false);
const posts = [
  ['single-file-website', 'Why we moved the studio website into a single file', 'published', 'Process', true, ['mara-lindqvist'], 30, ['cms', 'astro', 'handover'],
   "## One file, no surprises\n\nOur old setup needed a database server, a staging copy, a backup job and someone who remembered how they fit together. When a client asked for a handover, that someone was usually on holiday.\n\nNow the whole site — content, media, users, schema — lives in one SQLite file. Copying it is the backup. Emailing it is the handover.\n\n## What changed for editors\n\nNothing, and that is the point. The admin looks like a normal CMS: collections, a block editor, drafts, scheduled publishing. The difference only shows when something goes wrong, and then it is boring in the best way."],
  ['typography-long-form', 'Notes on typography for long-form reading', 'published', 'Typography', false, ['jonas-weber'], 54, ['type', 'reading'], "## Measure, leading, and patience\n\nA comfortable line holds around 65 characters. Past that, the eye loses its place on the return sweep. Leading should breathe: 1.5 for body text is a good start, not a rule.\n\nThe rest is restraint."],
  ['review-workflow', 'A calmer way to review content', 'in_review', 'Process', false, ['ines-ferreira'], 5, ['editorial'], "## Submit, don't publish\n\nEditors write and submit. A reviewer reads the diff, approves or asks for changes. Nothing goes live by accident."],
  ['autumn-campaign', 'Field notes: shipping the autumn campaign', 'draft', 'Studio', false, ['mara-lindqvist'], 9, ['campaign'], "Draft in progress — outline, quotes from the client workshop, three open questions."],
  ['harbour-festival', 'Launching the Harbour Festival site', 'published', 'Case study', true, ['tomas-novak', 'mara-lindqvist'], 120, ['case-study', 'events'], "## A festival site in three weeks\n\nProgramme, tickets, accessibility information — and a schedule that changes daily."],
  ['design-systems', 'Design systems that survive contact with clients', 'scheduled', 'Process', false, ['jonas-weber'], 20, ['design-systems'], "Scheduled for next week."],
  ['three-handovers', 'What we learned from three client handovers', 'in_review', 'Studio', false, ['ines-ferreira'], 3, ['handover'], "## Handover checklist\n\nAccess, backups, who to call. Written down once."],
  ['photo-shoot', 'Behind the scenes: our photo shoot day', 'draft', 'Studio', false, ['tomas-novak'], 70, ['photography'], "Photos still being selected."],
];
const ids = {};
for (const [slug, title, status, category, featured, authors, h, tags, body] of posts) {
  const id = db.createEntry('journal', slug, {
    title, body, excerpt: body.split('\n').find((l) => l && !l.startsWith('#'))?.slice(0, 140) ?? '', category, featured, published_on: '2026-10-0' + (1 + (h % 8)), tags,
    authors: authors.map((a) => people[a]), source_url: '', seo_title: title.slice(0, 58), seo_description: `${title} — Studio Nordlicht journal.`,
  }, status === 'scheduled' ? 'draft' : status);
  ids[slug] = id; touch(id, h);
  if (status === 'scheduled') db.db.prepare("UPDATE _entries SET status='scheduled', publish_at=? WHERE id=?").run('2026-10-15 09:00:00', id);
}

db.createCollection('projects', 'Projects', {
  title:    { type: 'string', label: 'Project', required: true, group: 'Basics' },
  client:   { type: 'string', label: 'Client', group: 'Basics' },
  year:     { type: 'number', label: 'Year', group: 'Basics' },
  services: { type: 'array',  label: 'Services', group: 'Basics' },
  summary:  { type: 'richtext', label: 'Summary', group: 'Basics' },
  cover:    { type: 'media',  label: 'Cover image', group: 'Media & links' },
  live_url: { type: 'url',    label: 'Live URL', group: 'Media & links' },
}, false);
for (const [slug, t, c, y, svc, h] of [['harbour-festival', 'Harbour Festival', 'Hafen Kultur e.V.', 2026, ['Identity', 'Web'], 100], ['nordic-bakery', 'Nordic Bakery', 'Brødhuset', 2025, ['Brand', 'Packaging'], 200], ['atlas-clinic', 'Atlas Clinic', 'Atlas Health', 2025, ['Web', 'Content'], 300], ['lumen-lab', 'Lumen Lab', 'Lumen GmbH', 2024, ['Identity'], 400]])
  touch(db.createEntry('projects', slug, { title: t, client: c, year: y, services: svc, summary: `${t} for ${c}.` }, 'published'), h);
db.createCollection('events', 'Events', { title: { type: 'string', label: 'Event', required: true }, starts_at: { type: 'datetime', label: 'Starts' }, venue: { type: 'string', label: 'Venue' } }, false);
for (const [slug, t, d] of [['open-studio', 'Open studio evening', '2026-10-22T18:00'], ['type-talk', 'Type talk with Jonas', '2026-11-05T19:00']]) db.createEntry('events', slug, { title: t, starts_at: d, venue: 'Studio Nordlicht' }, 'published');
console.log(JSON.stringify(ids));
db.close(); process.exit(0);
