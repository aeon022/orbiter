import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import orbiter from '@a83/orbiter-integration';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    orbiter({ pod: './content.pod' }),
  ],
});
