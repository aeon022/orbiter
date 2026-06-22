import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';
import { requireAdmin } from '../middleware/auth.js';

export const templateRoutes = new Hono();

const TEMPLATE_FORMAT_VERSION = 1;

// POST /api/templates/export
templateRoutes.post('/export', requireAdmin, async (c) => {
  const { collections: collectionIds, includeSampleEntries = true } = await c.req.json();
  if (!Array.isArray(collectionIds) || !collectionIds.length) {
    return c.json({ error: 'collections array is required' }, 400);
  }

  const db = openPod(c.get('podPath'));

  const collections = {};
  const sampleEntries = {};

  for (const id of collectionIds) {
    const col = db.getCollection(id);
    if (!col) { db.close(); return c.json({ error: `Collection "${id}" not found` }, 404); }

    const schema = col.schema ? JSON.parse(col.schema) : {};
    collections[id] = {
      label: col.label,
      schema,
      singleton: !!col.singleton,
    };

    if (includeSampleEntries) {
      const entries = db.getEntries(id).slice(0, 10);
      if (entries.length) {
        sampleEntries[id] = entries.map(e => ({
          slug: e.slug,
          data: e.data,
          status: e.status,
        }));
      }
    }
  }

  db.close();

  const label = collectionIds.length === 1
    ? collections[collectionIds[0]].label
    : `${Object.values(collections).map(c => c.label).join(' + ')}`;

  return c.json({
    formatVersion: TEMPLATE_FORMAT_VERSION,
    id: collectionIds.join('+'),
    label,
    exportedAt: new Date().toISOString(),
    collections,
    sampleEntries: includeSampleEntries ? sampleEntries : undefined,
  });
});

// POST /api/templates/import
templateRoutes.post('/import', requireAdmin, async (c) => {
  const template = await c.req.json();

  if (!template.collections || typeof template.collections !== 'object') {
    return c.json({ error: 'Invalid template: missing collections' }, 400);
  }

  const db = openPod(c.get('podPath'));
  const results = { created: [], skipped: [], entries: 0 };

  for (const [id, col] of Object.entries(template.collections)) {
    const safeId = id.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
    const existing = db.getCollection(safeId);

    if (existing) {
      results.skipped.push(safeId);
      continue;
    }

    db.createCollection(safeId, col.label, col.schema || {}, col.singleton || false);
    results.created.push(safeId);

    const entries = template.sampleEntries?.[id];
    if (Array.isArray(entries)) {
      for (const entry of entries) {
        try {
          db.createEntry(safeId, entry.slug, entry.data || {}, entry.status || 'draft');
          results.entries++;
        } catch {}
      }
    }
  }

  db.close();
  return c.json({ ok: true, ...results });
});

// GET /api/templates/available — list built-in templates that can be added
templateRoutes.get('/available', requireAdmin, (c) => {
  const db = openPod(c.get('podPath'));
  const existingIds = new Set(db.getCollections().map(c => c.id));
  db.close();

  const builtIn = [
    {
      id: 'blog',
      label: 'Blog',
      description: 'Posts + Post-Kategorien (parent/child)',
      collections: ['posts', 'post_categories'],
    },
    {
      id: 'portfolio',
      label: 'Portfolio',
      description: 'Projekte + Projekt-Kategorien (parent/child)',
      collections: ['projects', 'project_categories'],
    },
    {
      id: 'business',
      label: 'Business',
      description: 'Seiten + Leistungen + Team',
      collections: ['pages', 'services', 'team'],
    },
    {
      id: 'events',
      label: 'Events',
      description: 'Events + Event-Kategorien (parent/child)',
      collections: ['events', 'event_categories'],
    },
    {
      id: 'dossier',
      label: 'Dossier',
      description: 'Dual Render Dossiers — Research + Evidence + Agent fields',
      collections: ['dossiers'],
    },
  ];

  return c.json(builtIn.map(t => ({
    ...t,
    installed: t.collections.every(cid => existingIds.has(cid)),
    partial: t.collections.some(cid => existingIds.has(cid)) && !t.collections.every(cid => existingIds.has(cid)),
  })));
});

