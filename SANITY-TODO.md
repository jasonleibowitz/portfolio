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
- **Content edits appear without a restart.** `integrations/sanity-live.mjs`
  listens for mutations and calls `refreshContent`, so the content layer no
  longer holds the result of one loader run for the life of the server. Astro's
  live content collections would solve it the other way, per request, and need
  an adapter this site has no other reason to carry.

## Still to build

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

## Ruled out

**Logos from a Google image search.** Better ranked than reading a venue's own
site, and built, but Google discontinued full-web search for new Programmable
Search Engines in August 2025. An engine created now searches only the sites it
lists, which cannot find a logo for an arbitrary business. Confirmed through the
API Explorer: the engine and the API both work, and every result came from the
one placeholder site. Reaching it again would need an engine created before that
date, or a paid search API.

Logos still come from the venue's own website, read by the dev server, and any
image can be pasted as a URL.

## Needs an account, so cannot be done from here

- CORS origins in Sanity for each host the studio is served from: the staging
  and content-preview `workers.dev` URLs, and leibowitz.me at cutover. A
  per-pull-request URL is a new host each time and will not be worth adding.
- Sanity webhook posting `repository_dispatch` to GitHub, so a content change
  triggers the preview build.

## The Google Maps key reaches the browser

`/admin` ships the key to anyone who opens the page, so it needs restricting in
Google Cloud. Two keys, because one of them is published and the other is not:

- **Deployed key**, in CI: referrers `https://*.jasonaleibowitz.workers.dev/*`
  and `https://leibowitz.me/*`. Not localhost. The wildcard covers staging, the
  content preview and every `pr-<n>-` build, and a `workers.dev` subdomain
  belongs to one account.
- **Dev key**, in the gitignored `.env`: referrer `http://localhost:4321/*`.
  It is never built into anything that deploys, so it is never published.

Neither list is a boundary. `Referer` is a request header and anyone can send
whichever one they like, so the restriction stops a stranger pasting the key
into their own site and stops nothing else. What bounds the damage is
restricting the key to Places API (New) and setting a quota on it.

The fix that would end this is to stop shipping the key: proxy the Places call
the way `integrations/logo-proxy.mjs` proxies logo lookups in dev. That needs a
Worker script in production, which a site of static assets does not have today,
so it is a real change rather than a setting.

## Done, and how it was checked

- **The `production` dataset is private.** It was public: an unauthenticated
  `count(*)` answered 101, and the project id that request needs is compiled
  into the site. Now the same request answers 0, while the read token sees all
  116 documents. Anonymous reads return HTTP 200 with an empty result rather
  than a 401, so a caller is told nothing, not refused.

  Assets were never in scope and did not change. Sanity serves them from
  cdn.sanity.io whatever the dataset visibility, so no image on the built site
  breaks: "Asset files are not private, so even images uploaded to a private
  dataset can be viewed by unauthenticated users." Verified by requesting one
  after the change: still 200.

- Repo variables `SANITY_PROJECT_ID` and `SANITY_DATASET`, and the repo secret
  `SANITY_READ_TOKEN`. The first two are variables because they are compiled
  into the studio bundle a visitor downloads, so they are not secret. Now the
  dataset is private the token is not optional: every build that sets
  `CONTENT_SOURCE=sanity` needs it.

  Two Viewer tokens, not one: `astro-build` for this machine, `github-actions`
  for CI, so either can be revoked without stopping the other. Note that a
  Viewer token reads drafts, so the token is not what keeps unpublished work
  off the site. `SANITY_PERSPECTIVE` is.
