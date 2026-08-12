# A local admin for leibowitz.me

Why the content editor for this site is bespoke and file-backed. Issue #29 holds the work breakdown, the phases and the acceptance criteria; this file does not repeat them. A decision that has shipped moves to `CLAUDE.md` and leaves here, so this stays a list of what is still only decided.

## Why it is bespoke

Hosted and file-backed editors were evaluated over a long stretch. Three complaints survived every one:

1. **Content leaves the repo.** No git history, no grep, no pull request review, no agent editing, and `git clone` stops giving you a working site.
2. **The writing experience.** A cramped body field with a full-screen toggle, poorly organized forms, and a body format that is not markdown.
3. **A vendor sits between Jason and his own writing.**

Operational weight was explicitly _not_ a complaint. Tokens, CORS origins and webhooks were all fine.

Keystatic is the general version of this, and it was rejected too: config-driven collections, a field type system, a form renderer, file and GitHub modes. What justifies a bespoke admin is what no package can encode. A list carries `items` or `groups` and never both. Artwork is 56px wide in two ratios. A ranked list must not renumber when filtered. A Places result fills the subtitle with a neighborhood.

## The shape

Nothing new is deployed. The admin exists only while `astro dev` runs.

**Backend.** An integration registers dev server middleware at `/_admin/*` in the `astro:server:setup` hook, backed by `node:fs`. That hook cannot fire during a build, so there is nothing to authenticate and no Worker.

**Frontend.** The same integration injects `/admin/[...path]` only when `command === 'dev'`, rendering one `client:only="react"` island. The route cannot exist in a build.

**A save is a file write.** Astro's `glob()` loader already watches `src/content/**` in development, so writing a file re-syncs the content layer and updates the open page. Editing through the admin and editing in an editor become the same operation, which is the property no external content store has.

**Publishing is git.** A publish view lists uncommitted work grouped by entry, takes a commit message, and commits and pushes. CI runs the four gates and deploys.

### The three seams

Three seams keep extraction tractable later without paying for it now, and each is good design on its own:

```
src/admin/
  storage/        list / read / write / delete / rename / upload
    fs.ts         the only implementation today; GitHub later if /admin ever deploys
    types.ts
  sources/        search(query) -> Result[]
    apple.ts  places.ts  tmdb.ts  manual.ts
    types.ts
  collections.ts  field lists as data, not scattered through JSX
  ui/             specific to this content and this design
```

No API key reaches the browser, because search goes through the dev server. A picker that searched from the browser would ship the Maps key to whoever opens `/admin`, which then needs a referrer restriction and a quota to bound the damage.

## Decisions

**Post images move into `src/`.** Astro's docs are explicit that images in `public/` "are never optimized", even from markdown, and that responsive images are not supported for them. Measured: 4.9 MB across 25 files, and the espresso post alone carries about 4.5 MB. Body and hero images both move next to their post, so `sharp` processes them the way it already processes list artwork. Hero frontmatter becomes `image()` plus `imageAlt`, the shape `lists` and `projects` already use, and `og:image` becomes `new URL(image.src, site)`. The cost is that `/blog-images/*` stops resolving.

**The URL stops being the filename.** A `slug` field owns the URL. `getStaticPaths` was to read `data.slug ?? entry.id`; it turned out the glob loader already does exactly that, so `entry.id` _is_ the slug and the fallback belongs nowhere in `src/`. The one place that has to repeat it is `scripts/og-card.ts`, which derives ids outside Astro. The 5 existing posts set `slug` to their current id, because those URLs have a decade of inbound links. New posts get slugs with no date. Filenames keep the `YYYY-MM-DD-` prefix so the directory sorts chronologically. Uniqueness is enforced on the slug, not the title: Astro only warns and drops one of two entries that collide, so that script fails the build instead.

**The editor is MDXEditor.** Chosen on one axis: whether markdown is the document or an export format. TipTap, Lexical, BlockNote and Plate all hold a JSON document and serialize to markdown, which is lossy at the edges. MDXEditor parses and writes the file itself through remark, so the round trip is lossless by construction. These files are also edited by hand and by agents, which is what makes that matter. Its bundle is large and irrelevant, because the route never deploys.

**Footnotes are the open risk.** Issue #194 on `mdx-editor/editor` is the only footnote issue ever filed, and the maintainer's answer is: "Foot notes are not supported at the moment. They can probably be handled with a plugin, but it's not trivial I believe." The reported behavior is that `foo[^1]` is written back escaped as `foo\[^1]`, even in source mode. That is corruption on save. No current post uses footnotes, but `src/lib/footnotes.ts` and its popovers were built for the feature, so a spike answers this before anything is built on top of it.

**Projects keep three write-ups.** The body carries three fixed `##` sections, shown as three labelled rich text fields that serialize under those headings in a fixed order. On load the body is split on the same headings, and if it does not match, the form says so and drops to a raw body editor rather than guessing.

**Screenshots go inside the existing frame.** `DeviceFrame.astro` keeps its chrome, border, radius, aspect and shadow, and its drawn slabs are replaced by an `<Image>`. A project with no screenshots keeps rendering the drawn version, so nothing regresses while captures are made.

**A commit is an entry, not a file.** Because images live in `src/`, a missing relative image is a build failure rather than a broken `<img>`, so committing a post without its images pushes a red build. The publish view lists entries, and staging one stages its `.mdx`, every image it references, and any deletion from a rename.

**Prettier runs on write.** `lint-staged` runs `prettier --write` over `*.mdx`, so git would otherwise reformat everything the admin writes and leave the admin's copy stale.

**The list source decides the artwork ratio.** A list picks a data source first, and the source knows both how to search and what shape its artwork is. Podcasts give square art and fill name, hosts, link and cover; movies give poster ratio; Places gives square, and fills name, neighborhood, website and logo. The admin writes `thumb` from the source and records `source` on the list, so it can offer the right search next time.

## Open

- **Footnotes.** Answered by the spike. If a plugin is needed it adds 2 to 3 days.
- **Underline.** Asked for, and MDXEditor offers it, but markdown has no underline and it serializes to `<u>`, which puts an HTML node back into bodies that would otherwise be clean. It also reads as a dead link in prose. Recommendation is to drop it from the toolbar.
- **Embeds.** Two posts hold a YouTube `<iframe>` and two Twitter blockquotes with their widget `<script>`, which MDX parses as JSX. The editor needs a descriptor for them, a source-mode fallback, or a markdown-native replacement.
- **Placeholder body copy.** Today it is raw `<p class="placeholder-copy">`. A remark directive would keep bodies clean, and needs deciding before Projects.
- **What the publish view may touch.** Assumed `src/content/**` and image paths only, showing but never staging other changes. The admin is not a git client.
- **Save semantics.** Assumed explicit save with a dirty state guard. The side by side preview was dropped, so there is no reason to write on every keystroke.
- **Validation outside Astro.** The admin cannot call Astro's `image()` helper, so image fields validate as "a path that exists" rather than through the content schema.

## Not being built

- **A deployed `/admin`.** Wanted eventually at `leibowitz.me/admin`, with authentication so only Jason can open it. It needs a Worker script, a GitHub API write path and a real auth surface, and it roughly doubles the work. The storage seam is what keeps it possible.
- **A side by side live preview.** Dropped, possibly revisited. It would need autosave, and an Astro content change triggers a full page reload rather than in place HMR, so the preview would flash and jump on every pause unless scroll position were restored.
- **An open source package.** See the seams above.
