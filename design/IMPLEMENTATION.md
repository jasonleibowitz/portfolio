# Build brief — leibowitz.me redesign

**Decision:** direction **D3 "Orbit", revision 2**. Chosen from three directions
(issue #7). This document is the handoff for whoever builds it.

**The spec is the mockup, not this file.** `design/mockups/d3-orbit-v2.html` is a
single self-contained HTML file containing every screen in both themes with all
interactions working. When this document and the mockup disagree, the mockup
wins.

```bash
cd design/mockups && python3 -m http.server 8899
# http://localhost:8899/d3-orbit-v2.html
# screens: ?page=home|projects|case|writing|post|lists|list|ranked|about|spec
# themes:  &theme=light|dark
```

`?page=spec` inside the mockup lists the tokens and the reasoning behind them.
`design/mockups/index.html` is a before/after harness against the version that
was chosen from. `design/mockups/MEASUREMENTS.md` records how it was verified
and every bug that verification caught.

---

## 1. Foundations

**Fonts** — replace Noto Sans.

| Role               | Family               | Package                              |
| ------------------ | -------------------- | ------------------------------------ |
| Display, headings  | Space Grotesk (700)  | `@fontsource-variable/space-grotesk` |
| Body, UI           | Inter (400/500/600)  | `@fontsource-variable/inter`         |
| Labels, meta, code | JetBrains Mono (400) | `@fontsource/jetbrains-mono`         |

The mockup uses system fallbacks. **Real webfonts will shift line breaks**, so
re-run the overflow measurements once fonts are wired.

**Tokens** go in `src/styles/global.css` inside the existing `@theme` block —
Tailwind 4 is configured in CSS, there is no `tailwind.config.cjs`. Copy the
`:root` and `:root[data-theme='dark']` blocks from the top of the mockup
verbatim; they are the source of truth for palette, type scale, spacing and
radii.

**Dark mode** — currently half-built and unreachable: `html.dark` styles exist in
`global.css` and nothing ever sets that class. Delete them and replace with:

- `data-theme` on `<html>`, set by a **blocking inline script in `<head>`** —
  `localStorage` first, then `prefers-color-scheme`. Blocking is the point;
  deferring it flashes white on every navigation of a static site.
- `@custom-variant dark (&:where([data-theme=dark] *))` so Tailwind's `dark:`
  utilities drive off the same attribute.

**Delete on sight:** both gradients (`orange→rose` logo, `purple→blue` nav
hover), the fixed `w-64` / `h-40`, `float-right` on About, and the bare `prose`
defaults.

---

## 2. Chrome

**Header** — JL monogram (inline SVG, gradient squircle; also the favicon at
32px), wordmark, nav, theme toggle. Sticky, translucent, blurred.

**Nav IA** — `Home · About · Projects · Writing · Lists`, in that order, in the
header, the mobile dock and the footer.

**Theme toggle** — sun/moon cross-fade plus a circular reveal from the button
using the View Transitions API, falling back to an instant swap. See §5 for the
one gotcha.

**Mobile dock** — floating glass capsule, five tabs, collapses to icons on scroll
down and expands on scroll up. Active tab is a **flush** gradient chip: the dock
has no padding and the first/last tabs take the capsule's own end cap via
per-position `border-radius`, so no dock colour shows around the active item.
This was chosen deliberately over an Apple-style inset tinted chip.

**Footer** — nav links, a complete social icon row (GitHub, LinkedIn, Twitter,
Instagram, RSS — not a subset), and `© 2026 · Made with ❤️ in NYC` on the same
line as the links. `Footer.astro` is currently orphaned and its `h-40` gradient
does not survive; rebuild it.

---

## 3. Content model

### New: `projects` collection

```ts
// src/content.config.ts — note: zod from 'astro/zod', not astro:content
const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    status: z.enum(['building', 'beta', 'live']),
    stack: z.array(z.string()),
    is_featured: z.boolean().default(false), // ← homepage shows only these
    order: z.number().optional(),
    links: z
      .object({ site: z.string().optional(), repo: z.string().optional() })
      .optional(),
    draft: z.boolean().default(false),
  }),
});
```

Three projects today: **Winnie the Poo Tracker** and **Reel Watch** are
`is_featured: true`; **leibowitz.me** is not — it appears on `/projects` only.

### Changed: `lists` collection

Two list types, both rendered by one template:

```yaml
title: Favourite Movies
updated: 2026-08-01 # shown on the index card and the detail header
ranked: true # numbered, no groups
items:
  - name: Film 1
    href: https://… # OPTIONAL — see §5
    image: /list-images/… # optional; falls back to an initials tile
    note: One line on why.
    tags: [sci-fi, 90s] # 1+ tags, filterable
# or, unranked:
ranked: false
groups:
  - name: News
    items: [...]
```

### Reading content

`getPublished()` in `src/lib/content.ts` is the **only** supported way to read
publishable content — do not call `getCollection` directly in a route. Extend it
for `projects`.

---

## 4. Routes

| Route                | Notes                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| `/`                  | Résumé scroll: hero → At a glance → What I'm building (featured only) |
| `/about`             | Bio with a floated photo → Experience → Stack → Beyond the CV         |
| `/projects`          | Full-width cards, one per row                                         |
| `/projects/[slug]`   | Case study, sticky spec rail on desktop                               |
| `/writing`           | One list, no year grouping; sticky tag rail filters in place          |
| `/writing/[...slug]` | Post: 46rem measure, TOC, progress bar, tag chips, footnote popovers  |
| `/lists`             | Card grid                                                             |
| `/lists/[...slug]`   | Ranked or grouped; tag rail filter                                    |

Existing routes are `/blog` and `/lists`. **`/writing` is the canonical path** —
rename, and redirect `/blog/*` so the existing posts do not 404.

**Markdown pipeline:** Astro's built-in Shiki for code, plus `remark-gfm` and
footnote support. The espresso post's body starts at `#` (h1), so a published
page currently renders three h1s — shift body headings down one level.

---

## 5. Gotchas — every one of these cost me a debugging cycle

- **`background-clip: text` clips descenders.** The gradient only paints inside
  the element's background box, so the tail of the "g" in "delight" vanished. Fix
  is `padding-block` with matching negative `margin-block`.
- **An all-absolute inline-block has no baseline.** The cycling headline word
  floated above the line because every child was `position: absolute`, leaving no
  in-flow line box. A zero-width strut in `::before` restores it.
- **Headline line breaks are a design decision.** Word length changes at runtime,
  so an emergent break recomposes every 2.8s. Lines are explicit spans;
  `text-wrap: balance` does **not** solve this. The word and its full stop are
  bound with `white-space: nowrap`.
- **`viewTransition.ready` rejects** whenever the browser skips the transition
  (hidden tab, double click). Unhandled it throws in the console. `.catch(() => {})`.
- **Grid children need `min-width: 0`.** The Writing tag rail is a flex row of
  chips; in an auto-sized grid track it sized to max-content and pushed the page
  400px wide at 320px.
- **A ranked list must not renumber when filtered.** Rank comes from the item's
  index in the data and is written into the markup — not from `<ol>` numbering or
  a CSS counter, both of which renumber when rows are hidden.
- **An item with no `href` must not be a link.** Render a `<div>`, no arrow, no
  hover. A link that goes nowhere is an accessibility defect, not a cosmetic one.
- **Watch for duplicate rules on the same selector.** Two `.dock a` blocks meant
  a later `transition` replaced an earlier one and the dock collapse stopped
  animating — silently.
- **`backdrop-filter` is the expensive part.** Only the header and dock sit over
  scrolling content and keep a live blur; panels over the static aurora use a flat
  translucent fill. Do not reintroduce blur on cards.

---

## 6. Placeholder content — needs Jason, not the developer

Everything with a dotted underline in the mockup:

- Employment dates, titles and bullets (the repo only gave company order)
- The "Focus" line in At a glance
- One-line pitches for both apps, and all case-study copy
- The About bio and the "Beyond the CV" numbers
- App screenshots (CSS-drawn phone frames today) and company logos
- List item notes and tags

Ship the templates with this copy in place and visibly marked rather than
inventing replacements.

---

## 7. Verification — non-negotiable

This project has produced two false passes: grepping build output for a success
string while the build was failing, and curling correct server HTML while a React
island was being wiped on hydration. So:

- **Check exit codes, never grep for success.** The four gates are `pnpm build`,
  `pnpm check`, `pnpm lint`, `pnpm format:check`. There is no test suite.
- **Measure layout, don't eyeball it.** Compare
  `document.documentElement.scrollWidth` against viewport width at 320, 360, 390,
  414, 768 and 1280 in both themes on every screen. A 10–20px overflow is
  invisible in a screenshot. The mockup passes 120 combinations at zero.
- **Verify anything client-side in a real browser with the console open.**
- Interactive targets ≥44px for controls and chrome; inline text links are
  exempt (they meet the 24×24 WCAG 2.2 minimum).

---

## 8. Suggested issue breakdown

1. Foundations — fonts, tokens, dark mode wiring, delete dead CSS
2. Chrome — header, dock, footer, monogram
3. Homepage — hero with cycler and portrait swap, At a glance, featured projects
4. Projects — collection, index, case study template
5. Writing — index with tag filter, post template with TOC/progress/footnotes/code
6. Lists — schema, index, ranked and grouped templates
7. About — bio, experience, stack, beyond the CV
8. Cleanup — remove `HeadshotSocialLinks` and React if nothing else needs it;
   the site should ship **zero JS islands**

#9 (accessibility) and #10 (performance) are blocked on this and should run
against what actually ships.

---

## 9. Decisions and open questions

**Decided:**

- **`/writing` is the canonical path.** Rename from `/blog` and redirect
  `/blog/*` — the existing posts have inbound links and must not 404.
- **Placeholder copy stays in for now.** Build every template against it; Jason
  replaces the content in a final pass. Do not invent replacements, and do not
  remove the dotted-underline treatment that marks them.

**Still open — neither blocks the build:**

- The Twitter chip uses the X glyph but the accessible name says "Twitter". Pick
  one.
- Footer alignment on mobile: centred, or left-aligned like the rest of the site.
