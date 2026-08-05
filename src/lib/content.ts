import { getCollection, type CollectionEntry } from 'astro:content';

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
    return import.meta.env.PROD ? data.draft !== true : true;
  });

  return (entries as PublishableEntry[]).sort(compare) as CollectionEntry<C>[];
}

/**
 * Tags across published posts with their counts, most-used first. The Writing
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
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
