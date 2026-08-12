import { getCollection, type CollectionEntry } from 'astro:content';

/**
 * Drafts render in development, and in a preview build that sets SHOW_DRAFTS.
 * A preview URL shows an unpublished post in the real design. `PROD` alone
 * limited this to `pnpm dev`.
 */
const showDrafts = import.meta.env.DEV || process.env.SHOW_DRAFTS === 'true';

/** Collections that hold draftable, publishable entries. */
export type PublishableCollection = 'blog' | 'lists' | 'projects';
export type PublishableEntry = CollectionEntry<PublishableCollection>;

/** Posts are dated by publication, lists by when they were last touched. */
function sortDate(entry: PublishableEntry): number {
  if (entry.collection === 'blog') return entry.data.pubDate.valueOf();
  if (entry.collection === 'lists') return entry.data.updated.valueOf();
  return 0;
}

/**
 * Each collection sorts by whatever "most relevant first" means for it: posts
 * and lists by date, projects by an explicit `order` -- unordered projects fall
 * to the end, alphabetised.
 */
function compare(a: PublishableEntry, b: PublishableEntry): number {
  if (a.collection === 'projects' && b.collection === 'projects') {
    const ao = a.data.order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.data.order ?? Number.MAX_SAFE_INTEGER;
    return ao - bo || a.data.title.localeCompare(b.data.title);
  }

  return sortDate(b) - sortDate(a);
}

/**
 * Every read of publishable content goes through here.
 *
 * Draft handling used to live in the index pages only, which meant `draft: true`
 * posts were still built to disk and syndicated in the RSS feed -- they were
 * unlinked rather than unpublished. Centralising it means a route cannot
 * accidentally opt out by forgetting to filter.
 *
 * Drafts are visible while developing and excluded from production builds.
 */
export async function getPublished<C extends PublishableCollection>(
  collection: C
): Promise<CollectionEntry<C>[]> {
  const entries = await getCollection(collection, ({ data }) => {
    return showDrafts ? true : data.draft !== true;
  });

  return (entries as PublishableEntry[]).sort(compare) as CollectionEntry<C>[];
}

/**
 * Where a post lives, for every link the site writes to one.
 *
 * `post.id` is the post's address rather than its filename: the glob loader
 * takes the id from the `slug` in frontmatter and falls back to the file only
 * when there is none. So a post can be renamed, or given a folder whose date
 * prefix nobody wants in a URL, without any link here changing.
 */
export function postHref(post: CollectionEntry<'blog'>): string {
  return `/writing/${post.id}/`;
}

/**
 * Tag rails read as an index, so they sort by name rather than by popularity:
 * a reader looking for one tag scans for where it should be, and a
 * frequency-ordered rail has no such place. `numeric` keeps decade tags in
 * order, so `100s` would follow `90s` instead of leading the list.
 *
 * Shared with `listTags` so the two rails cannot drift apart.
 */
export function byTagName(a: { tag: string }, b: { tag: string }): number {
  return a.tag.localeCompare(b.tag, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

/**
 * Tags across published posts with their counts, alphabetical. The Writing
 * rail shows the count beside each tag, so counting here keeps the routes from
 * each rolling their own.
 */
export async function getPublishedTags(): Promise<
  { tag: string; count: number }[]
> {
  const posts = await getPublished('blog');
  const counts = new Map<string, number>();

  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort(byTagName);
}
