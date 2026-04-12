export const prerender = false;

export async function GET() {
  const s = 192, fontSize = 60, borderW = 9, textY = 118;
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}">`,
    `<rect width="${s}" height="${s}" fill="#f5f2ec"/>`,
    `<rect x="${borderW}" y="${borderW}" width="${s - borderW * 2}" height="${s - borderW * 2}" fill="none" stroke="#9a6e30" stroke-width="${borderW / 2}"/>`,
    `<text x="${s / 2}" y="${textY}" font-family="monospace" font-size="${fontSize}" fill="#9a6e30" text-anchor="middle" font-weight="300">OR</text>`,
    `</svg>`,
  ].join('');
  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=604800' },
  });
}
