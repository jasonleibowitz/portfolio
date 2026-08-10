/**
 * Finds a business's logo on its own website, and serves images the browser is
 * not allowed to fetch for itself.
 *
 * A logo lives on the venue's site, and almost no site sends CORS headers on
 * its HTML, so the studio cannot read the page to find one. Google is no help:
 * it returns customer photographs and a generic category glyph, never a brand
 * mark. Clearbit's logo API is gone, and Google's favicon service answers from
 * a host with no CORS header, at about a kilobyte.
 *
 * A server has none of those limits, because the same-origin policy applies to
 * browsers. This makes `astro dev` the proxy rather than adding a deployed one.
 *
 * The consequence worth knowing: it exists only while `astro dev` runs. A
 * studio deployed to sanity.studio has no proxy and falls back to photographs.
 * A Worker is the fix if editing moves off the laptop.
 */

const ORIGIN = 'http://localhost:4321';
const UA = 'Mozilla/5.0 (compatible; leibowitz.me-studio/1.0)';

/**
 * Candidate logo URLs found on a page, best first.
 *
 * Ordered by how likely each is to be a brand mark rather than a photograph.
 * An apple-touch-icon leads because it is square, reasonably large, and is
 * almost always the logo; og:image is last because it is usually a scene.
 */
function findLogos(html, base) {
  const patterns = [
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]*>/gi,
    /<meta[^>]+(?:itemprop|property)=["'][^"']*logo[^"']*["'][^>]*>/gi,
    /<img[^>]+(?:class|id|alt)=["'][^"']*logo[^"']*["'][^>]*>/gi,
    /<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]*>/gi,
    /<meta[^>]+property=["']og:image["'][^>]*>/gi,
  ];

  const found = [];
  for (const pattern of patterns) {
    for (const tag of html.match(pattern) ?? []) {
      const attr = tag.match(/(?:href|src|content)=["']([^"']+)["']/i);
      if (!attr) continue;
      try {
        const url = new URL(attr[1], base).href;
        if (!found.includes(url)) found.push(url);
      } catch {
        /* a malformed href is not worth failing the whole lookup for */
      }
    }
  }
  return found.slice(0, 8);
}

export function addLogoProxy(server, logger) {
  server.middlewares.use('/_logo', async (req, res) => {
    const site = new URL(req.url, ORIGIN).searchParams.get('site');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    if (!site) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'no site given' }));
      return;
    }

    try {
      const page = await fetch(site, {
        headers: { 'User-Agent': UA },
        redirect: 'follow',
      });
      const html = await page.text();
      // Wrapped in the proxy before returning, so the studio can use them
      // directly and never has to know which hosts allow a cross-origin read.
      const logos = findLogos(html, page.url).map(
        (url) => `${ORIGIN}/_proxy?url=${encodeURIComponent(url)}`
      );
      res.end(JSON.stringify({ logos }));
    } catch (error) {
      logger.warn(`logo lookup failed for ${site}: ${error.message}`);
      res.end(JSON.stringify({ logos: [] }));
    }
  });

  /** Streams an image back with the CORS header its own host left off. */
  server.middlewares.use('/_proxy', async (req, res) => {
    const target = new URL(req.url, ORIGIN).searchParams.get('url');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!target) {
      res.statusCode = 400;
      res.end();
      return;
    }

    try {
      const upstream = await fetch(target, { headers: { 'User-Agent': UA } });
      if (!upstream.ok) {
        res.statusCode = upstream.status;
        res.end();
        return;
      }
      res.setHeader(
        'Content-Type',
        upstream.headers.get('content-type') ?? 'application/octet-stream'
      );
      res.end(Buffer.from(await upstream.arrayBuffer()));
    } catch (error) {
      logger.warn(`proxy failed for ${target}: ${error.message}`);
      res.statusCode = 502;
      res.end();
    }
  });

  logger.info('logo lookup available at /_logo');
}
