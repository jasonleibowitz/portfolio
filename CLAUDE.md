# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal portfolio and blog for Jason Leibowitz (leibowitz.me) — a static **Astro 7** site. Content is MDX; UI is Astro components styled with **Tailwind 4**. The site ships **zero JS islands** — no framework runtime, only a few kB of hand-written vanilla modules. Package manager is **pnpm**; Node **>=22.12**.

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

There is no test suite. The four gates that must stay green are `build`, `check`, `lint`, `format:check`. A husky `pre-commit` hook runs `lint-staged` over changed files.

When verifying a change, **check the exit code** — grepping build output for a success string will silently pass on a failed build.

**None of the four gates render a page.** Layout regressions, dead client-side scripts and overflow are all invisible to them, so anything visual or interactive has to be checked in a real browser. See "Verifying the design" below.

## Content architecture

Collections are declared in **`src/content.config.ts`** (Astro 5+ location — _not_ `src/content/config.ts`) using `glob()` loaders:

| Collection | Directory              | Route base  | Required frontmatter                                      |
| ---------- | ---------------------- | ----------- | --------------------------------------------------------- |
| `blog`     | `src/content/blog`     | `/writing`  | `title, pubDate, author, image{url,alt}, tags[]`          |
| `lists`    | `src/content/lists`    | `/lists`    | `title, updated`; then `ranked` + `items[]` or `groups[]` |
| `projects` | `src/content/projects` | `/projects` | `title, description, status, status_text, stack[]`        |

`draft` defaults to `false`. Import zod from `astro/zod` — the `z` re-export from `astro:content` is deprecated.

A `placeholder: []` array on an entry names the frontmatter fields that are still awaiting real copy; the templates render those with a dotted underline (`placeholder-copy`) so the gaps are visible on the page rather than described in a document. Do not invent replacements — see "Placeholder content" below.

### Reading content: always go through `src/lib/content.ts`

`getPublished(collection)` is the **only** supported way to read publishable content. It excludes drafts in production builds and sorts each collection by what "most relevant first" means for it: `blog` by `pubDate`, `lists` by `updated`, `projects` by `order`.

Draft filtering used to live in the index pages alone, which meant `draft: true` posts were still written to `dist/` and syndicated in `rss.xml` — unlinked rather than unpublished. Centralising it means a new route cannot opt out by forgetting to filter. **Do not call `getCollection` directly** in a route.

Drafts render in `pnpm dev`, and in a build that sets `SHOW_DRAFTS=true` — which pull request previews do, so an unpublished post can be reviewed in the real design rather than only at `localhost`. Every other build excludes them. To verify, check build output rather than reading code: a draft's slug must not appear anywhere under `dist/`.

`SHOW_DRAFTS` is a plain `process.env` read, as is `SITE_URL` in `astro.config.mjs`. Astro's typed `astro:env` schema would work for `SHOW_DRAFTS` and was tried, but `SITE_URL` cannot use it — that value configures Astro itself, before `astro:env` exists — so the schema bought one of the two a type and left the pair inconsistent. `process.env` in `src/` typechecks under `astro check` without extra Node globals; this was verified, not assumed.

### Dates are plain days, formatted in UTC

Frontmatter dates have no time or zone, so zod coerces them to UTC midnight. Formatting one in local time renders the day before anywhere west of Greenwich. Always format through `formatDay()` in `src/lib/dates.ts`, never `toLocaleDateString` or a local-time formatter.

### URLs and ordering

Posts are named `YYYY-MM-DD-kebab-title.mdx`. The glob loader derives `entry.id` from the filename, so the date prefix appears in the URL: `/writing/2023-05-21-so-you-want-to-get-an-espresso-machine/`. Ordering comes from `pubDate`, not the filename — renaming a file changes its URL but not its position.

Post images live in `public/blog-images/YYYY-MM-DD/` and are referenced by absolute path.

### Creating a post

`pnpm plop blog-post` — or non-interactively:

```bash
pnpm plop blog-post "Post Title" "Short description" "tag1,tag2"
```

Generates `src/content/blog/<today>-<dash-case-title>.mdx` with `draft: true` and a placeholder image. Replace the placeholder before publishing.

`plop-templates/` is in `.prettierignore` on purpose: Prettier rewrites `{{ expr }}` into `{ { expr } }`, which breaks the generator silently.

A post body must start at `##`. The page already renders the title as its `h1`, so a `#` in the body produces a second one.

### Images in a post body

