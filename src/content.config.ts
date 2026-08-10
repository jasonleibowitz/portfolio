import { defineCollection } from 'astro:content';
import { glob, type LoaderContext } from 'astro/loaders';
import { z } from 'astro/zod';

import { imageUrl, queries, sanityClient, usingSanity } from './lib/sanity';

/**
 * Reads a collection from Sanity instead of from disk.
 *
 * A loader is the whole integration point: routes keep calling
 * `getPublished()` and never learn where an entry came from. Only the body
 * differs, because Portable Text is data rather than a compiled component and
 * has to be rendered by `<PortableText />` instead of `render()`.
 */
const sanityLoader = (query: string) => ({
  name: 'sanity',
  load: async ({ store, parseData, logger, generateDigest }: LoaderContext) => {
    const entries = await sanityClient().fetch(query);

    /*
     * Every entry carries a digest, and unchanged ones are left alone.
     *
     * Clearing the store and rewriting it on each load looked equivalent and
     * was not: with nothing to compare, the content layer treats each sync as
     * a change, pushes a reload to the browser, and the reload triggers the
     * next sync. The page reloaded forever. A digest is how Astro tells "the
     * loader ran again" apart from "the content is different".
     */
    const seen = new Set<string>();
    let changed = 0;

    for (const entry of entries) {
      if (!entry.id) continue;
      seen.add(entry.id);

      const digest = generateDigest(entry);
      if (store.get(entry.id)?.digest === digest) continue;

      store.set({
        id: entry.id,
        data: await parseData({ id: entry.id, data: entry }),
        digest,
      });
      changed += 1;
    }

    // A document deleted in the studio has to leave the store as well, which
    // clearing used to handle for free.
    for (const existing of store.values()) {
      if (!seen.has(existing.id)) store.delete(existing.id);
    }

    if (changed) logger.info(`${changed} of ${entries.length} entries changed`);
  },
});

/**
 * An uploaded asset, reshaped into the `{ url, alt }` the templates already
 * read. Doing it here rather than in each template is what keeps the routes
 * source-agnostic: only the body has to know which source it came from.
 */
const sanityImage = z
  .object({
    asset: z.object({ _ref: z.string() }).optional(),
    alt: z.string().optional(),
  })
  /*
   * Optional, unlike the file-backed schema which requires a cover.
   *
   * A draft is written before it is illustrated, and the preview build reads
   * drafts. Requiring the image would fail that build at exactly the moment it
   * is most wanted -- mid-draft -- so the missing case is modelled as an empty
   * url instead of an error.
   */
  // `nullish`, not `optional`: GROQ returns null for a field a document does
  // not have, and null is not undefined as far as zod is concerned.
  .nullish()
  .transform((value) => ({
    url: imageUrl(value, { width: 1600 }) ?? '',
    alt: value?.alt ?? '',
  }));

/**
 * Copy that is still waiting on Jason is marked rather than invented, so the
 * gaps are visible on the page instead of described in a document. Each entry
 * names a frontmatter field that renders with a dotted underline.
 */
const placeholder = z.array(z.string()).default([]);

/**
 * Sanity keeps the body as Portable Text and images as asset references, so
 * the schema differs by source. Everything a template reads by name -- title,
 * pubDate, tags, draft -- stays identical, which is why the routes do not have
 * to branch.
 */
const sanityBlogSchema = z.object({
  title: z.string(),
  pubDate: z.coerce.date(),
  description: z.string().optional(),
  author: z.string(),
  image: sanityImage,
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  body: z.array(z.any()).default([]),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    pubDate: z.coerce.date(),
    description: z.string().optional(),
    author: z.string(),
    /**
     * The hero image. The share card shows the same image.
     *
     * Use an absolute path in `public/blog-images/YYYY-MM-DD/`. Do not use a
     * remote URL. The build stops if you use one.
     *
     * A remote host can remove its files. Then the page and the share card
     * show no image, and the build does not report an error.
     */
    image: z.object({
      url: z.string().startsWith('/', 'a local path under public/, not a URL'),
      alt: z.string(),
    }),
    tags: z.array(z.string()),
    draft: z.boolean().default(false),
  }),
});

