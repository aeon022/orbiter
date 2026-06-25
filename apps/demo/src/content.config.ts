import { defineCollection } from 'astro:content';
import { orbiterLoader } from '@a83/orbiter-integration/loader';

const posts = defineCollection({
  loader: orbiterLoader({ pod: './demo.pod', collection: 'posts' }),
});

const pages = defineCollection({
  loader: orbiterLoader({ pod: './demo.pod', collection: 'pages' }),
});

const events = defineCollection({
  loader: orbiterLoader({ pod: './demo.pod', collection: 'events' }),
});

export const collections = { posts, pages, events };