An image alone in a paragraph renders as a `<figure>`, and an italic line in the paragraph directly below it becomes its `<figcaption>`:

```markdown
![Alt text](/blog-images/2023-05-21/jura-z10.jpg)

_Jura Z10 [(Image Credit Jura USA)](https://us.jura.com/en/homeproducts/machines/Z10-Diamond-Black-NAA-15464)_
```

`plugins/remark-figure.ts` does this. It is registered through `markdown.processor: unified({ remarkPlugins: [...] })` from `@astrojs/markdown-remark`, because `markdown.remarkPlugins` is deprecated in Astro 7 and warns on every run of `astro check`. `markdown.shikiConfig` is not deprecated and stays where it is. The caption line is ordinary markdown, so an attribution link needs no markup of its own, and the emphasis is dropped from the output: `figcaption` already carries the design's caption style. An image with no caption line still becomes a `<figure>`, which is what gives every image in a post the same width, radius and shadow.

It replaced a `CaptionedImage.astro` component with an object-valued `attribution` prop. The point of the rule is that **a post body is plain markdown**: no imports, and nothing an editor would need a JSX plugin to open. Reach for a component in a body only when there is no way to express the thing in markdown, and expect to be asked why.

The exception, and it is a real one: two posts still carry embeds written as raw HTML, a YouTube `<iframe>` and two Twitter blockquotes with their widget `<script>`. MDX parses those as JSX. Nothing else in `src/content/blog` does.

## Routing

| Route                 | Notes                                                         |
| --------------------- | ------------------------------------------------------------- |
| `/`                   | Hero → At a glance → featured projects                        |
| `/about`              | Bio with a floated photo → Experience → Stack → Beyond the CV |
| `/projects`           | Full-width cards, one per row                                 |
| `/projects/[slug]`    | Project write-up with a sticky spec rail                      |
| `/writing`            | One list, sticky tag rail that filters in place               |
| `/writing/[...slug]`  | Post: 46rem measure, TOC, progress bar, footnote popovers     |
| `/writing/tags/[tag]` | Tag archive — the filter on the index is not a linkable URL   |
| `/lists`              | Card grid                                                     |
| `/lists/[...slug]`    | Ranked or grouped, with a tag rail                            |

**`/writing` is canonical.** `/blog/*` redirects to it via `redirects` in `astro.config.mjs`; the old posts have a decade of inbound links. Astro validates redirect targets against real routes at build time, so a broken redirect fails the build.

- `getStaticPaths` over `getPublished(...)`, `params: { slug: entry.id }`, then `render(entry)` from `astro:content` (**not** the removed `entry.render()`).
- `rss.xml.ts` exports **`GET()`** (Astro 3+ renamed it from `get()`).

## Styling

Tailwind 4, configured **in CSS**. There is no `tailwind.config.cjs` and no PostCSS config — `@tailwindcss/vite` handles the pipeline from `astro.config.mjs`.

`src/styles/` is the whole design system. `global.css` is the entry point and holds nothing but imports; Tailwind bundles the rest itself, so the split is only about where a thing is easiest to find:

| File              | What's in it                                                           |
| ----------------- | ---------------------------------------------------------------------- |
| `theme.css`       | `@theme` tokens, the `dark` variant, `:root` dark overrides, keyframes |
| `base.css`        | `@layer base`, the rules that apply before any class does              |
| `utilities.css`   | the `@utility` blocks, and the one `@property` registration            |
| `content.css`     | rendered Markdown, Shiki code blocks, remark's footnotes               |
| `transitions.css` | the circular sweep between themes                                      |

Two things to know about how the tokens work:

- an `@theme` token generates a real utility (`--color-ink` → `text-ink`/`bg-ink`, `--text-h1` → `text-h1`, `--container-page` → `max-w-page`), so nothing below should be reached for as `var(--…)` from markup;
- `:root[data-theme='dark']` overrides those same custom properties, so every utility re-derives in dark mode instead of needing a `dark:` twin for each color. `@custom-variant dark` points at the same attribute for the cases that do need one.

The `@utility` blocks are `text-gradient`, `shadow-lift`, `spectrum-fill`, `aurora-field`, `placeholder-copy` and `markdown`. A utility has to live in a Tailwind-processed CSS file, so it cannot sit beside the component that uses it, even when only one component does.

