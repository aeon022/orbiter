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
