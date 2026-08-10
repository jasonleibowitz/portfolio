import type { CollectionEntry } from 'astro:content';
import { byTagName } from './content';

type List = CollectionEntry<'lists'>['data'];
type Item = List['items'][number];

/** Every entry in a list, whether it is grouped or flat. */
export function allItems(list: List): Item[] {
  // Copied rather than returned as-is. `List` is a union of the file-backed
  // and Sanity schemas, so `items` is `A[] | B[]`, which TypeScript will not
  // hand back as the `(A | B)[]` this promises. A fresh array is that type.
  return list.groups.length
    ? list.groups.flatMap((group): Item[] => [...group.items])
    : [...list.items];
}

/** Tags across a list with their counts, alphabetical. */
export function listTags(list: List): { tag: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const item of allItems(list)) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort(byTagName);
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
