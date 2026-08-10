import { createClient } from '@sanity/client';
import process from 'node:process';

/**
 * Read-only Sanity client used at build time.
 *
 * `useCdn` is false because a build runs once and wants the newest published
 * content, not a cached copy that might be minutes behind a publish.
 *
 * `perspective` is what separates a production build from a preview one:
 * `published` sees only published documents, `drafts` sees unpublished work as
 * if it were live. That single value is the whole preview mechanism.
 */
let client: ReturnType<typeof createClient> | undefined;

/**
 * Built on first use, never at import.
 *
 * The client throws when it has no `projectId`, so constructing it at module
 * scope broke every build that does not read from Sanity -- merely importing
 * this file was enough. A file-backed build must not need Sanity credentials
 * to exist.
 */
export function sanityClient() {
  client ??= createClient({
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID ?? '',
    dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
    apiVersion: '2025-08-15',
    useCdn: false,
    token: process.env.SANITY_READ_TOKEN,
    perspective:
      process.env.SANITY_PERSPECTIVE === 'drafts' ? 'drafts' : 'published',
  });
  return client;
}

/**
 * Whether this build reads from Sanity or from the .mdx files.
 *
 * Both sources stay wired while the two are being compared, so a page can be
 * rendered from either without a branch. It is a build-time switch rather than
 * a permanent fork -- once a source is chosen, the other one goes.
 */
export const usingSanity = process.env.CONTENT_SOURCE === 'sanity';

/**
 * Image URLs are built by hand rather than with @sanity/image-url.
 *
 * The builder is another dependency for what is string concatenation over the
 * asset ref: `image-<id>-<dimensions>-<format>` encodes everything the CDN
 * needs. Width and quality are appended so a 56px slot does not download a
 * 1200px original, which is the job `astro:assets` did before.
 */
export function imageUrl(
  // `null` as well as `undefined`: GROQ answers with null for a field a
  // document does not have, and the schemas pass that through untouched.
  source: { asset?: { _ref?: string } } | null | undefined,
  { width, height }: { width?: number; height?: number } = {}
) {
  const ref = source?.asset?._ref;
  if (!ref) return undefined;

  const [, id, dimensions, format] = ref.split('-');
  if (!id || !format) return undefined;

  const projectId = process.env.PUBLIC_SANITY_PROJECT_ID ?? '';
  const dataset = process.env.PUBLIC_SANITY_DATASET ?? 'production';
  const params = new URLSearchParams({ auto: 'format', fit: 'max' });
  if (width) params.set('w', String(width));
  if (height) params.set('h', String(height));

  return (
    `https://cdn.sanity.io/images/${projectId}/${dataset}/` +
    `${id}-${dimensions}.${format}?${params}`
  );
}

/** Every field the site reads, so a route never has to know the query. */
const POST_FIELDS = `
  "id": slug.current,
  title,
  pubDate,
  description,
  author,
  image,
  "tags": tags[]->title,
  draft,
  body
`;

const LIST_ITEM_FIELDS = `
  name, href, image, subtitle, note, "tags": tags[]->title
`;

export const queries = {
  posts: `*[_type == "post"] | order(pubDate desc) { ${POST_FIELDS} }`,
  lists: `*[_type == "list"] | order(updated desc) {
    "id": slug.current, title, description, updated, ranked, thumb, draft,
    items[] { ${LIST_ITEM_FIELDS} },
    groups[] { name, description, items[] { ${LIST_ITEM_FIELDS} } }
  }`,
  projects: `*[_type == "project"] {
    "id": slug.current, title, description, icon, status, status_text,
    stack, specs, screenshots, frame, is_featured, draft,
    problem, howItWorks, lessons
  }`,
};
