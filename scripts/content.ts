import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { parse as parseYaml } from 'yaml';

/**
 * Reads `src/content/**` the way Astro reads it, for the build scripts that run
 * outside Astro: `og-card.ts` draws a card per entry, and `redirects.ts` writes
 * the address an entry used to have.
 *
 * Both need the same answer to one question: what is the address of this entry?
 * Two answers would put a card at an address that has no page, or a redirect to
 * a page that does not exist, thus the question is answered one time, here.
 *
 * Do not import the types from zod. Those types show the entry after Astro
 * reads it, but these scripts read the file first. Here a date is still a
 * string, and the artwork of a list is still a relative path.
 */
export interface Draftable {
  draft?: boolean;
  /**
   * The address of the entry, when the entry sets one. The glob loader of Astro
   * takes the id from this field, thus these scripts must take it from there
   * also. Any collection can carry one, thus it sits here.
   */
  slug?: string;
  /** Addresses the entry had before, which still must reach it. */
  aliases?: string[];
}

export interface Entry<T> {
  id: string;
  /** The directory holding the entry file. Use it to find its images. */
  dir: string;
  data: T;
}

/**
 * Whether a draft gets a page, and thus a card. It is the other half of
 * `showDrafts` in `src/lib/content.ts`, which decides the same thing for Astro.
 * The two must agree: a pull request preview sets this variable, and a page
 * that gets no card stops the build.
 *
 * There is no `import.meta.env.DEV` half here, because `pnpm dev` runs neither
 * of these scripts.
 */
const SHOW_DRAFTS = process.env.SHOW_DRAFTS === 'true';

/**
 * Finds the file of each entry in a collection, and the id Astro gives it.
 *
 * An entry is either `<name>.mdx` or `<name>/index.mdx`. The second form is
 * what lets a post hold its own images. This must give the same ids as the
 * glob loader in `src/content.config.ts`, which reads `**\/*.{md,mdx}` and
 * drops the `/index`: an id that disagrees names a card that no page asks for,
 * and leaves the card a page does ask for undrawn.
 *
 * The name of the file is only half of the id. An entry with a `slug` in its
 * frontmatter takes that instead, which `published` below applies once it has
 * read the file.
 */
function entryFiles(dir: string): { id: string; file: string }[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    if (item.isDirectory()) {
      const file = join(dir, item.name, 'index.mdx');
      return existsSync(file) ? [{ id: item.name, file }] : [];
    }

    return /\.mdx?$/.test(item.name)
      ? [
          {
            id: basename(item.name, extname(item.name)),
            file: join(dir, item.name),
          },
        ]
      : [];
  });
}

/**
 * Stops the build when two entries claim one address.
 *
 * Astro writes a warning and keeps the last of the two, thus the other entry
 * loses its page while the build stays green: the address serves the wrong
 * post, and nothing on the site says so. A `slug` makes the collision easy to
 * write, because the address no longer has to be a filename to be unique.
 *
 * An old address counts as much as a current one. A post that takes the alias
 * of another post gets its page, and the redirect to that alias then points at
 * a page that belongs to someone else.
 *
 * The check sits here because these scripts are the only readers of the content
 * directory outside Astro. By the time a route runs, the loader has already
 * dropped one of the two and there is nothing left to compare.
 *
 * Drafts count. A draft that takes the address of a published post hides it in
 * `pnpm dev` and in a preview build, which is where drafts are read.
 */
function refuseDuplicateAddresses(
  entries: { id: string; file: string; data: Draftable }[]
): void {
  const seen = new Map<string, string>();

  const claim = (address: string, file: string, kind: string) => {
    const first = seen.get(address);

    if (first === file) {
      throw new Error(
        `${file} gives "${address}" as ${kind}, and it is already the ` +
          'address of that post.\nThe redirect would point at itself. An ' +
          '`aliases` entry names an address the post had before, thus it is ' +
          'never the address the post has now.'
      );
    }

    if (first) {
      throw new Error(
        `Two entries claim the address "${address}":\n  ${first}\n  ${file}\n` +
          `The second claims it as ${kind}. An address comes from the \`slug\` ` +
          'of an entry, from an `aliases` entry it had before, or from the ' +
          'name of its file. Astro keeps the last one it reads and the other ' +
          'entry gets no page. Give one of the two another slug.'
      );
    }

    seen.set(address, file);
  };

  for (const { id, file, data } of entries) {
    claim(id, file, 'its slug');

    for (const alias of data.aliases ?? [])
      claim(alias, file, 'an old address');
  }
}

/**
 * Reads the frontmatter of each entry in a collection. It gives the published
 * entries, the most recent one first.
 *
 * These scripts do not run in Astro, thus they cannot call `getPublished`. But
 * they must agree with that function. A draft has no page, thus it must have no
 * card.
 *
 * A `slug` in the frontmatter wins over the name of the file, because that is
 * what the glob loader of Astro does with it: the page of the entry is at that
 * address, thus its card carries that name also.
 */
export function published<T extends Draftable>(
  dir: string,
  date: (data: T) => string
): Entry<T>[] {
  const entries = entryFiles(dir).map(({ id, file }) => {
    const data = parseYaml(
      readFileSync(file, 'utf8').split(/^---$/m)[1] ?? ''
    ) as T;

    return { id: data.slug ?? id, dir: dirname(file), data, file };
  });

  refuseDuplicateAddresses(entries);

  return entries
    .filter((entry) => SHOW_DRAFTS || entry.data.draft !== true)
    .sort(
      (a, b) =>
        new Date(date(b.data)).valueOf() - new Date(date(a.data)).valueOf()
    );
}
