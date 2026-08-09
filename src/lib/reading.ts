import readingTime from 'reading-time';

/** Whole minutes, for the "12 min" on a row and "12 min read" on a post. */
export function readingMinutes(body: string | undefined): number {
  return Math.max(1, Math.ceil(readingTime(body ?? '').minutes));
}

export function wordCount(body: string | undefined): number {
  return readingTime(body ?? '').words;
}
