import { defineCollection } from 'astro:content';
import { orbiterLoader } from '@a83/orbiter-integration/loader';

export const collections = {
  posts: defineCollection({
    loader: orbiterLoader({ pod: './content.pod', collection: 'posts' }),
  }),
};
