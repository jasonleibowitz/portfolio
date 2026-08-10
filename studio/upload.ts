import type { SanityClient } from 'sanity';

/**
 * Downloads a picture and stores it in Sanity.
 *
 * Anything not known to allow a cross-origin read goes through the dev
 * server's proxy. A URL pasted by hand is the clearest case: it can point
 * anywhere, and most hosts do not send the header a browser needs.
 *
 * Sanity's own CDN and Apple's artwork CDN do send it, so those are fetched
 * directly and the proxy is not needed to view a list while the dev server is
 * stopped.
 */
const DIRECT_HOSTS = [
  'cdn.sanity.io',
  'is1-ssl.mzstatic.com',
  'lh3.googleusercontent.com',
  'localhost',
];

export function proxied(url: string) {
  try {
    const { hostname } = new URL(url);
    if (DIRECT_HOSTS.some((host) => hostname.endsWith(host))) return url;
  } catch {
    return url;
  }
  return `http://localhost:4321/_proxy?url=${encodeURIComponent(url)}`;
}

/** Uploads a picture from a URL and returns an image value for the field. */
export async function uploadFromUrl(
  client: SanityClient,
  url: string,
  name: string
) {
  const response = await fetch(proxied(url));
  if (!response.ok) {
    throw new Error(
      response.status === 502
        ? 'Could not reach that URL. Is the dev server running?'
        : `Could not fetch that image (${response.status})`
    );
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error(`That URL returned ${blob.type || 'no image'}`);
  }

  const extension = blob.type.split('/')[1]?.split('+')[0] ?? 'jpg';
  const asset = await client.assets.upload('image', blob, {
    filename: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.${extension}`,
  });

  return { _type: 'image', asset: { _type: 'reference', _ref: asset._id } };
}
