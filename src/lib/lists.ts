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

/**
 * How much of a list a tag filter can actually reach.
 *
 * A rail that offers to narrow 19 entries while 12 of them carry no tags is a
 * broken promise: every filter is also a hidden delete. The grouped list is the
 * case that fails -- its groups are the real structure and a tag click amputates
 * five of six -- so the template asks this before rendering a rail at all.
 */
export function tagCoverage(list: List): number {
  const items = allItems(list);
  if (!items.length) return 0;

  return items.filter((item) => item.tags.length > 0).length / items.length;
}

/** `Engineering & tech` -> `engineering-tech`, for a jump-strip anchor. */
export function groupId(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Splits a trailing year out of an entry name: `The Matrix (1999)` becomes
 * `The Matrix` plus `1999`.
 *
 * The year is real data that was already being typed into the title, so the row
 * can set it as data -- mono, in the meta line, aligned down the column -- and
 * leave the title to be a title. Names without one are returned untouched; this
 * derives, it never invents.
 */
export function splitYear(name: string): { title: string; year?: string } {
  const match = /^(.*?)\s*\((\d{4})\)\s*$/.exec(name);

  return match ? { title: match[1], year: match[2] } : { title: name };
}
