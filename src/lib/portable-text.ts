/**
 * The shape of the Portable Text this site renders.
 *
 * Written here rather than pulled from `@portabletext/types`, because that
 * package describes the whole open spec and this describes one dataset: the
 * blocks the schemas in `studio/` can produce, and the fields
 * `PortableText.astro` reads. A block type added to a schema is added here,
 * which is the point -- a renderer that silently drops an unknown block is
 * exactly the failure this type is meant to catch.
 */

/**
 * The prose of a body, for anything that measures rather than renders it.
 *
 * A Sanity entry's `body` is an array of blocks, so `entry.body` -- the raw
 * source string an `.mdx` entry carries -- is empty. Reading time and word
 * count read that string, and without this every post from Sanity reported
 * "0 words".
 */
export function plainText(blocks: PortableBlock[] | undefined): string {
  return (blocks ?? [])
    .filter((block) => block._type === 'block')
    .map((block) => (block.children ?? []).map((c) => c.text ?? '').join(''))
    .join('\n\n');
}

/** A run of text inside a block, carrying decorators and keys into `markDefs`. */
export type PortableSpan = {
  _type?: string;
  _key?: string;
  text?: string;
  /** Either a decorator name (`strong`, `em`, `code`) or a `markDefs` key. */
  marks?: string[];
};

/** An annotation a span points at by key, of which `link` is the only one. */
export type PortableMarkDef = {
  _key: string;
  _type: string;
  href?: string;
};

/**
 * One node of a body.
 *
 * Deliberately one type rather than a union per `_type`. Narrowing by `_type`
 * would be stricter, but every field here is already optional because Sanity
 * only stores what an editor filled in, so a union would buy precision the
 * data does not have.
 */
export type PortableBlock = {
  _type?: string;
  _key?: string;
  style?: string;
  /** Set on a block that is a bullet or numbered item. */
  listItem?: string;
  children?: PortableSpan[];
  markDefs?: PortableMarkDef[];
  /** On an `image` block. */
  asset?: { _ref?: string };
  alt?: string;
  caption?: string;
  attribution?: { href?: string; text?: string };
  /** On a `code` block. */
  code?: string;
  language?: string;
};
