import { existsSync } from 'node:fs';

/**
 * Gives the address of the share card of a page. `scripts/og-card.ts` makes
 * these files in `public/og/`, as the first part of `pnpm build`. This function
 * and that script are the only two places that know the name of a card.
 *
 * The test finds a disagreement. It is not a reminder. The script and Astro
 * each decide which entries the site publishes: the script reads the
 * frontmatter, and Astro uses `getPublished`. If the two do not agree, a page
 * gives an `og:image` address that has no file, and nothing else finds this
 * error. The four gates do not request the addresses that they write, and a web
 * crawler finds the error much later.
 *
 * The test operates in a build only, because `pnpm dev` does not make the
 * cards.
 */
export function shareCard(name: string): string {
  const url = `/og/${name}.jpg`;

  if (import.meta.env.PROD && !existsSync(`public${url}`)) {
    throw new Error(
      `No share card at ${url}, but a page asked for one. ` +
        'scripts/og-card.ts and getPublished disagree about what is published.'
    );
  }

  return url;
}
