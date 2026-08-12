/**
 * Makes the address of an entry from its title: no accents, small letters,
 * single dashes. A writer can do that in their head, thus the address the
 * editor offers is never a surprise.
 *
 * An apostrophe goes, and does not become a dash. "Don't" is one word to a
 * reader, thus `dont` and not `don-t`.
 */
export function slugify(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