**Clearing a `@theme` namespace deletes utilities silently.** `--radius-*: initial` drops Tailwind's seven default radii so only the design's four exist, which is deliberate — but a leftover `rounded-lg` then generates _nothing_ rather than failing, and the element loses its corner with a green build. The same is true of any namespace you clear. Grep for the old names after clearing one.

**Adding to the `--spacing` namespace is fine; clearing it is not.** `--spacing-header: 88px` in `@theme` generates `scroll-mt-header` and `top-header` and leaves Tailwind's `--spacing` base intact — verified on 4.3.3 by building with and without the key and confirming every numeric `p-*`/`gap-*`/`size-*` utility still resolved. Clearing a namespace does delete utilities silently, which is what `--radius-*: initial` above does on purpose. An earlier note here banned adding as well; if numeric spacing utilities ever stop resolving, this is the first place to look.

The design's `--section` and `--gutter` still live in plain `:root`, used as `py-(--section)` / `px-(--gutter)`, because they are page rhythm rather than a step on a scale. Nothing should generate a `p-section` utility.

The spacing ladder itself is Tailwind's default: the design's 4/8/12/16/24/32/40/48/64px steps are exactly `p-1` … `p-16`.

Breakpoints are named after the layout decision they make (`nav:`, `card:`, `rail:`, `spec:`, `bio:`, `hero:`) rather than `sm:`/`md:`/`lg:`.

### Tailwind is the styling system

Utilities are how things get styled. Between arbitrary values (`[corner-shape:squircle]`), arbitrary variants (`data-[active]:opacity-100`), pseudo-element variants (`after:content-['']`), and child/descendant variants (`*:`, `**:`), Tailwind reaches essentially everything — including pseudo-elements and JS-driven state.

**A `<style>` block is for CSS that isn't a style at all.** In practice that means an `@property` registration or a `@keyframes` definition, which live in `utilities.css` and `theme.css` rather than in a component. If you are reaching for `<style>` to _style_ something, the answer is a utility, an `@utility`, or a component. Every component that had a style block has since been converted; there are none left, and a new one needs a reason that fits the sentence above.

**Express runtime state as a `data-*` attribute, never a toggled class.** `data-*` variants work out of the box, and a class attribute that means both "what this looks like" and "what state it is in" is what forces styling into CSS to reach it. Prefer a built-in variant (`aria-pressed:`, `data-open:`) over brackets; check before hand-writing one.

**Name anything that repeats.** A literal appearing twice becomes an `@theme` token; a bundle of declarations appearing twice becomes an `@utility` or a `tailwind-variants` component. One use may stay an arbitrary value. This threshold is what the type scale and `--ease-orbit` came from: the easing curve was written out ten times before it had a name.

A token added to `@theme` needs its name added to `src/lib/tv.ts` too, or the class merger reads it as a color and cancels the one beside it.

Gradient utilities use the v4 names (`bg-linear-100 from-violet to-cyan`, not `bg-gradient-to-r`).

## Client-side code

Vanilla TypeScript in `src/lib/`, imported from an Astro `<script>`:

- `chrome.ts` — theme toggle, dock scroll-collapse, reading progress, and the tag filter. Loaded on every page from `BaseLayout`.
- `filter.ts` — tag filtering. **A page has at most one `[data-filter-root]`.** Rows and group headings are scoped to it; the count and empty-state elements are looked up page-wide, because on a list page the count sits up in the page header.
- `footnotes.ts` — upgrades GFM footnote references into popovers. Progressive: with JS off the anchors and the footnote list still work.

Two things that will bite:

- **`viewTransition.ready` rejects** whenever the browser skips the transition — a hidden tab, or a second click mid-transition. The theme has already applied, so it just needs `.catch(() => {})` to stay out of the console.
- **A ranked list must not renumber when filtered.** Rank comes from the item's index in the data and is written into the markup. `<ol>` numbering or a CSS counter both renumber the moment a row above is hidden.

## Verifying the design

- **Measure layout, don't eyeball it.** Compare `document.documentElement.scrollWidth` against the viewport at 320/360/390/414/768/1280 in both themes on every page. A 10–20px overflow is invisible in a screenshot. Load the page in an iframe of an exact CSS pixel width — an iframe establishes its own layout viewport, so it measures what a phone measures.
- **Verify anything client-side in a real browser with the console open.** Note that `window.scrollTo()` from a remote eval context does not reliably fire `scroll` events; drive real input, or the handlers will look broken when they are fine.
- Controls and chrome are ≥44px. Inline text links inside prose are exempt.
- Grid children need `min-width: 0` and `minmax(0, 1fr)` tracks. The tag rail is a flex row of chips; in an auto-sized track it measures to max-content and drags the page ~400px wide at a 320px viewport.

