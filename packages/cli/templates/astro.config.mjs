import { defineConfig } from 'astro/config';
import orbiter from '@a83/orbiter-integration';

export default defineConfig({
  integrations: [
    orbiter({ pod: './content.pod' }),
  ],
});
