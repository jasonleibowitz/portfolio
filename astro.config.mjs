// @ts-check
import process from 'node:process';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // `site` feeds the canonical tag, the absolute og:image URL and the RSS item
  // links. A preview build serves from a workers.dev host, so CI overrides this
  // with that host: left at production those three would point at a domain
  // still serving the old site, and an unfurl would render the wrong image.
  site: process.env.SITE_URL ?? 'https://leibowitz.me',
  integrations: [mdx(), icon()],
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
