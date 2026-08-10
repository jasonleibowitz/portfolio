# leibowitz.me

Personal portfolio and blog. A static [Astro](https://astro.build) site with no
JavaScript framework on the page, styled with Tailwind 4, deployed to Cloudflare
Workers.

Content lives in [Sanity](https://www.sanity.io). The `.mdx` files under
`src/content` still work and still build, so both sources can be compared.

## Setup

Node 22.12 or newer, and pnpm.

```bash
pnpm install
cp .env.example .env
```

Fill in `PUBLIC_SANITY_PROJECT_ID` and `PUBLIC_SANITY_DATASET` from
[sanity.io/manage](https://www.sanity.io/manage). Everything else in that file
is optional and says what it is for.

Then sign in once, so the CLI can reach the project:

```bash
pnpm exec sanity login
```

The studio asks the project for data from whatever host it is served on, so
that host needs to be listed under **Manage > API > CORS origins**, with
credentials allowed. The studio offers to add one the first time it sees a new
address; `http://localhost:4321` is the one to add now.

## Running it

One server. The studio is a route on the site, not a program beside it.

| Command        | The site reads   | Studio                      |
| -------------- | ---------------- | --------------------------- |
| `pnpm dev`     | the `.mdx` files | http://localhost:4321/admin |
| `pnpm dev:cms` | Sanity           | http://localhost:4321/admin |

`pnpm dev:cms` is the one to use for writing. It sets three variables and
starts the same server:

- `CONTENT_SOURCE=sanity` reads Sanity instead of `src/content`
- `SANITY_PERSPECTIVE=drafts` renders unpublished edits
- `SHOW_DRAFTS=true` keeps entries flagged `draft`

So the site shows unpublished work while `dev:cms` is running, and an edit can
be read in the real design before anyone else sees it. Edits appear without a
restart.

`pnpm dev` reads the `.mdx` files instead and shows the published set. `/admin`
is there either way, and edits the same project.

`astro dev` runs in the background and hands the prompt back, so `pnpm dev:stop`
is how a server ends, not Ctrl-C. Both commands above stop a running server
before starting: without that, the second one finds the first still up, keeps
serving it, and the variables it set are quietly ignored.

Without `PUBLIC_SANITY_PROJECT_ID` there is no `/admin`, and the site builds
from the `.mdx` files. That is what keeps a checkout with no Sanity account
building.

## Writing

Posts, lists and projects are edited in the studio. A few things it does that
are not obvious:

- **A list names where its items come from.** Set _Item source_ and the picker
  searches it: Apple for podcasts, films and albums, Google Places for anywhere
  with an address. Picking a result fills in the name, link, credit and
  artwork.
- **Artwork can also be fetched per item**, or pasted as a URL, on any item
  that already exists.
- **Tags are documents.** Add one in the `Tag` collection and it is offered
  everywhere.

## Checks

Four gates, all of which CI runs. None of them renders a page, so anything
visual needs a browser.

```bash
pnpm build         # static build to dist/
pnpm check         # astro check
pnpm lint          # eslint
pnpm format:check  # prettier
```

## Deployment

| Trigger        | Where it goes                               |
| -------------- | ------------------------------------------- |
| Pull request   | `pr-<n>-portfolio.<subdomain>.workers.dev`  |
| Push to `main` | `portfolio.<subdomain>.workers.dev`         |
| Content change | `content-portfolio.<subdomain>.workers.dev` |

The content preview is a separate build from Sanity's drafts, so unpublished
work can be shared without touching production. It runs from
`.github/workflows/content-preview.yml`, triggered by a Sanity webhook or by
hand from the Actions tab.

The studio has no deploy of its own. It is `/admin` on each of those URLs, so
it ships with the site and editing works from a phone. Each new host needs its
own CORS origin in Sanity, as localhost did.

## Where things are

| Path                    | What it holds                                  |
| ----------------------- | ---------------------------------------------- |
| `src/pages`             | Routes                                         |
| `src/components`        | Everything rendered                            |
| `src/styles`            | The whole design system                        |
| `src/content.config.ts` | Collections, and the Sanity loader             |
| `sanity.config.ts`      | The studio itself, mounted at `/admin`         |
| `studio/`               | Sanity schemas and the custom inputs           |
| `integrations/`         | Dev-server additions: live refresh, logo proxy |

`CLAUDE.md` carries the longer reasoning: why things are built the way they
are, and which decisions are deliberate rather than accidental.
