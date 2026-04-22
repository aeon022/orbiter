import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  site: 'https://orbiter.sh',
  integrations: [sitemap({
    filter: (page) => !page.includes('/privacy') && !page.includes('/cookies'),
  })],
});
