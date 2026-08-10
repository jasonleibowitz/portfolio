import { existsSync } from 'node:fs';

/**
 * Gives the address of the share card of a page. `scripts/og-card.ts` makes the
 * files, and these two are the only places that know the name of a card.
 *
 * The test finds a disagreement between that script and `getPublished` about
 * which entries the site publishes. Nothing else finds one: the four gates do
 * not request the addresses that they write. It operates in a build only,
 * because `pnpm dev` does not make the cards.
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
