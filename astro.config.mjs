// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import icon from 'astro-icon';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://leibowitz.me',
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