## Placeholder content

App pitches and case-study bodies are placeholder, marked with a dotted underline by `Ph`. **Do not invent replacements** — Jason fills these in. The mark on each paragraph is the whole signal: `PhNote` was deleted, and so was the page-level note that summarised them. Do not reinstate a summary. It can only repeat what the underlines already show, or contradict them the day a real paragraph is written.

**The two `Started` dates in project frontmatter are still provisional, and are the one placeholder the page does not mark.** `Fact` has no `ph` prop and `specs[]` has no `placeholder` field, so those rows render as fact. This is deliberate: the marker was removed rather than the values corrected, and Jason corrects them before the site goes live. Do not reinstate the prop to flag them, and do not guess the real dates.

List entries no longer carry a stub note. `note` is optional, and an entry without one renders as name, tags and artwork — so the way to add a note is to write a real one, not to reinstate a placeholder.

The About bio, the employment record and the "Beyond the CV" numbers have all been filled in and are no longer placeholder. Accomplishment bullets under Experience are not coming at all — the resume is where a recruiter reads what a role achieved — so a role that renders as title and dates alone is finished, not unfinished.

`public/resume.pdf` is the real two-page resume, and the "Download resume" buttons point at it. It is one click from the About page, so anything the site claims about a title or a role has to match what the PDF says.

## Conventions

- **Never use an em dash (`—`) in user-facing copy.** It reads as AI-written. Use a comma, a period, or parentheses; use an en dash (`–`) only for a numeric or date range. This covers page copy, headings, meta descriptions, frontmatter `description` and `note` fields, button labels, and any string rendered to the page. Code comments are exempt. Published blog post bodies are left as written.
- **Do not hard-wrap prose in a `.md` file.** A paragraph is one line, and Prettier enforces it: `proseWrap: 'never'` with `printWidth: 120`, in an override in `prettier.config.mjs`. A fixed column wrap re-flows a whole paragraph when one word changes, and the real change then hides inside six changed lines. The width no longer touches prose at all; it only sets how wide a table may align before Prettier collapses it to one space per column, which is what 80 did. The override is `*.md` and deliberately not `*.mdx`: `proseWrap` also joins a folded block scalar in YAML, and in MDX the print width decides where a raw HTML block breaks, which decides how MDX parses it. The same tweet embed renders with its date link inside or outside the attribution paragraph. That was measured by diffing `dist/` before and after, not assumed.
- **Path aliases** (`tsconfig.json`): `@components/*`, `@layouts/*`, `@lib/*`, `@images/*`, `@styles/*`. Everything under `src/` is imported through one, so no import counts `../` to work out where it is. The exception is a file inside `src/lib/` importing a sibling, which stays `./`. Aliases resolve in client `<script>` blocks too, so `chrome.ts` and `footnotes.ts` are imported the same way as anything else.
- **Images**: `src/images/*` is imported and passed to `<Image>` from `astro:assets`, which requires `sharp`. The five portraits went from ~843 kB of PNG to ~26 kB of webp this way. Files in `public/` are **not importable** — reference them as URL strings. Importing a public path fails the build with `ImageNotFound`.
- **List artwork** goes through the same pipeline. The `lists` schema is a function of `({ image })`, so an entry's `image` is a path _relative to its own `.mdx`_ — `./artwork/the-matrix.jpg`, with the files alongside the list in `src/content/lists/`. A 1 MB source came out at 1 kB (1x) and 3 kB (2x) in the 56px column.

  It deliberately does **not** accept a remote URL. Astro can optimize those too, via `image.remotePatterns`, but then every build fetches them and a dead host or a 404 fails the deploy. Download the artwork once instead.

- **Icons** come from `astro-icon` (`lucide:*`, `simple-icons:*`), not hand-pasted SVG paths. The JL monogram is the exception — it is bespoke, and `public/favicon.svg` is a copy of it kept in sync by hand.
- **Component variants** use `tailwind-variants` (`Button`, `Chip`, `Status`, `DeviceFrame`), not modifier classes. Import `tv` from `src/lib/tv.ts`, never from the package: its class merger reads an unrecognized `text-*` as a text _color_, so `text-ui` cancelled the `text-white` beside it and every primary `Button` rendered ink-on-gradient. That module names the `@theme` tokens for it, and a token added to `theme.css` needs its name added there too.
- UI primitives in `src/components/ui/` spread `...rest`, so `data-*` and ARIA attributes pass through to the rendered element.
- Prettier: single quotes, semicolons, 2-space, es5 trailing commas, `prettier-plugin-astro`.

