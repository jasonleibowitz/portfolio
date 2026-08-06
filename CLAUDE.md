# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio and blog for Jason Leibowitz (leibowitz.me) — a static **Astro 7** site.
Content is MDX; UI is Astro components styled with **Tailwind 4**. The site ships
**zero JS islands** — no framework runtime, only a few kB of hand-written vanilla
modules. Package manager is **pnpm**; Node **>=22.12**.

## Commands

```bash
pnpm dev           # dev server
pnpm build         # static build to dist/
pnpm preview       # serve the built dist/
pnpm check         # astro check (typecheck .astro + .ts)
pnpm lint          # eslint (flat config, covers .ts/.astro)
pnpm format        # prettier --write .
pnpm format:check  # prettier --check .  (CI gate)
pnpm plop          # scaffold a new blog post
```

There is no test suite. The four gates that must stay green are `build`, `check`, `lint`,
`format:check`. A husky `pre-commit` hook runs `lint-staged` over changed files.

When verifying a change, **check the exit code** — grepping build output for a success string
will silently pass on a failed build.

**None of the four gates render a page.** Layout regressions, dead client-side scripts and
overflow are all invisible to them, so anything visual or interactive has to be checked in a
real browser. See "Verifying the design" below.

## Content architecture

Collections are declared in **`src/content.config.ts`** (Astro 5+ location — _not_
`src/content/config.ts`) using `glob()` loaders:

| Collection | Directory              | Route base  | Required frontmatter                                      |
| ---------- | ---------------------- | ----------- | --------------------------------------------------------- |
| `blog`     | `src/content/blog`     | `/writing`  | `title, pubDate, author, image{url,alt}, tags[]`          |
| `lists`    | `src/content/lists`    | `/lists`    | `title, updated`; then `ranked` + `items[]` or `groups[]` |
| `projects` | `src/content/projects` | `/projects` | `title, description, status, status_text, stack[]`        |

`draft` defaults to `false`. Import zod from `astro/zod` — the `z` re-export from
`astro:content` is deprecated.

A `placeholder: []` array on an entry names the frontmatter fields that are still
awaiting real copy; the templates render those with a dotted underline
(`placeholder-copy`) so the gaps are visible on the page rather than described in a
document. Do not invent replacements — see "Placeholder content" below.

### Reading content: always go through `src/lib/content.ts`

`getPublished(collection)` is the **only** supported way to read publishable content.
It excludes drafts in production builds and sorts each collection by what "most relevant
first" means for it: `blog` by `pubDate`, `lists` by `updated`, `projects` by `order`.

Draft filtering used to live in the index pages alone, which meant `draft: true` posts were
still written to `dist/` and syndicated in `rss.xml` — unlinked rather than unpublished.
Centralising it means a new route cannot opt out by forgetting to filter. **Do not call
`getCollection` directly** in a route.

Drafts render in `pnpm dev` and disappear from `pnpm build`. To verify, check build output
rather than reading code: a draft's slug must not appear anywhere under `dist/`. The espresso
post is currently `draft: true`, so it is a dev-only page.

### Dates are plain days, formatted in UTC

Frontmatter dates have no time or zone, so zod coerces them to UTC midnight. Formatting one
in local time renders the day before anywhere west of Greenwich. Always format through
`formatDay()` in `src/lib/dates.ts`, never `toLocaleDateString` or a local-time formatter.

### URLs and ordering

Posts are named `YYYY-MM-DD-kebab-title.mdx`. The glob loader derives `entry.id` from the
filename, so the date prefix appears in the URL:
`/writing/2023-05-21-so-you-want-to-get-an-espresso-machine/`. Ordering comes from `pubDate`,
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

A post body must start at `##`. The page already renders the title as its `h1`, so a `#`
in the body produces a second one.

MDX bodies can import Astro components — `CaptionedImage` is the one in use.

## Routing

