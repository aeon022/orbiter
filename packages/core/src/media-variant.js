/**
 * On-the-fly image variants: /orbiter/media/<id>?w=800&fmt=webp&ar=16:9
 *
 *   w    width, snapped up to one of WIDTHS (so the number of distinct variants per image is bounded)
 *   fmt  webp | avif | jpeg
 *   ar   aspect ratio from RATIOS — crops around the image's focal point (default: centre)
 *
 * sharp is loaded lazily and optionally (Astro projects have it): without it, or for non-raster types,
 * callers just serve the original. Variants are cached in memory and at most MAX_PARALLEL are
 * rendered at once — anything beyond MAX_QUEUE waiting is refused (503) rather than piling up CPU.
 */
export const WIDTHS  = [160, 320, 480, 640, 800, 1024, 1280, 1600, 2000];
export const RATIOS  = { '1:1': 1, '4:3': 4 / 3, '3:2': 3 / 2, '16:9': 16 / 9, '2:1': 2, '3:4': 3 / 4, '2:3': 2 / 3, '9:16': 9 / 16 };
const FORMATS        = { webp: 'image/webp', avif: 'image/avif', jpeg: 'image/jpeg' };
const RASTER         = /^image\/(jpeg|png|webp|avif|tiff)$/;
const MAX_PARALLEL   = 2;
const MAX_QUEUE      = 20;
const CACHE_BYTES    = 64 * 1024 * 1024;

/** Query params → { w?, fmt?, ar? } or null when no (valid) variant was asked for. */
export function parseVariant(params) {
  const out = {};
  const w = parseInt(params.get('w') ?? '', 10);
  if (w > 0) out.w = WIDTHS.find(x => x >= w) ?? WIDTHS[WIDTHS.length - 1];
  const fmt = params.get('fmt');
  if (fmt && FORMATS[fmt]) out.fmt = fmt;
  const ar = params.get('ar');
  if (ar && RATIOS[ar]) out.ar = ar;
  return Object.keys(out).length ? out : null;
}

export const canVariant = (mime) => RASTER.test(String(mime ?? ''));

/** Crop box of aspect `ratio` inside width×height, centred on the focal point (0..1), clamped to the image. */
export function focalCrop(width, height, ratio, fx = 0.5, fy = 0.5) {
  let cw = width, ch = Math.round(width / ratio);
  if (ch > height) { ch = height; cw = Math.round(height * ratio); }
  const left = Math.min(Math.max(Math.round(fx * width  - cw / 2), 0), width  - cw);
  const top  = Math.min(Math.max(Math.round(fy * height - ch / 2), 0), height - ch);
  return { left, top, width: cw, height: ch };
}

let sharpMod; // undefined = not tried, null = unavailable
/** Let the host hand over its own sharp (the admin already has one) instead of resolving it from this package. */
export function useSharp(mod) { sharpMod = mod ?? undefined; }
async function loadSharp() {
  if (sharpMod === undefined) { try { sharpMod = (await import('sharp')).default; } catch { sharpMod = null; } }
  return sharpMod;
}

const cache = new Map(); // key → { data, type, size }  (insertion order = LRU order)
let cacheSize = 0, running = 0; const waiting = [];

const slot = () => new Promise((resolve, reject) => {
  if (running < MAX_PARALLEL) { running++; return resolve(); }
  if (waiting.length >= MAX_QUEUE) return reject(Object.assign(new Error('busy'), { code: 'BUSY' }));
  waiting.push(resolve);
});
const release = () => { const next = waiting.shift(); if (next) next(); else running--; };

/**
 * @returns {Promise<{data: Buffer, type: string} | null>} null → serve the original (no sharp / not raster).
 * Throws an error with code 'BUSY' when too many renders are queued.
 */
export async function renderVariant(cacheKey, buffer, mime, variant, focal = {}) {
  if (!variant || !canVariant(mime)) return null;
  const sharp = await loadSharp();
  if (!sharp) return null;

  const key = `${cacheKey}|${variant.w ?? ''}|${variant.fmt ?? ''}|${variant.ar ?? ''}|${focal.x ?? ''},${focal.y ?? ''}`;
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }

  await slot();
  try {
    let img = sharp(buffer, { limitInputPixels: 50_000_000 }).rotate();
    const meta = await img.metadata();
    if (variant.ar && meta.width && meta.height) {
      img = sharp(await img.extract(focalCrop(meta.width, meta.height, RATIOS[variant.ar], focal.x ?? 0.5, focal.y ?? 0.5)).toBuffer());
    }
    if (variant.w) img = img.resize({ width: variant.w, withoutEnlargement: true });
    const fmt  = variant.fmt ?? (mime === 'image/png' ? 'png' : mime.split('/')[1]);
    const out  = await img.toFormat(fmt === 'jpg' ? 'jpeg' : fmt, { quality: 80 }).toBuffer();
    const res  = { data: out, type: FORMATS[variant.fmt] ?? mime, size: out.length };
    cache.set(key, res); cacheSize += res.size;
    for (const [k, v] of cache) { if (cacheSize <= CACHE_BYTES) break; cache.delete(k); cacheSize -= v.size; }
    return res;
  } finally { release(); }
}