## Deployment

Target is **Cloudflare Workers Static Assets** at leibowitz.me, not Cloudflare Pages. Pages was the original decision; Workers is where Cloudflare's feature work goes, its config lives in a tracked file rather than a dashboard, and `wrangler versions upload` publishes a build without deploying it, which is what a per-PR preview needs.

Until DNS cuts over, the live site is still served by the separate `jasonleibowitz.github.io` repo — and its apex record points at deprecated GitHub Pages IPs, so HTTPS is currently broken. **DNS is most of what holds production back, but not all of it:** the staging job also overrides `SITE_URL` and runs `scripts/noindex.mjs`, and neither belongs in a production build. Everything below is already live on `*.workers.dev`.

`wrangler.jsonc` declares one Worker, `portfolio`, serving `dist/` with no `main` — there is no Worker script, so every request is a static asset request, which Cloudflare does not bill.

### What deploys where

| Trigger        | Command                                           | URL                                        |
| -------------- | ------------------------------------------------- | ------------------------------------------ |
| Pull request   | `wrangler versions upload --preview-alias pr-<n>` | `pr-<n>-portfolio.<subdomain>.workers.dev` |
| Push to `main` | `wrangler deploy`                                 | `portfolio.<subdomain>.workers.dev`        |

A preview is a **version** of the one Worker reached through an alias, not a separate environment. Nothing is provisioned per branch, so nothing needs tearing down — and nothing can be: Cloudflare has no API to delete an alias, only LRU eviction past 1,000 of them.

Both jobs `needs: verify`, so a build that fails any of the four gates never produces a URL. Both run `scripts/noindex.mjs`, which writes `dist/_headers` with `X-Robots-Tag: noindex, nofollow`. That file is generated rather than committed to `public/` on purpose: a committed copy would ship to production and suppress the real site.

**A preview URL serves `X-Robots-Tag: noindex`, not the `noindex, nofollow` in `_headers`.** Cloudflare sets its own header on preview URLs and it wins. The staging deployment does serve the full value, which is how the two were told apart. Nothing is broken and the file needs no "fix" — checking a preview's headers and finding one directive missing is expected.

**Cloudflare edge-caches a preview response.** A URL can still serve the previous build for a while after a green deploy. Append a query string (`?cb=1`) to see the new one. A preview that looks like it did not pick up the last commit is usually this, not a broken upload.

### Why the preview build is not the production build

Two env vars make a preview deliberately differ, which is why the deploy jobs rebuild instead of reusing `verify`'s `dist/`:

- **`SITE_URL`** overrides `site` in `astro.config.mjs`. Left at `https://leibowitz.me`, the canonical tag, `og:image` and every RSS link would point at a domain still serving the old site. CI can compute the value before building because the alias is deterministic.
- **`SHOW_DRAFTS`** (an `astro:env` boolean, default false) makes `getPublished` return drafts. Set on pull request previews only, so an unpublished post can be reviewed in the real design and shared. Staging leaves it off and shows exactly the published set.

### Setup this depends on

Repo secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, and the repo **variable** `CF_WORKERS_SUBDOMAIN` (the `<subdomain>` in the table above, currently `jasonaleibowitz`). It is a variable rather than a secret because it is baked into the built `site` value; without it the workflow builds a URL with an empty segment that will not resolve.

The token carries `Workers Scripts: Edit` plus read on `Account Settings`, `User Details` and `Memberships`. Cloudflare's "Edit Cloudflare Workers" template grants far more (KV, R2, Pages, Containers, Observability), which a static site never touches, and its `Zone: Workers Routes` entry cannot even be saved while the account has no zone. Routes matter at DNS cutover, not before.

**`wrangler versions upload` cannot create a Worker.** It fails with "You cannot upload a new version of a Worker that does not yet exist", so a brand new Worker has to be created by one `wrangler deploy` before any preview can upload. This is undocumented and was found by hitting it. It is a one-time bootstrap, already done for `portfolio` — but it repeats for any new Worker, and it means the `preview` job cannot be the first thing that ever runs.

A freshly created `workers.dev` subdomain takes a few minutes to resolve in DNS. A preview URL returning `Could not resolve host` immediately after the account's first deploy is propagation, not a broken build.
