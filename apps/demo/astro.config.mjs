import { defineConfig } from 'astro/config';
import orbiter from '@orbiter/integration';

export default defineConfig({
  server: {
    port: 8080,
  },
  integrations: [
    orbiter({ pod: './demo.pod' }),
  ],
});