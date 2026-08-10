// @ts-check
import process from 'node:process';
import { defineConfig } from 'astro/config';
import sanity from '@sanity/astro';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import sanityLive from './integrations/sanity-live.mjs';

/*
 * Node reads .env natively from 20.6, and Astro does not put it on
 * `process.env` by itself. Loading it here is what lets one `pnpm dev` pick up
 * the project id and the content source, rather than every command carrying
 * them inline. Same approach as scripts/list-artwork.mjs.
 *
 * Sanity's guide reaches for vite's `loadEnv` here instead. That returns an
 * object and leaves `process.env` alone, which would not do: the content
 * loader and integrations/sanity-live.mjs read `process.env` in plain Node,
 * outside anything vite processes. One loader that serves both beats two.
 */
try {
  process.loadEnvFile();
} catch {
  /* no .env; the site falls back to the .mdx files */
}

/*
 * The studio is a route on the site, so it is only worth building when there
 * is a project for it to open. Without this, every deploy carries a /admin that
 * loads with no `projectId` and cannot connect, and about 9MB of studio bundle
 * to say so: `dist/` measured 21MB with the studio and 12MB without. The four
 * gates run with no Sanity credentials, and should.
 */
const studioProjectId = process.env.PUBLIC_SANITY_PROJECT_ID;

// https://astro.build/config
export default defineConfig({
  // `site` sets the canonical tag, the og:image URL and the RSS links. CI
  // overrides it, because a preview serves from a workers.dev host.
  site: process.env.SITE_URL ?? 'https://leibowitz.me',
  integrations: [
    mdx(),
    icon(),
    /*
     * The studio is served by the site at /admin rather than run beside it,
     * which is what Sanity's Astro integration is for. One command, one
     * origin, and the studio deploys with the site.
     *
     * `hash` routing keeps it a single static route, and is what the
     * integration picks by default for `output: 'static'`. It is written out
     * because the alternative matters: browser routing marks the route
     * `prerender = false`, which needs an adapter on a site that has no other
     * reason to have one.
     *
     * `react()` is here for the studio alone. The site itself ships no island.
     */
    ...(studioProjectId
      ? [
          sanity({
            projectId: studioProjectId,
            dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
            useCdn: false,
            studioBasePath: '/admin',
            studioRouterHistory: 'hash',
          }),
          react(),
        ]
      : []),
    sanityLive(),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    },
  },
  // /writing is the canonical path. The posts under /blog have inbound links
  // going back a decade and must not 404.
  redirects: {
    '/blog': '/writing',
    '/blog/[...slug]': '/writing/[...slug]',
    '/blog/tags/[tag]': '/writing/tags/[tag]',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
