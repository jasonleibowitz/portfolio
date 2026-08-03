# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio and blog for Jason Leibowitz (leibowitz.me) — a static **Astro 7** site.
Content is MDX; UI is Astro components with **Tailwind 4**, plus one React island.
Package manager is **pnpm**; Node **>=22.12**.

## Commands

```bash
pnpm dev           # dev server
pnpm build         # static build to dist/
pnpm preview       # serve the built dist/
pnpm check         # astro check (typecheck .astro + .ts)
pnpm lint          # eslint (flat config, covers .ts/.tsx/.astro)
pnpm format        # prettier --write .
pnpm format:check  # prettier --check .  (CI gate)
pnpm plop          # scaffold a new blog post
```

There is no test suite. The four gates that must stay green are `build`, `check`, `lint`,
`format:check`. A husky `pre-commit` hook runs `lint-staged` over changed files.

When verifying a change, **check the exit code** — grepping build output for a success string
will silently pass on a failed build.

## Content architecture

Collections are declared in **`src/content.config.ts`** (Astro 5+ location — _not_
`src/content/config.ts`) using `glob()` loaders:

| Collection | Directory           | Route base | Required frontmatter                             |
| ---------- | ------------------- | ---------- | ------------------------------------------------ |
| `blog`     | `src/content/blog`  | `/blog`    | `title, pubDate, author, image{url,alt}, tags[]` |
| `lists`    | `src/content/lists` | `/lists`   | `title, pubDate`                                 |

`draft` defaults to `false`. Import zod from `astro/zod` — the `z` re-export from
`astro:content` is deprecated.

### Reading content: always go through `src/lib/content.ts`

`getPublished(collection)` is the **only** supported way to read publishable content.
It excludes drafts in production builds and sorts by `pubDate` descending.

Draft filtering used to live in the index pages alone, which meant `draft: true` posts were
still written to `dist/` and syndicated in `rss.xml` — unlinked rather than unpublished.
Centralising it means a new route cannot opt out by forgetting to filter. **Do not call
`getCollection` directly** in a route.

Drafts render in `pnpm dev` and disappear from `pnpm build`. To verify, check build output
rather than reading code: a draft's slug must not appear anywhere under `dist/`.

### URLs and ordering

Posts are named `YYYY-MM-DD-kebab-title.mdx`. The glob loader derives `entry.id` from the
filename, so the date prefix appears in the URL:
`/blog/2023-05-21-so-you-want-to-get-an-espresso-machine/`. Ordering comes from `pubDate`,
not the filename — renaming a file changes its URL but not its position.

Post images live in `public/blog-images/YYYY-MM-DD/` and are referenced by absolute path.

### Creating a post

`pnpm plop blog-post` — or non-interactively:

```bash
pnpm plop blog-post "Post Title" "Short description" "tag1,tag2"
```

Generates `src/content/blog/<today>-<dash-case-title>.mdx` with `draft: true` and a
placeholder image. Replace the placeholder before publishing.

`plop-templates/` is in `.prettierignore` on purpose: Prettier rewrites `{{ expr }}` into
`{ { expr } }`, which breaks the generator silently.

MDX bodies can import Astro components — `CaptionedImage` is the one in use.

## Routing

- `[...slug].astro` for both collections: `getStaticPaths` over `getPublished(...)`,
  `params: { slug: entry.id }`, then `render(entry)` from `astro:content`
  (**not** the removed `entry.render()`).
- `/blog/tags/[tag]` — tag archives, built from `getPublishedTags()`.
- `rss.xml.ts` exports **`GET()`** (Astro 3+ renamed it from `get()`).

Layouts nest: `MarkdownPostLayout` and `ContentListLayout` both wrap `BaseLayout`.
`ContentListLayout` serves both collections via `items` + `baseUrl`, typed as
`CollectionEntry<'blog' | 'lists'>` — guard with `'tags' in item.data` since `lists`
entries have no tags.

## Styling

Tailwind 4 is configured **in CSS**, not a JS config file. `src/styles/global.css` holds
`@import 'tailwindcss'`, `@plugin '@tailwindcss/typography'`, and a `@theme` block for the
font family. There is no `tailwind.config.cjs` and no PostCSS config — `@tailwindcss/vite`
handles the pipeline from `astro.config.mjs`.

Gradient utilities use the v4 names (`bg-linear-to-r`, not `bg-gradient-to-r`).

## Conventions

- **Path aliases** (`tsconfig.json`): `@components/*`, `@layouts/*`, `@images/*`, `@styles/*`.
  `src/lib/*` is imported relatively.
- **Images**: `src/images/*` is imported and passed to `<Image>` from `astro:assets`, which
  requires `sharp` and cuts the About hero from 2.8 MB to ~76 kB. Files in `public/` are
  **not importable** — reference them as URL strings (`'/headshot.png'`). Importing a public
  path fails the build with `ImageNotFound`.
- **React islands** are the exception — only `HeadshotSocialLinks` (`client:load`).
  Write new UI as `.astro` unless it needs client-side state.
- Prettier: single quotes, semicolons, 2-space, es5 trailing commas, `prettier-plugin-astro`.

## Deployment

Target is **Cloudflare Pages** at leibowitz.me. Until DNS cuts over, the live site is still
served by the separate `jasonleibowitz.github.io` repo — and its apex record points at
deprecated GitHub Pages IPs, so HTTPS is currently broken.
