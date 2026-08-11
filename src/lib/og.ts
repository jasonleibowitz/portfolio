import { existsSync } from 'node:fs';

/**
 * Gives the address of the share card of a page.
 *
 * The check finds a disagreement with `scripts/og-card.ts` about what the site
 * publishes. No gate requests the addresses that a page writes, thus a card
 * that the script did not draw becomes an `og:image` that no scraper can get.
 */
export function shareCard(name: string): string {
  const url = `/og/${name}.jpg`;

  if (import.meta.env.PROD && !existsSync(`public${url}`)) {
    throw new Error(
      `No share card at ${url}, but a page asked for one.\n` +
        'The card generator and Astro do not agree about which entries the ' +
        'site publishes. There are two usual causes: a content file changed ' +
        'after the generator part of `pnpm build` had read the directory, or ' +
        'a dev server wrote `.astro/` at the same time as the build.\n' +
        'Stop each dev server, then run `pnpm build` again.'
    );
  }

  return url;
}
