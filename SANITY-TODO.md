# Sanity spike: what is left

Running notes for the Sanity evaluation. Everything here lives on
`worktree-keystatic-spike` and nothing has been merged.

## Parked until Sanity is chosen

**Drop the `draft` boolean in favour of Sanity's publish state.** Two controls
answer the same question today, and the field is the one that can lie: a
document can be published in Sanity and still invisible on the site. Deliberately
not done yet, because both content sources are live behind `CONTENT_SOURCE` and
removing the field would make them behave differently while they are being
compared.

When Sanity wins:

1. Drop `draft` from the three schemas and from the loader.
2. `getPublished()` keeps sorting; the perspective does the filtering.
3. `DraftBadge` selects `"isDraft": _id in path("drafts.**")` instead of reading
   a field, so it marks "has unpublished edits" rather than a hand-set flag.
4. CI stops setting `SHOW_DRAFTS` on pull request previews. A code change should
   not alter which content is visible; the content preview owns that now.

**Decide whether "archived" is its own state.** `draft: true` is currently doing
duty for "retired but keep it", which is not the same as "not finished yet".
Without the field, retiring means unpublishing, which deletes the published
document and keeps the draft. Recoverable, but a different operation.

## Done

- **Fetch-artwork input.** A search row on every list: type a name, pick a
  result, and the item lands with name, credit, link and artwork, the image
  uploaded to Sanity as a real asset. Verified end to end with Hard Fork.

## Still to build

- **Content edits do not appear until the dev server restarts.** Astro's content
  layer runs a loader once and keeps the result in `.astro/data-store.json`, so
  nothing re-fetches when a document changes in the studio. Astro's live content
  collections run the loader per request and are meant for this; check whether
  they are stable in Astro 7 before relying on them.

- **Films are untested.** The picker searches Apple for both, but a `poster`
  list queries the `movie` entity and only podcasts have been tried. TMDB may
  still be the better source for films, as `scripts/list-artwork.mjs` notes.
- **`scripts/list-artwork.mjs` is now redundant** for anything in Sanity. Keep
  it while the file-backed source is still live; delete it when that goes.
- **Projects loader.** `blog` and `lists` read from Sanity; `projects` still
  reads `.mdx`.
- **Artwork ratio does nothing in the studio.** `thumb` is a data flag the site
  reads. It could drive the image field's crop, and does not.
- **Raw HTML in bodies is dropped on import**, which is the embedded tweet in the
  eSIM post. Decide whether embeds become a block type or stay unsupported.
- **The `placeholder` convention has no Sanity equivalent.** Marked-as-unwritten
  copy renders with a dotted underline from a `placeholder[]` array; the Sanity
  schemas do not carry it.

## Needs an account, so cannot be done from here

- Repo secrets: `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_READ_TOKEN`.
- Sanity webhook posting `repository_dispatch` to GitHub, so a content change
  triggers the preview build.
- `pnpm studio:deploy` to publish the studio to `<project>.sanity.studio`, which
  is what makes editing work from a phone.
