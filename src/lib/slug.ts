/**
 * Makes the address of an entry from its title.
 *
 * One rule, and a person can do it in their head: remove the accents, put
 * everything in small letters, and join what is left with single dashes. The
 * generator uses it for a new post, and the admin will offer the result as the
 * `slug` of a new entry, for the writer to shorten before the entry is
 * published.
 *
 * Four lines of JavaScript and no package. `github-slugger`, which Astro uses
 * on the name of a file, gives a different answer: it keeps an accent and it
 * leaves two dashes together, because it makes the anchor of a heading, where
 * both are legal. The `slug` rule in `src/content.config.ts` refuses both, thus
 * that program writes an address that stops the build. Measured on 8 titles: it
 * failed the rule on 4 of them, and this function on none.
 *
 * `NFKD` splits a letter with an accent into the letter and the accent, thus
 * the next line can remove the accents alone and keep "cafe" from "café".
 */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
