import { Hono } from 'hono';
import { openPod } from '@a83/orbiter-core';

export const aiRoutes = new Hono();

// POST /api/ai/generate — send prompt to configured AI provider
aiRoutes.post('/generate', async (c) => {
  const { prompt, context } = await c.req.json();
  if (!prompt?.trim()) return c.json({ error: 'prompt required' }, 400);

  const db = openPod(c.get('podPath'));
  const provider = db.getMeta('ai.provider') || 'ollama';
  const DEFAULT_MODELS = { ollama: 'llama3.2', anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o-mini', gemini: 'gemini-2.5-flash' };
  const rawModel = db.getMeta('ai.model') || '';
  const model = rawModel || DEFAULT_MODELS[provider] || DEFAULT_MODELS.gemini;
  const apiKey   = db.getMeta('ai.api_key') || '';
  const ollamaUrl = db.getMeta('ai.ollama_url') || 'http://localhost:11434';
  db.close();

  const systemPrompt = 'You are a helpful writing assistant for a CMS. Respond with just the text — no explanations, no markdown fences, no preamble. Match the language of the input.';
  const userPrompt = context ? `Context:\n${context}\n\nTask: ${prompt}` : prompt;

  try {
    let text;

    if (provider === 'ollama') {
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: `${systemPrompt}\n\n${userPrompt}`, stream: false }),
      });
      if (!res.ok) throw new Error(`Ollama error: ${res.status} — is Ollama running at ${ollamaUrl}?`);
      const data = await res.json();
      text = data.response;

    } else if (provider === 'anthropic') {
      if (!apiKey) throw new Error('Anthropic API key not configured — add it in Settings → AI');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Anthropic error: ${err.error?.message || res.status}`);
      }
      const data = await res.json();
      text = data.content?.[0]?.text || '';

    } else if (provider === 'openai') {
      if (!apiKey) throw new Error('OpenAI API key not configured — add it in Settings → AI');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 1024,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`OpenAI error: ${err.error?.message || res.status}`);
      }
      const data = await res.json();
      text = data.choices?.[0]?.message?.content || '';

    } else if (provider === 'gemini') {
      if (!apiKey) throw new Error('Gemini API key not configured — add it in Settings → AI');
      const geminiModel = model || 'gemini-2.5-flash';
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Gemini error: ${err.error?.message || res.status}`);
      }
      const data = await res.json();
      text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    } else {
      throw new Error(`Unknown AI provider: ${provider}`);
    }

    return c.json({ ok: true, text: text.trim() });
  } catch (e) {
    return c.json({ error: e.message }, 502);
  }
});

