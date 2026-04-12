export const prerender = false;

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function GET() {
  // Serve the bundled workflow template for download
  const templatePath = resolve(__dirname, '../../../cli/templates/orbiter-build.yml');
  let content;
  try {
    content = readFileSync(templatePath, 'utf8');
  } catch {
    // Fallback if CLI package is not installed alongside
    content = `# Download @a83/orbiter-cli and find the template at:
# packages/cli/templates/orbiter-build.yml
`;
  }
  return new Response(content, {
    headers: {
      'Content-Type':        'text/yaml',
      'Content-Disposition': 'attachment; filename="orbiter-build.yml"',
    },
  });
}