| Route                 | Notes                                                         |
| --------------------- | ------------------------------------------------------------- |
| `/`                   | Hero → At a glance → featured projects                        |
| `/about`              | Bio with a floated photo → Experience → Stack → Beyond the CV |
| `/projects`           | Full-width cards, one per row                                 |
| `/projects/[slug]`    | Case study with a sticky spec rail                            |
| `/writing`            | One list, sticky tag rail that filters in place               |
| `/writing/[...slug]`  | Post: 46rem measure, TOC, progress bar, footnote popovers     |
| `/writing/tags/[tag]` | Tag archive — the filter on the index is not a linkable URL   |
| `/lists`              | Card grid                                                     |
| `/lists/[...slug]`    | Ranked or grouped, with a tag rail                            |

**`/writing` is canonical.** `/blog/*` redirects to it via `redirects` in
`astro.config.mjs`; the old posts have a decade of inbound links. Astro validates redirect
targets against real routes at build time, so a broken redirect fails the build.

- `getStaticPaths` over `getPublished(...)`, `params: { slug: entry.id }`, then
  `render(entry)` from `astro:content` (**not** the removed `entry.render()`).
- `rss.xml.ts` exports **`GET()`** (Astro 3+ renamed it from `get()`).

## Styling

Tailwind 4, configured **in CSS**. There is no `tailwind.config.cjs` and no PostCSS config —
`@tailwindcss/vite` handles the pipeline from `astro.config.mjs`.

`src/styles/global.css` is the whole design system:

- an `@theme` block defining every design token, so they generate real utilities
  (`--color-ink` → `text-ink`/`bg-ink`, `--text-h1` → `text-h1`, `--container-shell` →
  `max-w-shell`);
- `:root[data-theme='dark']` overriding those same custom properties, so utilities
  re-derive in dark mode instead of needing a `dark:` twin for every color;
- `@custom-variant dark` pointed at the same attribute, for the cases that do need one;
- `@utility` blocks for the handful of things with no utility form — `text-gradient`,
  `placeholder-copy`, and `prose` (Markdown output has no classes to hang utilities on).

**Do not add keys to the `--spacing` namespace.** Defining `--spacing-foo` in `@theme`
drops Tailwind's own `--spacing` base, and every numeric `p-*`/`gap-*`/`size-*` utility
silently stops resolving — with an error that points at the wrong file. The design's
`--section` and `--gutter` deliberately live in plain `:root` and are used as
`py-(--section)` / `px-(--gutter)`.

The spacing ladder itself is Tailwind's default: the design's 4/8/12/16/24/32/40/48/64px
steps are exactly `p-1` … `p-16`.

Breakpoints are named after the layout decision they make (`nav:`, `card:`, `rail:`,
`case:`, `bio:`, `hero:`) rather than `sm:`/`md:`/`lg:`.

Component-specific CSS that genuinely isn't a utility — the aurora's stacked radial
gradients, the dock's per-position border radii, the timeline spine — lives in a scoped
`<style>` block in the component that owns it, not in a global file.

Gradient utilities use the v4 names (`bg-linear-100 from-violet to-cyan`, not
`bg-gradient-to-r`).

## Client-side code

Vanilla TypeScript in `src/lib/`, imported from an Astro `<script>`:

- `chrome.ts` — theme toggle, dock scroll-collapse, reading progress, and the tag filter.
  Loaded on every page from `BaseLayout`.
- `filter.ts` — tag filtering. **A page has at most one `[data-filter-root]`.** Rows and
  group headings are scoped to it; the count and empty-state elements are looked up
  page-wide, because on a list page the count sits up in the page header.
- `footnotes.ts` — upgrades GFM footnote references into popovers. Progressive: with JS off
  the anchors and the footnote list still work.

Two things that will bite:

- **`viewTransition.ready` rejects** whenever the browser skips the transition — a hidden
  tab, or a second click mid-transition. The theme has already applied, so it just needs
  `.catch(() => {})` to stay out of the console.