// POST /api/ai/suggest — smart suggestions after save
aiRoutes.post('/suggest', async (c) => {
  const { collection, slug, type } = await c.req.json();
  if (!collection || !slug || !type) return c.json({ error: 'collection, slug, type required' }, 400);

  const db = openPod(c.get('podPath'));
  const entry = db.getEntry(collection, slug);
  if (!entry) { db.close(); return c.json({ error: 'Entry not found' }, 404); }
  const d = entry.data;
  const col = db.getCollection(collection);
  const schema = col?.schema ? JSON.parse(col.schema) : {};

  if (type === 'tags') {
    const provider = db.getMeta('ai.provider') || 'ollama';
    const rawModel = db.getMeta('ai.model') || '';
    const apiKey = db.getMeta('ai.api_key') || '';
    const ollamaUrl = db.getMeta('ai.ollama_url') || 'http://localhost:11434';
    db.close();

    const DEFAULT_MODELS = { ollama: 'llama3.2', anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o-mini', gemini: 'gemini-2.5-flash' };
    const model = rawModel || DEFAULT_MODELS[provider] || DEFAULT_MODELS.gemini;
    const content = `Title: ${d.title || slug}\n\n${(d.body || d.excerpt || '').slice(0, 1500)}`;
    const prompt = `Extract 3-6 relevant keywords from this content. Return ONLY comma-separated lowercase keywords, nothing else.\n\n${content}`;

    try {
      const res = await callAI(provider, model, apiKey, ollamaUrl, prompt);
      const tags = res.split(',').map(t => t.trim().toLowerCase().replace(/[^a-z0-9äöüß\-]/g, '')).filter(Boolean).slice(0, 8);
      return c.json({ suggestions: [{ type: 'tags', tags }] });
    } catch (e) {
      return c.json({ error: e.message }, 502);
    }

  } else if (type === 'related') {
    const entries = db.getEntries(collection, { status: 'published' });
    db.close();
    const myWords = new Set(
      `${d.title || ''} ${(d.keywords || []).join(' ')} ${d.excerpt || ''}`.toLowerCase().split(/\W+/).filter(w => w.length > 3)
    );
    const related = entries
      .filter(e => e.slug !== slug)
      .map(e => {
        const ed = e.data;
        const words = `${ed.title || ''} ${(ed.keywords || []).join(' ')} ${ed.excerpt || ''}`.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const overlap = words.filter(w => myWords.has(w)).length;
        return { slug: e.slug, title: ed.title || e.slug, score: overlap };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(r => ({ slug: r.slug, title: r.title, reason: `${r.score} shared keywords` }));
    return c.json({ suggestions: [{ type: 'related', entries: related }] });

  } else if (type === 'missing') {
    const provider = db.getMeta('ai.provider') || 'ollama';
    const rawModel = db.getMeta('ai.model') || '';
    const apiKey = db.getMeta('ai.api_key') || '';
    const ollamaUrl = db.getMeta('ai.ollama_url') || 'http://localhost:11434';
    db.close();

    const DEFAULT_MODELS = { ollama: 'llama3.2', anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o-mini', gemini: 'gemini-2.5-flash' };
    const model = rawModel || DEFAULT_MODELS[provider] || DEFAULT_MODELS.gemini;
    const importantFields = ['summaryMachine', 'excerpt', 'keywords', 'hypothesis', 'findings'];
    const missing = importantFields.filter(f => schema[f] && !d[f]?.length);
    const fills = [];

    for (const field of missing.slice(0, 3)) {
      const content = `Title: ${d.title || slug}\n\n${(d.body || '').slice(0, 1000)}`;
      let prompt;
      if (field === 'summaryMachine') prompt = `Write a concise 2-3 sentence machine-readable summary of this content. Output only the summary:\n\n${content}`;
      else if (field === 'excerpt') prompt = `Write a one-sentence teaser for this content. Output only the teaser:\n\n${content}`;
      else if (field === 'keywords') prompt = `Extract 3-5 keywords. Return ONLY comma-separated lowercase keywords:\n\n${content}`;
      else if (field === 'hypothesis') prompt = `What hypothesis does this content test? One sentence only:\n\n${content}`;
      else if (field === 'findings') prompt = `Summarize the key findings in 1-2 sentences:\n\n${content}`;
      else continue;
      try {
        const val = await callAI(provider, model, apiKey, ollamaUrl, prompt);
        fills.push({ type: 'fill', field, label: schema[field]?.label || field, value: field === 'keywords' ? val.split(',').map(t => t.trim()).filter(Boolean) : val.trim() });
      } catch {}
    }
    return c.json({ suggestions: fills });

  } else {
    db.close();
    return c.json({ error: 'Unknown type' }, 400);
  }
});

// POST /api/ai/suggest-all — aggregated smart suggestions (v2)
aiRoutes.post('/suggest-all', async (c) => {
  const { collection, slug } = await c.req.json();
  if (!collection || !slug) return c.json({ error: 'collection, slug required' }, 400);

  const db = openPod(c.get('podPath'));
  const entry = db.getEntry(collection, slug);
  if (!entry) { db.close(); return c.json({ error: 'Entry not found' }, 404); }
  const d = entry.data;
  const col = db.getCollection(collection);
  const schema = col?.schema ? (typeof col.schema === 'string' ? JSON.parse(col.schema) : col.schema) : {};

  const provider = db.getMeta('ai.provider') || 'ollama';
  const rawModel = db.getMeta('ai.model') || '';
  const apiKey = db.getMeta('ai.api_key') || '';
  const ollamaUrl = db.getMeta('ai.ollama_url') || 'http://localhost:11434';
  const hasAI = !!(provider === 'ollama' || apiKey);

  const DEFAULT_MODELS = { ollama: 'llama3.2', anthropic: 'claude-sonnet-4-20250514', openai: 'gpt-4o-mini', gemini: 'gemini-2.5-flash' };
  const model = rawModel || DEFAULT_MODELS[provider] || DEFAULT_MODELS.gemini;
  const content = `Title: ${d.title || d.name || slug}\n\n${(d.body || d.excerpt || '').slice(0, 1500)}`;

  const result = { tags: null, related: null, fills: null, seo: null, prompts: null, quality: null };

  // ── Quality hints (no AI, always runs) ────────────────────
  const hints = [];
  const bodyField = Object.entries(schema).find(([, v]) => v.type === 'richtext');
  const bodyVal = bodyField ? (d[bodyField[0]] || '') : '';
  const imageField = Object.entries(schema).find(([, v]) => v.type === 'media' || v.type === 'image');
  const excerptField = Object.entries(schema).find(([k]) => ['excerpt', 'teaser', 'summary', 'description'].includes(k));
  const tagsField = Object.entries(schema).find(([k]) => ['tags', 'keywords'].includes(k));

  if (bodyField && bodyVal.length < 100 && bodyVal.length > 0) hints.push({ message: 'Content is very short', severity: 'warn' });
  if (bodyField && bodyVal.length === 0) hints.push({ message: 'No content in body field', severity: 'warn' });
  if (imageField && !d[imageField[0]]) hints.push({ message: 'No image set', severity: 'info' });
  if (excerptField && !d[excerptField[0]]) hints.push({ message: 'No excerpt — search engines will use the first paragraph', severity: 'info' });
  if (tagsField && (!d[tagsField[0]] || !d[tagsField[0]].length)) hints.push({ message: 'No tags set', severity: 'info' });
  if (!d._seo?.title) hints.push({ message: 'No SEO title set', severity: 'info' });
  if (!d._seo?.description) hints.push({ message: 'No SEO description set', severity: 'info' });
  result.quality = hints;

  // ── Related entries (cross-collection, no AI) ─────────────
  const myWords = new Set(
    `${d.title || d.name || ''} ${(d.keywords || d.tags || []).join(' ')} ${d.excerpt || ''}`.toLowerCase().split(/\W+/).filter(w => w.length > 3)
  );
  if (myWords.size > 0) {
    const allCols = db.getCollections();
    const related = [];
    for (const rc of allCols) {
      const entries = db.getEntries(rc.id, { status: 'published' });
      for (const e of entries) {
        if (e.slug === slug && rc.id === collection) continue;
        const ed = e.data;
        const words = `${ed.title || ed.name || ''} ${(ed.keywords || ed.tags || []).join(' ')} ${ed.excerpt || ''}`.toLowerCase().split(/\W+/).filter(w => w.length > 3);
        const overlap = words.filter(w => myWords.has(w)).length;
        if (overlap > 0) related.push({ slug: e.slug, title: ed.title || ed.name || e.slug, collection: rc.id, collectionLabel: rc.label, score: overlap });
      }
    }
    related.sort((a, b) => b.score - a.score);
    result.related = related.slice(0, 8).map(r => ({ slug: r.slug, title: r.title, collection: r.collection, collectionLabel: r.collectionLabel, reason: `${r.score} shared keywords` }));
  }

  db.close();

  if (!hasAI) return c.json(result);

  // ── AI-powered suggestions (parallel) ─────────────────────
  const aiTasks = [];

  // Tags
  if (tagsField) {
    aiTasks.push(
      callAI(provider, model, apiKey, ollamaUrl, `Extract 3-6 relevant keywords from this content. Return ONLY comma-separated lowercase keywords, nothing else.\n\n${content}`)
        .then(res => { result.tags = res.split(',').map(t => t.trim().toLowerCase().replace(/[^a-z0-9äöüß\-]/g, '')).filter(Boolean).slice(0, 8); })
        .catch(() => {})
    );
  }

  // SEO
  if (!d._seo?.title || !d._seo?.description) {
    const seoPrompt = `Generate an SEO-optimized meta title (max 60 chars) and meta description (max 155 chars) for this content. Format: TITLE: ...\nDESCRIPTION: ...\n\n${content}`;
    aiTasks.push(
      callAI(provider, model, apiKey, ollamaUrl, seoPrompt)
        .then(res => {
          const titleMatch = res.match(/TITLE:\s*(.+)/i);
          const descMatch = res.match(/DESCRIPTION:\s*(.+)/i);
          const seo = {};
          if (!d._seo?.title && titleMatch) seo.title = titleMatch[1].trim().slice(0, 70);
          if (!d._seo?.description && descMatch) seo.description = descMatch[1].trim().slice(0, 200);
          if (seo.title || seo.description) result.seo = seo;
        })
        .catch(() => {})
    );
  }

  // Missing fields
  const importantFields = ['summaryMachine', 'excerpt', 'keywords', 'hypothesis', 'findings'];
  const missing = importantFields.filter(f => schema[f] && !d[f]?.length);
  const fills = [];
  for (const field of missing.slice(0, 3)) {
    const bodyContent = `Title: ${d.title || d.name || slug}\n\n${(d.body || '').slice(0, 1000)}`;
    const PROMPTS = {
      summaryMachine: `Write a concise 2-3 sentence machine-readable summary. Output only the summary:\n\n${bodyContent}`,
      excerpt: `Write a one-sentence teaser. Output only the teaser:\n\n${bodyContent}`,
      keywords: `Extract 3-5 keywords. Return ONLY comma-separated lowercase keywords:\n\n${bodyContent}`,
      hypothesis: `What hypothesis does this content test? One sentence only:\n\n${bodyContent}`,
      findings: `Summarize the key findings in 1-2 sentences:\n\n${bodyContent}`,
    };
    if (!PROMPTS[field]) continue;
    aiTasks.push(
      callAI(provider, model, apiKey, ollamaUrl, PROMPTS[field])
        .then(val => { fills.push({ field, label: schema[field]?.label || field, value: field === 'keywords' ? val.split(',').map(t => t.trim()).filter(Boolean) : val.trim() }); })
        .catch(() => {})
    );
  }

  // Suggested prompts
  if (schema.suggestedPrompts && (!d.suggestedPrompts || !d.suggestedPrompts.length)) {
    aiTasks.push(
      callAI(provider, model, apiKey, ollamaUrl, `Generate 3 follow-up questions a reader might ask about this content. Return ONLY the questions, one per line, no numbering.\n\n${content}`)
        .then(res => {
          const prompts = res.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean).slice(0, 5);
          if (prompts.length) result.prompts = { field: 'suggestedPrompts', label: schema.suggestedPrompts?.label || 'Suggested Prompts', value: prompts };
        })
        .catch(() => {})
    );
  }

  await Promise.allSettled(aiTasks);
  if (fills.length) result.fills = fills;

  return c.json(result);
});

// Shared AI caller
async function callAI(provider, model, apiKey, ollamaUrl, prompt) {
  const sysPrompt = 'You are a helpful CMS assistant. Respond with just the requested output — no explanations, no markdown fences. Match the language of the input.';
  let text;
  if (provider === 'ollama') {
    const res = await fetch(`${ollamaUrl}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt: `${sysPrompt}\n\n${prompt}`, stream: false }) });
    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
    text = (await res.json()).response;
  } else if (provider === 'anthropic') {
    if (!apiKey) throw new Error('API key not configured');
    const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, body: JSON.stringify({ model, max_tokens: 512, system: sysPrompt, messages: [{ role: 'user', content: prompt }] }) });
    if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
    text = (await res.json()).content?.[0]?.text || '';
  } else if (provider === 'openai') {
    if (!apiKey) throw new Error('API key not configured');
    const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` }, body: JSON.stringify({ model, messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: prompt }], max_tokens: 512 }) });
    if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
    text = (await res.json()).choices?.[0]?.message?.content || '';
  } else if (provider === 'gemini') {
    if (!apiKey) throw new Error('API key not configured');
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey }, body: JSON.stringify({ system_instruction: { parts: [{ text: sysPrompt }] }, contents: [{ parts: [{ text: prompt }] }] }) });
    if (!res.ok) throw new Error(`Gemini error: ${res.status}`);
    text = (await res.json()).candidates?.[0]?.content?.parts?.[0]?.text || '';
  } else throw new Error('Unknown provider');
  return text.trim();
}
