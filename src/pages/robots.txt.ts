import type { APIContext } from 'astro';

/**
 * Makes `robots.txt`. This is a route and not a file in `public/`, thus the
 * sitemap that it gives is on the same host as the page.
 *
 * A file in `public/` must contain `https://leibowitz.me`. That is a second
 * place to change at the DNS cutover, and it sends a web crawler on a preview
 * to the sitemap of the production site.
 *
 * This file permits a crawler to read the site, which is correct for
 * production. A preview and the staging site also send the header
 * `X-Robots-Tag: noindex`, from `scripts/noindex.mjs`. The header has control
 * there. The two do not disagree.
 */
export function GET(context: APIContext) {
  const sitemap = new URL('sitemap-index.xml', context.site);

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
