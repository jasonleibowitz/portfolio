# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio and blog for Jason Leibowitz (leibowitz.me) — a static Astro 2 site
deployed to Netlify. Content is MDX; UI is Astro components with Tailwind, plus one React
island. Package manager is **pnpm**.

## Commands

```bash
pnpm dev          # dev server (astro dev)
pnpm build        # static build to dist/
pnpm preview      # serve the built dist/
pnpm lint         # eslint --ext .js,.astro src   (note: does NOT cover .ts/.tsx)
pnpm prettier     # format everything in place
pnpm plop         # scaffold a new blog post (see below)
```

There is no test suite. A husky `pre-commit` hook runs `lint-staged`: eslint on `*.{js,astro}`
and prettier on `*.{js,css,md}`.

## Content architecture

Two Astro content collections, both defined in `src/content/config.ts`:

| Collection | Directory           | Route base | Required frontmatter                                    |
| ---------- | ------------------- | ---------- | ------------------------------------------------------- |
| `blog`     | `src/content/blog`  | `/blog`    | `title, pubDate, author, image{url,alt}, tags[], draft` |
| `lists`    | `src/content/lists` | `/lists`   | `title, pubDate, draft`                                 |

Zod validation is strict — a post missing `image` or `draft` fails the build.

**Filenames drive both URL and ordering.** Posts are named `YYYY-MM-DD-kebab-title.mdx`, so
the slug (and therefore the URL) contains the date: `/blog/2023-05-21-so-you-want-to-get-an-espresso-machine`.
`src/pages/blog/index.astro` orders posts by calling `.reverse()` on `getCollection` output
rather than sorting on `pubDate` — that only yields newest-first because the date-prefixed
filenames sort alphabetically. Keep the naming convention or ordering breaks.

**Drafts** (`draft: true`) are rendered in dev and hidden only when `import.meta.env.PROD`.
Draft filtering lives in the index pages; `[...slug].astro` and `rss.xml.ts` do not filter,
so a draft is still reachable by direct URL in production.

**Post images** live in `public/blog-images/YYYY-MM-DD/` matching the post's date prefix, and
are referenced by absolute path (`/blog-images/2023-05-21/foo.png`).

### Creating a post

`pnpm plop` → "blog-post" generates `src/content/blog/<today>-<dash-case-title>.mdx` from
`plop-templates/blog-post.mdx.hbs` with `draft: true` and a placeholder image. Replace the
placeholder image before publishing.

MDX bodies can import Astro components — `CaptionedImage` is the one used in practice:

```mdx
import CaptionedImage from '@components/CaptionedImage.astro';

;
```

## Layouts and routing

Layouts nest rather than duplicate:

- `BaseLayout.astro` — html shell + `Header`; used by most pages.
- `FooterLayout.astro` — parallel shell that adds `Footer` (does not reuse `BaseLayout`).
- `MarkdownPostLayout.astro` → wraps `BaseLayout`; renders a single post with `@tailwindcss/typography`
  `prose` classes, formatted `pubDate`, reading time, and `TagList`.
- `ContentListLayout.astro` → wraps `BaseLayout`; shared list page for both collections, taking
  `items` + `baseUrl` so `/blog` and `/lists` render identically.
- `main.astro` is legacy and unused.

Both `blog` and `lists` share the same `[...slug].astro` shape: `getStaticPaths` over the
collection, `entry.render()`, `reading-time` on `entry.body`, into `MarkdownPostLayout`.

Two tag routes exist — `/blog/tags/[tag]` (the one `TagList` and `BlogPost` link to) and an
older duplicate at `/tags/[tag]`. Prefer the `/blog/tags` route.

`src/pages/rss.xml.ts` uses the Astro 2 endpoint API (`export async function get()`), not the
`GET` export of Astro 3+.

## Conventions

- **Path aliases** (`tsconfig.json`): `@components/*`, `@layouts/*`, `@images/*`, `@styles/*`.
  `src/types/*` has no alias and is imported as `src/types/Post`.
- **Images**: `src/images/*` is imported through the `@images` alias and processed by Astro;
  `public/*` is referenced by absolute URL string. The React island imports from `/headshot.png`
  etc., which resolve against `public/`.
- **React islands** are the exception, not the default — only `HeadshotSocialLinks` (with
  `client:load`) exists. Write new UI as `.astro` unless it needs client-side state.
- **Styling** is Tailwind utility classes inline. Global element defaults and the `.logo` /
  `.nav-link` component classes live in `src/styles/global.css`, which uses PostCSS nesting.
- Prettier: single quotes, semicolons, 2-space, es5 trailing commas, `prettier-plugin-astro`.
