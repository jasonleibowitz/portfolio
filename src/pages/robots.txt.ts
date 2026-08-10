import type { APIContext } from 'astro';

/**
 * Makes `robots.txt`. It is a route and not a file in `public/`, thus the
 * sitemap that it gives is on the host that sent the page. A file in `public/`
 * must contain `https://leibowitz.me`, which is a second place to change at the
 * DNS cutover.
 *
 * It permits a crawler to read the site. A preview also sends
 * `X-Robots-Tag: noindex`, which has control there.
 */
export function GET(context: APIContext) {
  const sitemap = new URL('sitemap-index.xml', context.site);

  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap.href}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
