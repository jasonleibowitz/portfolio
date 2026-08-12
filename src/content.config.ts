import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * The rules for the block at the top of each content file. A file that breaks
 * one stops the build, thus a mistake is loud now and not quiet on the page.
 */

/**
 * Names the fields of this entry that wait for real words. The page draws a
 * dotted line under each one, thus a gap shows on the page and not in a
 * document, where nobody reads it.
 */
const placeholder = z.array(z.string()).default([]);

/**
 * The address of a page: 'espresso-machines' serves
 * `/writing/espresso-machines/`.
 *
 * Give an entry a slug when its address must differ from the name of its file.
 * Every post does, because the folder of a post starts with a date to keep the
 * directory in order, and a reader does not need that date.
 *
 * Astro accepts any text here, and it reads the field before it reads these
 * rules. A slug with a space in it made a page at
 * `/lists/Favorite Movies/2024/` and gave no message, thus the rule stops the
 * build instead. `slugify()` in `src/lib/slug.ts` makes this shape from a title.
 */
const address = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'a slug is words in small letters, joined by single dashes'
  )
  .optional();

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  /* A function of `image()`, the helper of Astro that finds a picture beside
     this file and makes a copy of it at each size a screen needs. */
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: address,
      pubDate: z.coerce.date(),
      description: z.string().optional(),
      author: z.string(),
      /**
       * The picture at the top of the post, beside the post: './cover.webp'.
       * A file in `public/` goes to the site at full size instead, and one post
       * sent 4.5 MB that way. A picture on a different site is not permitted,
       * because each build would fetch it and a host that is down would stop
       * the build.
       */
      image: image(),
      /**
       * Says what is in that picture, for a reader who cannot see it. A picture
       * in the body has a caption to do this. This one has none.
       */
      imageAlt: z.string(),
      tags: z.array(z.string()),
      draft: z.boolean().default(false),
    }),
});

const lists = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lists' }),
  /* A function of `image()`, thus artwork points at a file beside the list.
     `listItem` is in here because it needs that same helper. */
  schema: ({ image }) => {
    /** One thing on a list, thus usually a link to it. */
    const listItem = z.object({
      name: z.string(),
      /** An item with no link shows as plain text, and not as a dead link. */
      href: z.string().optional(),
      /**
       * The artwork of this item, beside the list: './artwork/the-matrix.jpg'.
       * Astro makes a copy at the size the row uses, which took one poster from
       * 60 kB to 4 kB.
       */
      image: image().optional(),
      /**
       * A few words under the name that say which thing this is: the hosts of a
       * podcast, the part of the city a shop is in, the author of a book. The
       * name of the field is general because a list is not always about one kind
       * of thing. Keep it short: it sets in a small font beside the year.
       */
      subtitle: z.string().optional(),
      note: z.string().optional(),
      tags: z.array(z.string()).default([]),
      placeholder,
    });

    const list = z.object({
      title: z.string(),
      slug: address,
      description: z.string().optional(),
      updated: z.coerce.date(),
      /** A ranked list has a number on each row, thus it is never in groups. */
      ranked: z.boolean().default(false),
      /**
       * The shape of the artwork for the whole list, because the shape belongs
       * to the kind of thing on the list and not to one item:
       *
       *   square  56x56  podcast and album art
       *   poster  56x84  film and book covers
       *
       * Both are 56px wide, thus the artwork is in the same place on every list.
       * A poster cut into a square keeps the middle and loses the title.
       */
      thumb: z.enum(['square', 'poster']).default('square'),
      /** A list holds `items` or `groups`. The rules below refuse both. */
      items: z.array(listItem).default([]),
      groups: z
        .array(
          z.object({
            name: z.string(),
            /**
             * A sentence or two under the name of the group, when there is
             * something to say about why it is a group. A group without one
             * shows its name and a count.
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
     * A file can ask for three pages that no template can draw: both fields
     * filled, neither filled, and numbers on a list that is in groups. Each one
     * made an empty page, or numbers that missed a group, and no message.
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
  /* A function of `image()`, thus the icon points at a file beside the entry. */
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: address,
      description: z.string(),
      /**
       * The real icon of the app, beside the entry: './icons/reel-watch.webp'.
       * Each build of an iOS app makes one already, thus it is artwork that
       * exists. The other choice is a screenshot, which is tall and thin in a
       * square space and too small to read. A project with no icon shows none,
       * because a tile made from the first letter says nothing.
       */
      icon: image().optional(),
      /**
       * The color of the dot beside the status. `testing` means real users have
       * a build. `development` is every step before that.
       */
      status: z.enum(['development', 'testing', 'live']),
      /** The status in words, for example "In Development". */
      status_text: z.string(),
      /** A longer status for the page of the project. `status_text` if absent. */
      status_text_long: z.string().optional(),
      stack: z.array(z.string()),
      /** The frame the site draws around each screenshot. */
      frame: z.enum(['phone', 'window']).default('phone'),
      /**
       * The rows beside the write-up, in this order. A row holds any label, thus
       * add `Role` only where it separates the work of Jason from the work of a
       * team. On a project of one person it does not.
       */
      specs: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .default([]),
      cta: z.object({ label: z.string(), href: z.string() }).optional(),
      /**
       * An iOS build that a stranger can ask to join. It adds the "Join the
       * beta" button, with the mail written for them. `status` cannot say this,
       * because a web app in test has nothing to join.
       */
      testflight: z.boolean().default(false),
      /** The home page shows only these, thus a new project does not change it. */
      is_featured: z.boolean().default(false),
      /** Set this when "newest first" is the wrong order. */
      order: z.number().optional(),
      links: z
        .object({ site: z.string().optional(), repo: z.string().optional() })
        .optional(),
      draft: z.boolean().default(false),
      placeholder,
    }),
});

export const collections = { blog, lists, projects };
