/**
 * Ported verbatim from packages/integration/routes/public-collection.js —
 * keep in sync if the Public Content API's auth logic changes.
 */
export function checkApiKey(db, authHeaderValue) {
  const requireKey = db.getMeta('api.requireKey');
  if (requireKey !== '1') return true;

  const bearer = (authHeaderValue ?? '').replace(/^Bearer\s+/i, '').trim();
  if (!bearer) return false;

  try {
    const keys = JSON.parse(db.getMeta('api.keys') ?? '[]');
    const found = keys.find(k => k.key === bearer);
    if (!found) return false;
    found.hits = (found.hits || 0) + 1;
    found.lastUsed = new Date().toISOString().split('T')[0];
    db.setMeta('api.keys', JSON.stringify(keys));
    return true;
  } catch {
    return false;
  }
}
