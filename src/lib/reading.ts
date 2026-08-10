import type { CollectionEntry } from 'astro:content';
import readingTime from 'reading-time';

import { plainText } from './portable-text';

/**
 * A post's prose, whichever source it came from.
 *
 * `entry.body` is the raw source of an `.mdx` file and is empty for an entry
 * loaded from Sanity, whose prose is Portable Text under `data.body`. Both
 * measurements below take a string, so this is where the two sources meet.
 */
export function postProse(post: CollectionEntry<'blog'>): string {
  return post.body || plainText('body' in post.data ? post.data.body : []);
}

/** Whole minutes, for the "12 min" on a row and "12 min read" on a post. */
export function readingMinutes(body: string | undefined): number {
  return Math.max(1, Math.ceil(readingTime(body ?? '').minutes));
}

export function wordCount(body: string | undefined): number {
  return readingTime(body ?? '').words;
}
