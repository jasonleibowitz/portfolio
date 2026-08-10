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

Fill in `SANITY_PROJECT_ID` and `SANITY_DATASET` from
[sanity.io/manage](https://www.sanity.io/manage). Everything else in that file
is optional and says what it is for.

Then sign in once, so the studio and the CLI can reach the project:

```bash
pnpm exec sanity login
```

## Running it

| Command        | What it starts                                 |
| -------------- | ---------------------------------------------- |
| `pnpm dev:cms` | The site **and** the studio, both using Sanity |
| `pnpm dev`     | The site alone, reading the `.mdx` files       |
| `pnpm studio`  | The studio alone                               |

`pnpm dev:cms` is the one to use for writing:

- **http://localhost:4321** the site
- **http://localhost:3333** the studio

The site shows unpublished work while `dev:cms` is running, so an edit can be
read in the real design before anyone else sees it. Edits appear without a
restart.

`pnpm dev` reads the `.mdx` files instead and shows the published set.

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

The studio deploys separately with `pnpm studio:deploy`, which is what makes
editing work away from this machine.

## Where things are

| Path                    | What it holds                                  |
| ----------------------- | ---------------------------------------------- |
| `src/pages`             | Routes                                         |
| `src/components`        | Everything rendered                            |
| `src/styles`            | The whole design system                        |
| `src/content.config.ts` | Collections, and the Sanity loader             |
| `studio/`               | Sanity schemas and the custom inputs           |
| `integrations/`         | Dev-server additions: live refresh, logo proxy |

`CLAUDE.md` carries the longer reasoning: why things are built the way they
are, and which decisions are deliberate rather than accidental.
