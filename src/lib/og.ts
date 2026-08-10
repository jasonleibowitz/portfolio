import { existsSync } from 'node:fs';

/**
 * The share card for a page. `scripts/og-card.mjs` draws these into
 * `public/og/` as the first half of `pnpm build`, so this is the one place that
 * knows how a card is named and the script is the other.
 *
 * The check is a disagreement detector, not a reminder. The generator and Astro
 * decide separately which entries are published, one from frontmatter and one
 * through `getPublished`, and if they ever part company a page ships with an
 * `og:image` that 404s. Nothing else would notice: the gates do not fetch the
 * tags they emit, and a scraper fails much later, in someone else's chat
 * window.
 *
 * It runs only in a build, because `pnpm dev` does not draw the cards.
 */
export function shareCard(name: string): string {
  const url = `/og/${name}.jpg`;

  if (import.meta.env.PROD && !existsSync(`public${url}`)) {
    throw new Error(
      `No share card at ${url}, but a page asked for one. ` +
        'scripts/og-card.mjs and getPublished disagree about what is published.'
    );
  }

  return url;
}
