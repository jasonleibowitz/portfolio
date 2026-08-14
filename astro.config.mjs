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
  // `site` sets the canonical tag, the og:image URL and the RSS links. This
  // default is the production host, and it is the only place that names it: a
  // production build takes it as it is. A preview overrides it, because a
  // preview serves from a workers.dev host.
  site: process.env.SITE_URL ?? 'https://leibowitz.me',
  integrations: [mdx(), sitemap(), icon()],
  // A post body writes an image as `![]()`, thus no component can take a prop.
  // `layout` is the only control that reaches these images. It gives each one a
  // `srcset` and a `sizes`. Without it a browser gets the full file to draw a
  // 736px column.
  //
  // `responsiveStyles` adds the CSS for the attributes that `layout` writes.
  // Without that CSS the image does not scale to its column.
  image: { layout: 'constrained', responsiveStyles: true },
  markdown: {
    // `markdown.remarkPlugins` is deprecated in Astro 7. A plugin goes to
    // `unified()` now, and `shikiConfig` stays where it is.
    processor: unified({ remarkPlugins: [remarkFigure] }),
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark-dimmed' },
    },
  },
  // /writing is the canonical path. No post has ever been published, thus no
  // /blog address has an inbound link and none of these is load bearing. They
  // stay because a redirect that nobody follows costs nothing, and because
  // Astro checks each target against a real route at build time.
  redirects: {
    '/blog': '/writing',
    '/blog/[...slug]': '/writing/[...slug]',
    '/blog/tags/[tag]': '/writing/tags/[tag]',
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
