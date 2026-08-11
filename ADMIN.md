# A local admin for leibowitz.me

The plan for a bespoke content editor that keeps the `.mdx` files as the source
of truth. This file holds the reasoning. Issue tracking goes elsewhere.

## Why, after three CMS spikes and a Sanity build

Keystatic, Tina and Decap were spiked and removed in `77d077f`. Sanity was then
built far enough to load `blog` and `lists`, lock the dataset, and deploy on
publish. Three complaints survived all of it:

1. **Content left the repo.** No git history, no grep, no pull request review,
   no agent editing, and `git clone` no longer gives a working site.
2. **The writing experience.** The body was a small field with a full-screen
   toggle, the forms were poorly organized, and Portable Text is not markdown.
3. **A vendor sits between Jason and his own writing.**

Operational weight was explicitly _not_ a complaint. Sanity's tokens, CORS
origins and webhooks were fine. The three above are what a file-backed admin
fixes, and they are the whole reason this is worth 19 days.

### What abandoning Sanity costs

One draft list. Checked against the dataset on 2026-08-10:

- `my-favorite-nyc-coffee-shops`, 6 items with 6 uploaded artwork assets, exists
  only in Sanity. It is what the Google Places picker was built for.
- `my-favorite-podcasts` is a 2 group variant of the 6 group `podcasts` that is
  already in a file, so it reads as an experiment.
- All 5 posts match their `.mdx` files. All 3 project write-ups are still empty.

**Do not delete the Sanity dataset until Phase 2 ships.** Places is what
rebuilds the coffee shops list.

## The shape

Nothing new is deployed. The admin exists only while `astro dev` runs.

**Backend.** An integration registers dev server middleware at `/_admin/*` in
the `astro:server:setup` hook, backed by `node:fs`. That hook cannot fire during
a build, so there is nothing to authenticate and no Worker. `wrangler.jsonc`
still declares no `main`, and the production `dist/` is unchanged.

**Frontend.** The same integration injects `/admin/[...path]` only when
`command === 'dev'`, rendering one `client:only="react"` island. The route
cannot exist in a build.

**A save is a file write.** Astro's `glob()` loader already watches
`src/content/**` in development, so writing a file re-syncs the content layer
and updates the open page. Editing through the admin and editing in an editor
become the same operation, which is the thing Sanity could not do and why
`integrations/sanity-live.mjs` had to exist.

**Publishing is git.** A publish view lists uncommitted work grouped by entry,
takes a commit message with a smart default, and commits and pushes. CI runs the
four gates and deploys.

### The three seams

Built bespoke, not as a package. Keystatic is the generic version of this and it
was already rejected; a field type system and a generic form renderer would walk
back toward the fit problem. Three seams keep extraction tractable later without
paying for it now, and each is good design on its own:

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

No API key reaches the browser, because search goes through the dev server. The
Sanity studio had to ship the Maps key to `/admin` and needed two separately
restricted keys as a result. That problem does not exist here.

## Decisions

### Captioned images become markdown

`CaptionedImage.astro` is deleted. A remark plugin turns "an image alone in a
paragraph, followed by an italic line" into `<figure><figcaption>`. The caption
is real markdown, so an attribution link comes free instead of needing an
object valued JSX prop.

The payoff is larger than the markup: **post bodies then contain no JSX and no
imports at all**, so the editor needs no JSX plugin, no component descriptors
and no custom node editors. That is the difference between configuring an editor
and extending one.

19 call sites across 5 posts convert.

### Post images move into `src/`

`public/` is a verbatim copy directory. The Astro docs are explicit that images
there "are never optimized", even when referenced from markdown, and that
responsive images are not supported for them. So today every post image ships at
full size with no `width`, `height`, `loading` or `decoding`, which also means
text reflows as each image loads.

Measured: `public/blog-images` is 4.9 MB across 25 files. 8 are raw PNG or JPG,
and the espresso post alone carries about 4.5 MB of them, including a 1.5 MB
PNG.

Body images and hero images both move next to their post and are referenced
relatively, so `sharp` processes them the way it already processes list artwork.
Hero frontmatter becomes `image()` plus `imageAlt`, which is the shape `lists`
and `projects` already use, so all three collections finally agree. `og:image`
becomes `new URL(image.src, site)`.

The cost is that `/blog-images/*` stops resolving.

### The URL stops being the filename

A `slug` frontmatter field owns the URL. `getStaticPaths` uses
`data.slug ?? entry.id`.

The 5 existing posts set `slug` to their current id, so their URLs do not change
and no redirects are needed. Those URLs have a decade of inbound links, which is
why `/blog/*` redirects exist at all. New posts get clean slugs with no date.
Filenames keep the `YYYY-MM-DD-` prefix so the directory sorts chronologically.

Uniqueness is enforced on the slug, not the title.

### The editor is MDXEditor

Chosen on one axis: whether markdown is the document or an export format. TipTap
(13.6M weekly), Lexical (4.6M), BlockNote and Plate all hold a JSON document and
serialize to markdown, which is lossy at the edges. MDXEditor (1.16M) parses and
writes the file itself through remark, so the round trip is lossless by
construction. That matters because these files are also edited by hand and by
agents.

It ships its own CSS and a Radix toolbar, so "modern and Medium-like" means
restyling its parts. Its bundle is large and irrelevant, because the route never
deploys.

**Footnotes are the open risk.** Issue #194 on `mdx-editor/editor` is the only
footnote issue ever filed, and the maintainer's answer is: "Foot notes are not
supported at the moment. They can probably be handled with a plugin, but it's
not trivial I believe." The reported behavior is that `foo[^1]` is written back
as `foo\[^1]`, escaped, even in source mode. That is corruption on save, not a
missing button.

