import type { APIContext } from 'astro';

/**
 * Generated rather than committed to `public/`, so the sitemap it advertises
 * is on the host that served it. A static file would hardcode
 * `https://leibowitz.me`, which is a second place to edit at DNS cutover and
 * points a preview at production's sitemap.
 *
 * This allows crawling, which is right for production. Previews and staging
 * also carry `X-Robots-Tag: noindex` from `scripts/noindex.mjs`; the header
 * wins there, and the two are not in conflict.
 */
export function GET(context: APIContext) {
  const sitemap = new URL('sitemap-index.xml', context.site);

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
