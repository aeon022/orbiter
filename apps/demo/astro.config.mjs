import { defineConfig } from 'astro/config';
import orbiter from '@a83/orbiter-integration';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: {
    // local dev default; overridden by PORT env var at runtime (Railway, etc.)
    port: parseInt(process.env.PORT ?? '8080'),
    host: process.env.HOST ?? '0.0.0.0',
  },
  integrations: [
    orbiter({ pod: './demo.pod' }),
  ],
});