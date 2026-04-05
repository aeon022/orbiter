import { defineConfig } from 'astro/config';
import orbiter from '@orbiter/integration';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { port: 8080 },
  integrations: [
    orbiter({ pod: './demo.pod' }),
  ],
});