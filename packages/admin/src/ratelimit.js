const buckets = new Map(); // key → { count, resetAt }

/** Fixed-window limiter. Returns true if the call is allowed. In-memory, per process. */
export function allow(key, max, windowMs) {
  const now = Date.now();
  if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
  let b = buckets.get(key);
  if (!b || b.resetAt <= now) { b = { count: 0, resetAt: now + windowMs }; buckets.set(key, b); }
  return ++b.count <= max;
}
