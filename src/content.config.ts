import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({
    base: './src/content/blog',
    pattern: '**/*.md',
  }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    author: z.string(),
    publishedDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.string(),
    tags: z.array(z.string()),
    cover: z.string().optional(),
    status: z.enum(['draft', 'published', 'hidden']),
    featured: z.boolean(),
  }),
});

export const collections = { blog };
