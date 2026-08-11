// @ts-check
import process from 'node:process';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';
import { unified } from '@astrojs/markdown-remark';
import remarkFigure from './plugins/remark-figure.ts';

// https://astro.build/config
export default defineConfig({
  // `site` sets the canonical tag, the og:image URL and the RSS links. CI
  // overrides it, because a preview serves from a workers.dev host.
  site: process.env.SITE_URL ?? 'https://leibowitz.me',
  integrations: [mdx(), sitemap(), icon()],
  // A post body writes its images as `![]()`, so there is no component to hang
  // a `widths` prop on. `layout` is the only way to reach them: it gives every
  // image a `srcset` and a `sizes`, markdown ones included. Without it a
  // markdown image is emitted at its source resolution and the browser
  // downloads all of it to draw a 736px column.
  image: { layout: 'constrained', responsiveStyles: true },
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