const blogCollection = usingSanity
  ? defineCollection({
      loader: sanityLoader(queries.posts),
      schema: sanityBlogSchema,
    })
  : blog;

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
      /**
       * A short credit under the name, saying whatever identifies this kind of
       * thing: a podcast's hosts, a coffee shop's neighborhood, a book's
       * author. Deliberately not named `hosts` -- the lists are not all media
       * of one type, and the field earns its place by being whatever the list
       * is about.
       *
       * It is a credit rather than a sentence, which is why it sets in mono
       * beside the year and `note` stays prose. Keep it to a few words: three
       * hosts, not a paragraph about them.
       */
      subtitle: z.string().optional(),
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

/**
 * A list from Sanity.
 *
 * Artwork arrives as an asset reference and leaves as a CDN URL sized for the
 * 56px column, so `<Artwork>` can render it without `astro:assets`. The
 * `items` / `groups` rule is not repeated here: the studio already prevents
 * the invalid combinations, and a second copy would be a second thing to keep
 * in step.
 */
const sanityListItem = z.object({
  name: z.string(),
  href: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  image: z
    .object({ asset: z.object({ _ref: z.string() }).optional() })
    .nullish()
    .transform((v) => imageUrl(v, { width: 168 })),
  subtitle: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  note: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  tags: z
    .array(z.string())
    .nullish()
    .transform((v) => v ?? []),
  placeholder: z.array(z.string()).default([]),
});

const sanityListSchema = z.object({
  title: z.string(),
  description: z
    .string()
    .nullish()
    .transform((v) => v ?? undefined),
  updated: z.coerce.date(),
  ranked: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
  thumb: z
    .enum(['square', 'poster'])
    .nullish()
    .transform((v) => v ?? 'square'),
  items: z
    .array(sanityListItem)
    .nullish()
    .transform((v) => v ?? []),
  groups: z
    .array(
      z.object({
        name: z.string(),
        description: z
          .string()
          .nullish()
          .transform((v) => v ?? undefined),
        placeholder: z.array(z.string()).default([]),
        items: z
          .array(sanityListItem)
          .nullish()
          .transform((v) => v ?? []),
      })
    )
    .nullish()
    .transform((v) => v ?? []),
  draft: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
  placeholder: z.array(z.string()).default([]),
});

const listsCollection = usingSanity
  ? defineCollection({
      loader: sanityLoader(queries.lists),
      schema: sanityListSchema,
    })
  : lists;

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  // A function of `image()` so an icon path resolves relative to its own entry
  // and goes through astro:assets, the same way list artwork does.
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      /**
       * The app's real icon, e.g. './icons/reel-watch.png' with the file
       * alongside the entry. Optional, and deliberately without a fallback:
       * a project with no icon renders none rather than a generated tile.
       *
       * Every iOS build already ships a 1024px icon, so this is an asset that
       * exists rather than one that has to be made -- which is the whole
       * reason it is the artwork this site uses for a project. A screenshot
       * would have to be captured, is 9:19 in a square slot, and is illegible
       * at the size a summary can afford to give it.
       *
       * Not a remote URL, for the same reason list artwork is not: every build
       * would refetch it, and a dead host would fail the deploy.
       */
      icon: image().optional(),
      /** Drives the status dot's colour. `testing` is pre-launch and shipping
       * builds to real users; `development` is everything before that. */
      status: z.enum(['development', 'testing', 'live']),
      /** The status line as written, e.g. "In Development". */
      status_text: z.string(),
      /** Longer variant for the project page header; falls back to status_text. */
      status_text_long: z.string().optional(),
      stack: z.array(z.string()),
      /** Screenshots are drawn placeholders: a phone body, or a browser window. */
      frame: z.enum(['phone', 'window']).default('phone'),
      /**
       * The project page's spec rail, rendered in order. Rows are free-form:
       * add `Role` only where it separates what Jason did from what a team
       * did, which on a solo project it does not.
       */
      specs: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .default([]),
      cta: z.object({ label: z.string(), href: z.string() }).optional(),
      /**
       * An iOS build a stranger can ask to join. Adds the "Join the beta" button
       * to the project page, addressed and pre-written by `testflightRequestHref`.
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

export const collections = {
  blog: blogCollection,
  lists: listsCollection,
  projects,
};
