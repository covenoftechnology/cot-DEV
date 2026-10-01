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
    publishedDate: z.coerce.date().optional(),
    updatedDate: z.coerce.date().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    cover: z.string().optional(),
    thumbBg: z.string().optional(),
    rank: z.string().optional(),
    meta: z.string().optional(),
    order: z.number().optional(),
    status: z.enum(['draft', 'published', 'hidden']).default('draft'),
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog };
