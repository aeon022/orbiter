import { defineConfig } from 'astro/config';
import orbiter from '@orbiter/integration';

export default defineConfig({
  integrations: [
    orbiter({ pod: './demo.pod' }),
  ],
});
