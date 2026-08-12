/**
 * Stops the build when two entries claim one address. Astro only writes a
 * warning and keeps the last of the two, thus the other entry loses its page
 * and nothing on the site says so. It counts a draft, because a preview build
 * shows drafts.
 *
 * It sits apart from `og-card.ts` because that script opens Chrome as it loads,
 * thus a test cannot read it.
 */
export function refuseDuplicateAddresses(
  entries: { id: string; file: string }[]
): void {
  const seen = new Map<string, string>();

  for (const { id, file } of entries) {
    const first = seen.get(id);

    if (first) {
      throw new Error(
        `Two entries claim the address "${id}":\n  ${first}\n  ${file}\n` +
          'An address comes from the `slug` of an entry, or from the name of ' +
          'its file when it sets none. Astro keeps the last one it reads and ' +
          'the other entry gets no page. Give one of the two another slug.'
      );
    }

    seen.set(id, file);
  }
}
