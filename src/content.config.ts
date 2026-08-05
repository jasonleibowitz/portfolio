import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Copy that is still waiting on Jason is marked rather than invented, so the
 * gaps are visible on the page instead of described in a document. Each entry
 * names a frontmatter field that renders with a dotted underline.
 */
const placeholder = z.array(z.string()).default([]);

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string().optional(),
    author: z.string(),
    image: z.object({
      url: z.string(),
      alt: z.string(),
    }),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

/** One entry in a list -- a recommendation, so it is usually a link out. */
const listItem = z.object({
  name: z.string(),
  /** Optional. An entry with no href renders as plain text, not a dead link. */
  href: z.string().optional(),
  image: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).default([]),
  placeholder,
});

const lists = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lists' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    updated: z.coerce.date(),
    /** Ranked lists are numbered and never grouped. */
    ranked: z.boolean().default(false),
    /**
     * Artwork ratio for the whole list, since it is a property of the kind of
     * thing being listed rather than of any one entry:
     *
     *   square  56x56  (1:1)  podcast and album art, the default
     *   poster  56x84  (2:3)  film and book covers
     *
     * Both are 56px wide, so the artwork column lines up across every list and
     * only the row height changes. Cropping a 2:3 poster into a square would
     * keep the middle and throw away the title.
     */
    thumb: z.enum(['square', 'poster']).default('square'),
    /** A list carries `items` (ranked or flat) or `groups`, not both. */
    items: z.array(listItem).default([]),
    groups: z
      .array(z.object({ name: z.string(), items: z.array(listItem) }))
      .default([]),
    draft: z.boolean().default(false),
    placeholder,
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['building', 'beta', 'live']),
    /** The status line as written, e.g. "Beta · near release". */
    status_text: z.string(),
    /** Longer variant for the case-study header; falls back to status_text. */
    status_text_case: z.string().optional(),
    /** Only a project that is actively moving gets the pulsing dot. */
    status_pulse: z.boolean().default(false),
    stack: z.array(z.string()),
    /** Screenshots are drawn placeholders: a phone body, or a browser window. */
    frame: z.enum(['phone', 'window']).default('phone'),
    /** The case study's spec rail, rendered in order. */
    specs: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
          placeholder: z.boolean().default(false),
        })
      )
      .default([]),
    cta: z.object({ label: z.string(), href: z.string() }).optional(),
    /** The homepage shows only these, so adding a project never changes it. */
    is_featured: z.boolean().default(false),
    /** For when "newest first" stops being the right sort. */
    order: z.number().optional(),
    links: z
      .object({ site: z.string().optional(), repo: z.string().optional() })
      .optional(),
    draft: z.boolean().default(false),
    placeholder,
  }),
});

export const collections = { blog, lists, projects };