// POST /api/templates/install/:id — install a built-in template
templateRoutes.post('/install/:id', requireAdmin, async (c) => {
  const templateId = c.req.param('id');
  const db = openPod(c.get('podPath'));
  const results = { created: [], skipped: [], entries: 0 };

  const install = (id, label, schema, singleton = false, entries = [], parent = null) => {
    if (db.getCollection(id)) {
      results.skipped.push(id);
      return;
    }
    db.createCollection(id, label, schema, singleton);
    results.created.push(id);
    if (parent) db.setMeta(`collection.${id}.parent`, parent);
    for (const e of entries) {
      try {
        db.createEntry(id, e.slug, e.data, e.status || 'published');
        results.entries++;
      } catch {}
    }
  };

  if (templateId === 'blog') {
    install('posts', 'Posts', {
      title:      { type: 'string',   required: true,  label: 'Titel' },
      excerpt:    { type: 'string',   required: false, label: 'Teaser' },
      body:       { type: 'richtext', required: false, label: 'Text' },
      image:      { type: 'media',    required: false, label: 'Bild' },
      tags:       { type: 'array',    required: false, label: 'Tags' },
      categories: { type: 'relation', collection: 'post_categories', multiple: true, required: false, label: 'Kategorien' },
    }, false, [{
      slug: 'willkommen', data: { title: 'Willkommen', excerpt: 'Erster Beispiel-Beitrag.', body: '## Willkommen\n\nBeispiel-Post.', tags: ['start'] }, status: 'published',
    }]);
    install('post_categories', 'Post-Kategorien', {
      title: { type: 'string', required: true, label: 'Name' },
    }, false, [], 'posts');
  } else if (templateId === 'portfolio') {
    install('projects', 'Projekte', {
      title:      { type: 'string',   required: true,  label: 'Titel' },
      body:       { type: 'richtext', required: false, label: 'Beschreibung' },
      image:      { type: 'media',    required: false, label: 'Vorschau' },
      url:        { type: 'string',   required: false, label: 'Website' },
      tags:       { type: 'array',    required: false, label: 'Tags' },
      categories: { type: 'relation', collection: 'project_categories', multiple: true, required: false, label: 'Kategorien' },
    }, false, [{
      slug: 'beispiel-projekt', data: { title: 'Beispiel-Projekt', body: '## Beschreibung\n\nEin Beispiel-Projekt.', tags: ['beispiel'] }, status: 'published',
    }]);
    install('project_categories', 'Projekt-Kategorien', {
      title: { type: 'string', required: true, label: 'Name' },
    }, false, [], 'projects');
  } else if (templateId === 'business') {
    install('pages', 'Seiten', {
      title: { type: 'string',   required: true,  label: 'Titel' },
      body:  { type: 'richtext', required: false, label: 'Text' },
    }, false, [{
      slug: 'ueber-uns', data: { title: 'Über uns', body: '## Wer wir sind\n\nBeispiel-Seite.' }, status: 'published',
    }]);
    install('services', 'Leistungen', {
      title:       { type: 'string', required: true,  label: 'Titel' },
      description: { type: 'string', required: false, label: 'Beschreibung' },
      price:       { type: 'string', required: false, label: 'Preis' },
    });
    install('team', 'Team', {
      name:  { type: 'string',   required: true,  label: 'Name' },
      role:  { type: 'string',   required: false, label: 'Rolle' },
      bio:   { type: 'richtext', required: false, label: 'Bio' },
      image: { type: 'media',    required: false, label: 'Foto' },
    });
  } else if (templateId === 'events') {
    install('events', 'Events', {
      title:      { type: 'string',   required: true,  label: 'Titel' },
      date:       { type: 'date',     required: true,  label: 'Datum' },
      location:   { type: 'string',   required: false, label: 'Ort' },
      body:       { type: 'richtext', required: false, label: 'Beschreibung' },
      image:      { type: 'media',    required: false, label: 'Bild' },
      ticket_url: { type: 'string',   required: false, label: 'Ticket-Link' },
      categories: { type: 'relation', collection: 'event_categories', multiple: true, required: false, label: 'Kategorien' },
    });
    install('event_categories', 'Event-Kategorien', {
      title: { type: 'string', required: true, label: 'Name' },
    }, false, [], 'events');
  } else if (templateId === 'dossier') {
    install('dossiers', 'Dossiers', {
      title:           { type: 'string',   required: true,  label: 'Titel', group: 'Content' },
      excerpt:         { type: 'string',   required: false, label: 'Teaser', group: 'Content' },
      body:            { type: 'richtext', required: false, label: 'Text', group: 'Content' },
      humanSummary:    { type: 'string',   required: false, label: 'Human Summary', group: 'Content' },
      hypothesis:      { type: 'string',   required: false, label: 'Hypothese', group: 'Research' },
      testSetup:       { type: 'string',   required: false, label: 'Test-Setup', group: 'Research' },
      observations:    { type: 'string',   required: false, label: 'Beobachtungen', group: 'Research' },
      findings:        { type: 'string',   required: false, label: 'Findings', group: 'Research' },
      limitations:     { type: 'string',   required: false, label: 'Einschränkungen', group: 'Research' },
      openQuestions:    { type: 'string',   required: false, label: 'Offene Fragen', group: 'Research' },
      claims:          { type: 'table',    required: false, label: 'Claims', group: 'Evidence' },
      sources:         { type: 'table',    required: false, label: 'Sources (APA 7)', group: 'Evidence', format: 'apa7' },
      relationships:   { type: 'table',    required: false, label: 'Relationships', group: 'Evidence' },
      series:          { type: 'string',   required: false, label: 'Serie', group: 'Meta' },
      keywords:        { type: 'array',    required: false, label: 'Keywords', group: 'Meta' },
      contentType:     { type: 'select',   required: false, label: 'Content-Typ', group: 'Meta', options: ['investigation', 'analysis', 'comparison', 'guide', 'deep-dive', 'tutorial'] },
      language:        { type: 'select',   required: false, label: 'Sprache', group: 'Meta', options: ['de', 'en', 'de+en'] },
      author:          { type: 'string',   required: false, label: 'Autor', group: 'Provenance' },
      authorship:      { type: 'select',   required: false, label: 'Authorship', group: 'Provenance', options: ['human', 'ai-assisted', 'ai-generated', 'collaborative'] },
      aiContribution:  { type: 'string',   required: false, label: 'AI-Beitrag', group: 'Provenance' },
      reviewedBy:      { type: 'string',   required: false, label: 'Reviewed by', group: 'Provenance' },
      reviewStatus:    { type: 'select',   required: false, label: 'Review-Status', group: 'Provenance', options: ['draft', 'peer-reviewed', 'self-reviewed', 'unreviewed'] },
      modelDisclosure: { type: 'string',   required: false, label: 'Modell-Disclosure', group: 'Provenance' },
      summaryMachine:  { type: 'string',   required: false, label: 'Machine Summary', group: 'Agent' },
      dossierId:       { type: 'string',   required: false, label: 'Dossier-ID', group: 'Agent' },
      tokensApprox:    { type: 'number',   required: false, label: 'Tokens (ca.)', group: 'Agent' },
      suggestedPrompts:{ type: 'array',    required: false, label: 'Suggested Prompts', group: 'Agent' },
      hero:            { type: 'media',    required: false, label: 'Hero-Bild' },
    }, false, [{
      slug: 'pilot-dossier', status: 'published', data: {
        title: 'Pilot-Dossier: Dual Render im Praxistest',
        excerpt: 'Erste Untersuchung, ob ein Dossier-Format gleichzeitig für Menschen und AI-Agenten funktioniert.',
        body: '## Kontext\n\nDieses Pilot-Dossier testet das Dual Render Konzept in der Praxis.\n\n## Ergebnis\n\nDas Format funktioniert — Menschen lesen den Body, Agenten lesen summaryMachine + Claims.',
        hypothesis: 'Ein einzelnes Dokument kann gleichzeitig als menschenlesbarer Artikel und als maschinenlesbare Datenquelle dienen.',
        findings: 'Dual Render ist praktikabel. Der Schlüssel ist die Depth-Abstraktion.',
        contentType: 'investigation',
        language: 'de',
        author: 'admin',
        authorship: 'collaborative',
        summaryMachine: 'Pilot investigation of the Dual Render document format.',
        dossierId: 'dsr-pilot-001',
        keywords: ['dual-render', 'dossier', 'pilot'],
      },
    }]);
  } else {
    db.close();
    return c.json({ error: `Unknown template: ${templateId}` }, 404);
  }

  // Auto-configure nav.groups for the installed template
  const NAV_GROUP_MAP = {
    blog:      { 'Blog': ['posts'] },
    portfolio: { 'Portfolio': ['projects'] },
    business:  { 'Business': ['pages', 'services', 'team'] },
    events:    { 'Events': ['events'] },
    dossier:   { 'Research': ['dossiers'] },
  };
  const templateGroups = NAV_GROUP_MAP[templateId];
  if (templateGroups && results.created.length) {
    let existing = {};
    try { existing = JSON.parse(db.getMeta('nav.groups') || '{}'); } catch {}
    if (typeof existing !== 'object' || existing === null) existing = {};
    for (const [group, colIds] of Object.entries(templateGroups)) {
      if (!existing[group]) existing[group] = [];
      for (const id of colIds) {
        if (!existing[group].includes(id)) existing[group].push(id);
      }
    }
    // Deduplicate: if a collection appears in multiple groups, keep it in the newest
    const seen = new Set();
    for (const group of Object.keys(existing).reverse()) {
      existing[group] = existing[group].filter(id => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }
    // Remove empty groups
    for (const g of Object.keys(existing)) {
      if (!existing[g].length) delete existing[g];
    }
    db.setMeta('nav.groups', JSON.stringify(existing));
  }

  db.close();
  return c.json({ ok: true, ...results });
});
