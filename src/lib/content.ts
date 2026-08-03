import { getCollection, type CollectionEntry } from 'astro:content';

/** Collections that hold dated, draftable, publishable entries. */
export type PublishableCollection = 'blog' | 'lists';
export type PublishableEntry = CollectionEntry<PublishableCollection>;

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

  return entries.sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()
  );
}

/** Unique tags across published blog posts, alphabetised. */
export async function getPublishedTags(): Promise<string[]> {
  const posts = await getPublished('blog');
  return [...new Set(posts.flatMap((post) => post.data.tags))].sort();
}
