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

const lists = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lists' }),
  // The schema takes the `image()` helper, so artwork paths resolve relative to
  // the entry file and go through astro:assets. `listItem` is declared in here
  // rather than at module scope because it needs that helper.
  schema: ({ image }) => {
    /** One entry in a list -- a recommendation, so usually a link out. */
    const listItem = z.object({
      name: z.string(),
      /** Optional. No href renders as plain text rather than a dead link. */
      href: z.string().optional(),
      /**
       * A path relative to this file, e.g. './artwork/the-matrix.jpg'.
       *
       * Deliberately a local file rather than a remote URL: Astro resizes and
       * re-encodes it at build time, which takes a ~60kB poster down to ~4kB
       * at the size it actually renders. Allowing remote URLs would mean
       * either shipping the full-size original or making every build depend on
       * someone else's server being up.
       */
      image: image().optional(),
      note: z.string().optional(),
      tags: z.array(z.string()).default([]),
      placeholder,
    });

    const list = z.object({
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
       * Both are 56px wide, so the artwork column lines up across every list
       * and only the row height changes. Cropping a 2:3 poster into a square
       * would keep the middle and throw away the title.
       */
      thumb: z.enum(['square', 'poster']).default('square'),
      /** A list carries `items` (ranked or flat) or `groups`, not both. */
      items: z.array(listItem).default([]),
      groups: z
        .array(
          z.object({
            name: z.string(),
            /**
             * Optional. A sentence or two on what the section collects or why
             * it is a section, rendered under the heading. A group without one
             * renders as name and count, the same as it always has -- the way
             * to add a blurb is to write a real one, not to reinstate a stub.
             */
            description: z.string().optional(),
            placeholder,
            items: z.array(listItem),
          })
        )
        .default([]),
      draft: z.boolean().default(false),
      placeholder,
    });

    /**
     * `items` and `groups` are parallel optional arrays, which lets frontmatter
     * describe three shapes the templates cannot render: both filled, neither
     * filled, and `ranked` set on a grouped list. Each one used to fail late
     * and quietly -- an empty page, or a rank counter that silently skipped a
     * group -- so the schema rejects them at build time instead.
     */
    return list.superRefine((data, ctx) => {
      const hasItems = data.items.length > 0;
      const hasGroups = data.groups.length > 0;

      if (hasItems === hasGroups) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: hasItems
            ? 'a list carries `items` or `groups`, never both'
            : 'a list needs either `items` or `groups`',
        });
      }

      if (data.ranked && hasGroups) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['ranked'],
          message: 'a ranked list is one sequence, so it cannot be grouped',
        });
      }
    });
  },
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['building', 'beta', 'live']),
    /** The status line as written, e.g. "Beta". */
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
    /**
     * An iOS build a stranger can ask to join. Adds the "Join the beta" button
     * to the case study, addressed and pre-written by `testflightRequestHref`.
     * Not derived from `status: 'beta'` -- a beta web app has nothing to join.
     */
    testflight: z.boolean().default(false),
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