- **A ranked list must not renumber when filtered.** Rank comes from the item's index in the
  data and is written into the markup. `<ol>` numbering or a CSS counter both renumber the
  moment a row above is hidden.

## Verifying the design

- **Measure layout, don't eyeball it.** Compare `document.documentElement.scrollWidth`
  against the viewport at 320/360/390/414/768/1280 in both themes on every page. A 10–20px
  overflow is invisible in a screenshot. Load the page in an iframe of an exact CSS pixel
  width — an iframe establishes its own layout viewport, so it measures what a phone measures.
- **Verify anything client-side in a real browser with the console open.** Note that
  `window.scrollTo()` from a remote eval context does not reliably fire `scroll` events;
  drive real input, or the handlers will look broken when they are fine.
- Controls and chrome are ≥44px. Inline text links inside prose are exempt.
- Grid children need `min-width: 0` and `minmax(0, 1fr)` tracks. The tag rail is a flex row
  of chips; in an auto-sized track it measures to max-content and drags the page ~400px wide
  at a 320px viewport.

## Placeholder content

App pitches, case-study bodies, most list notes and one project's start date are
placeholder, marked with a dotted underline. **Do not invent replacements** — Jason fills
these in. `PhNote` blocks name what is outstanding.

The About bio, the employment record and the "Beyond the CV" numbers have all been filled
in and are no longer placeholder. Accomplishment bullets under Experience are not coming
at all — the resume is where a recruiter reads what a role achieved — so a role that
renders as title and dates alone is finished, not unfinished.

`public/resume.pdf` is the real two-page resume, and the "Download resume" buttons point
at it. It is one click from the About page, so anything the site claims about a title or a
role has to match what the PDF says.

## Conventions

- **Path aliases** (`tsconfig.json`): `@components/*`, `@layouts/*`, `@images/*`, `@styles/*`.
  `src/lib/*` is imported relatively.
- **Images**: `src/images/*` is imported and passed to `<Image>` from `astro:assets`, which
  requires `sharp`. The five portraits went from ~843 kB of PNG to ~26 kB of webp this way.
  Files in `public/` are **not importable** — reference them as URL strings. Importing a
  public path fails the build with `ImageNotFound`.
- **List artwork** goes through the same pipeline. The `lists` schema is a function of
  `({ image })`, so an entry's `image` is a path _relative to its own `.mdx`_ —
  `./artwork/the-matrix.jpg`, with the files alongside the list in `src/content/lists/`.
  A 1 MB source came out at 1 kB (1x) and 3 kB (2x) in the 56px column.

  It deliberately does **not** accept a remote URL. Astro can optimize those too, via
  `image.remotePatterns`, but then every build fetches them and a dead host or a 404 fails
  the deploy. Download the artwork once instead.

- **Icons** come from `astro-icon` (`lucide:*`, `simple-icons:*`), not hand-pasted SVG paths.
  The JL monogram is the exception — it is bespoke, and `public/favicon.svg` is a copy of it
  kept in sync by hand.
- **Component variants** use `tailwind-variants` (`Button`, `Chip`, `Status`, `DeviceFrame`),
  not modifier classes. Import `tv` from `src/lib/tv.ts`, never from the package: its
  class merger reads an unrecognized `text-*` as a text _color_, so `text-ui` cancelled
  the `text-white` beside it and every primary `Button` rendered ink-on-gradient. That
  module names the `@theme` tokens for it, and a token added to `global.css` needs its
  name added there too.
- UI primitives in `src/components/ui/` spread `...rest`, so `data-*` and ARIA attributes
  pass through to the rendered element.
- Prettier: single quotes, semicolons, 2-space, es5 trailing commas, `prettier-plugin-astro`.

## Deployment

Target is **Cloudflare Pages** at leibowitz.me. Until DNS cuts over, the live site is still
served by the separate `jasonleibowitz.github.io` repo — and its apex record points at
deprecated GitHub Pages IPs, so HTTPS is currently broken.
