/**
 * CSRF protection via Origin / Referer header validation.
 *
 * sameSite: 'Strict' on the session cookie already blocks most CSRF vectors.
 * This middleware adds a second layer: mutating requests (POST/PUT/PATCH/DELETE)
 * must carry an Origin (or Referer) header that matches ALLOWED_ORIGINS.
 *
 * Browser fetch/XHR always sends Origin on cross-origin requests; same-origin
 * requests send it on POST but not on GET. We only check mutating methods, so
 * the case where Origin is absent on a same-site POST is fine — a same-site
 * request is already allowed.
 *
 * Requests with no Origin AND no Referer (e.g. curl without headers, Postman)
 * are allowed — they can't carry the session cookie cross-site anyway.
 */

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function csrfMiddleware(allowedOrigins) {
  return async (c, next) => {
    if (!MUTATING.has(c.req.method)) return next();

    const origin  = c.req.header('origin');
    const referer = c.req.header('referer');

    // No origin/referer — non-browser client; skip check
    if (!origin && !referer) return next();

    const candidate = origin ?? new URL(referer).origin;

    if (!allowedOrigins.includes(candidate)) {
      return c.json({ error: 'CSRF check failed' }, 403);
    }

    return next();
  };
}
