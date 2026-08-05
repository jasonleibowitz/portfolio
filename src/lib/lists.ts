import type { CollectionEntry } from 'astro:content';

type List = CollectionEntry<'lists'>['data'];
type Item = List['items'][number];

/** Every entry in a list, whether it is grouped or flat. */
export function allItems(list: List): Item[] {
  return list.groups.length
    ? list.groups.flatMap((group) => group.items)
    : list.items;
}

/** Tags across a list with their counts, most-used first. */
export function listTags(list: List): { tag: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const item of allItems(list)) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
