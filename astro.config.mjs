// @ts-check
import process from 'node:process';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkFigure from './plugins/remark-figure.ts';

// https://astro.build/config
export default defineConfig({
  // `site` sets the canonical tag, the og:image URL and the RSS links. CI
  // overrides it, because a preview serves from a workers.dev host.
  site: process.env.SITE_URL ?? 'https://leibowitz.me',
  integrations: [mdx(), icon()],
  markdown: {
    // `markdown.remarkPlugins` is deprecated in Astro 7. A plugin goes to
    // `unified()` now, and `shikiConfig` stays where it is.
    processor: unified({ remarkPlugins: [remarkFigure] }),
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
