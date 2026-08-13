import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * The shape of the frontmatter of every content file, as one schema for each of
 * the three content types. Astro calls a content type a collection, and it
 * loads each one from its own directory under `src/content/`.
 *
 * A schema is a type and a check at the same time. A page that reads an entry
 * gets fields that match the file, and a file that breaks a rule stops the
 * build and gives its own name. Thus a mistake is loud now, and not quiet on
 * the page later.
 *
 * A schema that holds a picture is a function of `image()`, which reads a file
 * beside the entry and makes a copy at each size a screen needs. A file in
 * `public/` skips that and goes out whole: one post sent 4.5 MB that way. A
 * picture on another site is refused, because each build would fetch it again
 * and a host that is down would stop the build.
 */

/**
 * The address of a page. Write one only where the address must differ from the
 * name of the file: a post always needs one, because its folder starts with a
 * date that a reader does not need. Astro takes the address before it checks it,
 * thus the rule is what stops a slug that no page can serve.
 */
const address = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    'a slug is words in small letters, joined by single dashes'
  )
  .optional();

/**
 * A post: the long writing at `/writing/<slug>/`, with an archive at `/writing`
 * and a page for each tag.
 *
 * A post is a folder and not one file, thus the pictures of the post sit beside
 * it. The name of that folder starts with the date, which keeps the directory
 * in the order a person reads it, and the `slug` then keeps the date out of the
 * address.
 *
 * `pubDate` puts the archive and the feed in order. It is the day only, with no
 * time and no zone, thus a page must show it through `formatDay()`.
 *
 * `coverImage` is the picture at the top of the page, and `coverImageAlt` says
 * what is in it for a reader who cannot see it. The second field is not
 * optional: a picture in the body of a post has a caption to describe it, and
 * the cover has none.
 */
const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      slug: address,
      pubDate: z.coerce.date(),
      description: z.string().optional(),
      author: z.string(),
      coverImage: image(),
      coverImageAlt: z.string(),
      tags: z.array(z.string()),
      draft: z.boolean().default(false),
    }),
});

/**
 * A list: things worth a recommendation, at `/lists/<slug>/`.
 *
 * A list holds `items` or `groups`, and never both. A flat list can be ranked,
 * which puts a number on each row, and a ranked list is never in groups. Those
 * are three states that no template can draw, thus the rules at the end of this
 * schema refuse each one: both fields filled, neither filled, and numbers on a
 * list in groups. Each state made an empty page, or numbers that missed a
 * group, and said nothing.
 *
 * `thumb` gives the shape of the artwork for the whole list, because the shape
 * belongs to the kind of thing on the list and not to one item:
 *
 *   square  56x56  podcast and album art
 *   poster  56x84  film and book covers
 *
 * Both are 56px wide, thus the artwork is in the same place on every list. A
 * poster cut into a square keeps the middle and loses the title.
 *
 * An item is usually a link to the thing. One with no `href` shows as plain
 * text, and not as a link that goes nowhere. `subtitle` is a few words that say
 * which thing this is: the hosts of a podcast, the part of the city a shop is
 * in, the author of a book. The name of that field is general because a list is
 * not always about one kind of thing, and it sets in a small font beside the
 * year, thus keep it short. `note` is the opinion, and it is prose.
 *
 * A group takes a `description` when there is something to say about why it is
 * a group. One without a description shows its name and a count.
 *
 * `listItem` is declared inside this function because it needs `image()`, which
 * only a schema receives.
 */
const lists = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/lists' }),
  schema: ({ image }) => {
    const listItem = z.object({
      name: z.string(),
      href: z.string().optional(),
      image: image().optional(),
      subtitle: z.string().optional(),
      note: z.string().optional(),
      tags: z.array(z.string()).default([]),
    });

    const list = z.object({
      title: z.string(),
      slug: address,
      description: z.string().optional(),
      updated: z.coerce.date(),
      ranked: z.boolean().default(false),
      thumb: z.enum(['square', 'poster']).default('square'),
      items: z.array(listItem).default([]),
      groups: z
        .array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            items: z.array(listItem),
          })
        )
        .default([]),
      draft: z.boolean().default(false),
    });

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
 * A project: an app or a site, with a write-up at `/projects/<slug>/`.
 *
 * `icon` is the real icon of the app. Each build of an iOS app makes one
 * already, thus it is artwork that exists. The other choice is a screenshot,
 * which is tall and thin in a square space and too small to read. A project
 * with no icon shows none, because a tile made from the first letter says
 * nothing.
 *
 * `status` carries the state of the work on its own. It colors the dot and it
 * supplies the word beside it: `testing` means real users have a build, and
 * `development` is every step before that. `Status.astro` owns the wording, so
 * two projects at one stage cannot describe it differently.
 *
 * `testflight` adds the "Join the beta" button, with the mail already written.
 * It is a field of its own because `status` cannot say it: a web app in test
 * has nothing to join.
 *
 * `specs` fills the rows beside the write-up, in the order they are written. A
 * row holds any label, thus add `Role` only where it separates the work of one
 * person from the work of a team. On a project of one person it does not.
 *
 * `is_featured` picks what the home page shows, thus a new project does not
 * change that page. `order` takes over when "newest first" is the wrong
 * sequence, and `frame` picks the shape the site draws around a screenshot.
 *
 * `screenshots` are the real captures, in the order the page shows them. One
 * entry is one screen, and it holds both themes of that screen, because the
 * site re-derives every color from `data-theme` and a capture that does not
 * follow the reader sits in the page looking like a mistake. `alt` describes
 * the screen, thus it belongs to the pair and not to either file: a reader who
 * cannot see them is told what the screen does, which is the same sentence in
 * both themes.
 *
 * The rule below refuses a project where some screens carry `dark` and others
 * do not. That state draws a page where one frame answers the theme toggle and
 * the rest ignore it, which reads as broken rather than as partial.
 */
const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) => {
    const screenshot = z.object({
      light: image(),
      dark: image().optional(),
      alt: z.string(),
      /**
       * What the site draws around this one capture, where that differs from
       * the project's own `frame`. A responsive site is shot in a browser and
       * on a phone, and the two need different hardware in the same row.
       */
      frame: z.enum(['phone', 'window']).optional(),
    });

    const project = z.object({
      title: z.string(),
      slug: address,
      description: z.string(),
      icon: image().optional(),
      status: z.enum(['development', 'testing', 'live']),
      stack: z.array(z.string()),
      frame: z.enum(['phone', 'window']).default('phone'),
      screenshots: z.array(screenshot).default([]),
      specs: z
        .array(z.object({ label: z.string(), value: z.string() }))
        .default([]),
      cta: z.object({ label: z.string(), href: z.string() }).optional(),
      testflight: z.boolean().default(false),
      is_featured: z.boolean().default(false),
      order: z.number().optional(),
      links: z
        .object({ site: z.string().optional(), repo: z.string().optional() })
        .optional(),
      draft: z.boolean().default(false),
    });

    return project.superRefine((data, ctx) => {
      const withDark = data.screenshots.filter((shot) => shot.dark).length;

      if (withDark > 0 && withDark < data.screenshots.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['screenshots'],
          message:
            'either every screenshot carries a `dark` twin, or none of them does',
        });
      }
    });
  },
});

export const collections = { blog, lists, projects };
