# leibowitz.me

The personal site and writing archive of Jason Leibowitz: projects, blog posts, lists, and a resume.

It is a static [Astro](https://astro.build) site. Content is MDX across three collections (`blog`, `lists`, `projects`), the UI is Astro components styled with Tailwind 4 configured in CSS, and the whole thing ships **zero JavaScript islands**. There is no framework runtime in the browser, only a few kB of hand-written vanilla modules for the theme toggle, the reading progress bar, the tag filter, and footnote popovers.

Every page also ships a generated 1200x630 share card, drawn at build time by headless Chrome. The site deploys to Cloudflare Workers Static Assets.

Deeper notes on architecture live in [CLAUDE.md](CLAUDE.md); the design system is documented in [DESIGN.md](DESIGN.md).

## Getting started

You need **Node >= 24** (`.nvmrc` pins 24.19.0) and **pnpm**. If you use nvm, `nvm use` picks up the pinned version. The floor is Node 24 because `plopfile.js`, `scripts/og-card.ts` and `scripts/list-artwork.mjs` import TypeScript directly, and Node strips the types for them.

```bash
pnpm install
pnpm dev
```

The dev server runs at `http://localhost:4321`. Drafts are visible there, so a post with `draft: true` renders locally but is excluded from a production build.

One thing to know before your first `pnpm build`: the share-card generator drives your local Chrome through `puppeteer-core`, so **a build needs Chrome installed**. It looks in the usual places and honors a `CHROME_PATH` environment variable if yours lives somewhere unusual. It fails with the list of paths it tried, not a spawn error.

## Commands

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `pnpm dev`          | Dev server at `:4321`. Shows drafts. Does **not** draw share cards. |
| `pnpm start`        | Alias for `pnpm dev`.                                               |
| `pnpm build`        | Draws every share card, then builds the static site to `dist/`.     |
| `pnpm preview`      | Serves the built `dist/` so you can check the real output.          |
| `pnpm cards`        | Draws the share cards **and** the touch icon. See below.            |
| `pnpm check`        | `astro check`. Typechecks `.astro` and `.ts`.                       |
| `pnpm lint`         | ESLint over `.ts` and `.astro`.                                     |
| `pnpm format`       | Prettier, writing changes in place.                                 |
| `pnpm format:check` | Prettier in check mode.                                             |
| `pnpm plop`         | Scaffolds a new blog post. See below.                               |
| `pnpm astro …`      | Passes through to the Astro CLI.                                    |

`build`, `check`, `lint`, and `format:check` are the four gates CI enforces. All four must pass. Check the exit code rather than grepping the output, since a failed build can still print encouraging-looking lines. A husky `pre-commit` hook runs `lint-staged` over changed files.

None of the four gates render a page, so layout regressions, broken client-side scripts, and horizontal overflow are all invisible to them. Anything visual has to be checked in a browser.

### When to run `pnpm cards`

`pnpm build` already draws every share card, so you do not need this before a normal build or deploy. Reach for it in two cases:

1. **After editing `public/favicon.svg`.** The touch icon (`public/apple-touch-icon.png`) is the one image in the repo that is committed rather than built, and a plain `pnpm build` deliberately leaves it alone. `pnpm cards` redraws it from the favicon. Commit the result. You do not have to remember this: CI fails the build when the favicon changed and the icon did not, and the failure names the two commands to run.
2. **To look at a share card locally.** `pnpm dev` never draws them, because a card is only ever fetched by a scraper. This writes them to `public/og/` so you can open one.

Everything under `public/og/` is gitignored and redrawn from current content on every build, so a card can never be older than the post it describes.

### Creating a post

```bash
pnpm plop blog-post "Post Title" "Short description" "tag1,tag2"
```

That writes `src/content/blog/<today>-<dash-case-title>.mdx` with `draft: true` and a placeholder image. Replace the image before publishing; the share card needs no attention, since the build draws it. Post bodies start at `##`, because the page already renders the title as its `h1`.