No current post uses footnotes, so nothing is at risk today, but
`src/lib/footnotes.ts` and its popovers were built for the feature. Phase 1
opens with a spike that answers this before anything is built on top of it.

### Projects keep three write-ups

The project body carries three fixed `##` sections. The form shows three
labelled rich text fields that serialize under those headings in a fixed order.
On load the body is split on the same headings, and if it does not match, the
form says so and drops to a raw body editor rather than guessing.

### Screenshots go inside the existing frame

`DeviceFrame.astro` keeps its chrome, border, radius, 9:19 or 4:3 aspect and
shadow, and its drawn slabs are replaced by an `<Image>`. A project with no
screenshots yet keeps rendering the drawn version, so nothing regresses while
captures are made. The `frame` field stays meaningful.

### A commit is an entry, not a file

Because images now live in `src/`, a missing relative image is a build failure
rather than a broken `<img>`. Committing a post without its images pushes a red
build. So the publish view lists entries, and staging one stages its `.mdx`,
every image it references, and any deletion from a rename. Entries can still be
committed one at a time or all at once.

### Prettier runs on write

`lint-staged` runs `prettier --write` over `*.mdx`, so git would otherwise
reformat everything the admin writes and leave the admin's copy stale. Running
Prettier's API on the serialized file before writing keeps diffs minimal and the
file stable.

### The list source decides the artwork ratio

A list picks a data source first, and the source knows both how to search and
what shape its artwork is. Apple Podcasts gives square art and fills name,
hosts, link and cover. Movies give poster ratio. Places gives square, and fills
name, neighborhood, website and logo.

The admin writes `thumb` from the source and records `source` on the list so it
can offer the right search next time. The site schema barely changes.

## Phases

| Phase | Work                                                                                  | Days |
| ----- | ------------------------------------------------------------------------------------- | ---- |
| 0     | Site prerequisites. Own pull request, justified without the admin.                    | 2.5  |
| 1     | Spike, foundation, Writing, publish. A CMS worth writing in.                          | 9    |
| 2     | Lists: form, groups, drag and drop, the picker across Apple, Places, TMDB and manual. | 5    |
| 3     | Projects: form, three write-ups, screenshots.                                         | 1.5  |
| 4     | Polish and docs.                                                                      | 1    |

Total about 19 days. A usable writing CMS lands at about day 11.5.

Phase 0 stands alone. The espresso post stops shipping 4.5 MB and the layout
shift goes away whether or not the admin is ever built.

Phase 1 opens with the MDXEditor spike, half a day, against a real post plus a
test file holding footnotes, a code block, nested lists and images. It is the
exit ramp: the footnote answer arrives before anything is built on it, and
walking back to Sanity at that point costs 3 days rather than 19.

### Phase 0

Remark figure plugin. Delete `CaptionedImage` and convert 19 call sites. Move 25
images into `src/`. Hero becomes `image()` and renders through `<Image>`.
`og:image` from `site`. `slug` field wired into `getStaticPaths` and set on the
5 existing posts.

### Phase 1

Dev only integration and injected route. React shell in the site's Tailwind
theme. Storage seam. YAML serialization with Prettier on write. Zod validation
shared with `content.config.ts`. Collections as data. Entry index with search,
filter and delete confirmation. MDXEditor restyled, with headings, bold, italic,
code, links, ordered and unordered lists, indentation, blockquotes, code blocks
with a language picker, and image insert with caption and upload. Frontmatter
form with smart defaults, editable slug with a uniqueness check, tag
autocomplete, hero upload. Publish view.

### Phase 2

List form, flat versus grouped with group descriptions, item fields, drag to
reorder, drag between groups. The picker across Apple, Places, TMDB and manual,
with artwork downloaded and written into the list's folder.

### Phase 3

Project frontmatter including spec rows, stack chips, CTA, TestFlight, featured,
order and icon. Three rich text write-ups with raw fallback. Placeholder
marking. Screenshot upload and the `DeviceFrame` rework.

### Phase 4

Admin dark mode, keyboard shortcuts, empty states. CLAUDE.md and README.
Delete plop and `plop-templates/`, since the admin creates entries now.

## Open

- **Footnotes.** Answered by the Phase 1 spike. If a plugin is needed it adds 2
  to 3 days.
- **Underline.** Asked for, and MDXEditor offers it, but markdown has no
  underline and it serializes to `<u>`, putting an HTML node back into bodies
  that would otherwise be clean. It also reads as a dead link in prose.
  Recommendation is to drop it from the toolbar.
- **Placeholder body copy.** Today it is raw `<p class="placeholder-copy">`,
  which is the last HTML in the bodies. A remark directive would keep bodies
  clean, and needs deciding in Phase 3.
- **What the publish view may touch.** Assumed to be `src/content/**` and image
  paths only, showing but never staging other changes. The admin is not a git
  client.
- **Save semantics.** Assumed explicit save with a dirty state guard. The side
  by side preview was dropped, so there is no reason to write on every
  keystroke. `localhost:4321/writing/<slug>` always renders the saved state.
- **Validation outside Astro.** The admin cannot call Astro's `image()` helper,
  so image fields validate as "a path that exists" rather than through the
  content schema.

## Not being built

- **A deployed `/admin`.** Wanted eventually at `leibowitz.me/admin`, with
  authentication so only Jason can open it. It needs a Worker script, a GitHub
  API write path and a real auth surface, and it roughly doubles the work. The
  storage seam is what keeps it possible.
- **A side by side live preview.** Dropped, possibly revisited. It would need
  autosave, and an Astro content change triggers a full page reload rather than
  in place HMR, so the preview would flash and jump on every pause unless scroll
  position were restored.
- **An open source package.** See the seams above.
