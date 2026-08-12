#!/usr/bin/env node
/**
 * Fetches the artwork for a list's entries and writes it next to the list.
 *
 *   node scripts/list-artwork.mjs podcasts              # dry run: show matches
 *   node scripts/list-artwork.mjs podcasts --write      # download + convert
 *   node scripts/list-artwork.mjs podcasts --write --only "Syntax" --term "Syntax fm"
 *
 * A dry run marks every inexact match CHECK. Re-run one of those with --only
 * and a --term that disambiguates it; the file is still named after the entry,
 * so the frontmatter never has to know the search was different.
 *
 * The `lists` schema takes `image()`, so an entry's artwork is a path relative
 * to its own .mdx. This writes `src/content/lists/artwork/<list>/<slug>.webp`
 * and prints the `image:` lines to paste in; it deliberately does not edit the
 * frontmatter, because a search result is a guess and the guess needs a human.
 *
 * Sources, by list `thumb` shape:
 *
 *   square  Apple's public iTunes Search API (no key). Podcast and album art.
 *   poster  TMDB. Apple's movie storefront search returns nothing as of 2026,
 *           so it cannot be used here. Needs a free token in TMDB_API_KEY,
 *           read from `.env` automatically -- see `.env.example`.
 *
 * Artwork is downloaded at 600px and re-encoded to 512px webp. Nothing in
 * src/ ships as-is -- astro:assets re-encodes at build time for the size it
 * actually renders -- so this number only decides how much headroom a future
 * redesign has, and how much the repo carries.
 */
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { slugify } from '../src/lib/slug.ts';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LISTS = join(ROOT, 'src/content/lists');
const EDGE = 512;

// Node reads .env natively from 20.6, so the token does not have to be exported
// by hand or a dependency added to parse it. Missing is fine -- only poster
// lists need one, and an already-exported variable still wins.
try {
  process.loadEnvFile(join(ROOT, '.env'));
} catch {
  /* no .env, or this Node cannot read one; findPoster reports the real error */
}

const [, , listName, ...flags] = process.argv;
const write = flags.includes('--write');

/** Re-fetch entries that already have artwork, e.g. after changing quality. */
const force = flags.includes('--force');

// indexOf returns -1 when the flag is absent, and flags[-1 + 1] is the first
// flag rather than undefined -- which silently filters every entry out.
const onlyAt = flags.indexOf('--only');
const only = onlyAt === -1 ? null : flags[onlyAt + 1];

/** Overrides the search text for a single entry, to correct a bad match. */
const termAt = flags.indexOf('--term');
const term = termAt === -1 ? null : flags[termAt + 1];

if (!listName) {
  console.error('usage: node scripts/list-artwork.mjs <list> [--write]');
  process.exit(1);
}

/**
 * Reads the entry names and the list's thumb shape straight out of the .mdx.
 *
 * This parses the frontmatter by hand rather than pulling in a YAML dependency:
 * it only needs `thumb`, the `- name:` lines, and whether an entry already has
 * an `image:`, and a real parse would still not tell it which entry is which
 * once the file is rewritten.
 *
 * A grouped list has `- name:` at two depths -- the group's and the entry's --
 * and only the deeper one is a thing to fetch artwork for. They are told apart
 * by indentation against the enclosing `items:` key, which is the only reliable
 * signal without a real parse: a group's name sits above its `items:`, an
 * entry's below it.
 */
async function readList(name) {
  const path = join(LISTS, `${name}.mdx`);
  const src = await readFile(path, 'utf8');
  const front = src.split('---')[1] ?? '';

  const thumb = /^thumb:\s*'?(\w+)'?/m.exec(front)?.[1] ?? 'square';
  const entries = [];
  let itemsIndent = null;

  for (const line of front.split('\n')) {
    const indent = line.length - line.trimStart().length;

    if (/^\s*items:/.test(line)) {
      itemsIndent = indent;
      continue;
    }

    const named = /^\s*-\s+name:\s*(.+)$/.exec(line);
    if (named) {
      if (itemsIndent !== null && indent > itemsIndent) {
        entries.push({ name: unquote(named[1]), imagePath: null });
      }
      continue;
    }

    const image = /^\s*image:\s*(.+)$/.exec(line);
    if (image && entries.length) {
      // Recorded as a resolved path, not a boolean: an entry can name artwork
      // that is not on disk, and treating that as "already done" makes the
      // script silently skip exactly the files that need fetching.
      entries.at(-1).imagePath = join(LISTS, unquote(image[1]));
    }
  }

  return { path, thumb, entries };
}

/** Frontmatter values are single-quoted, double-quoted, or bare. */
function unquote(value) {
  const trimmed = value.trim();
  const quoted = /^(['"])(.*)\1$/.exec(trimmed);
  return (quoted ? quoted[2] : trimmed).replace(/''/g, "'");
}

/** Titles carry their year for disambiguation; the search should not. */
function searchTerm(name) {
  return name.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

async function findSquare(name) {
  const query = new URLSearchParams({
    term: searchTerm(name),
    entity: 'podcast',
    limit: '1',
  });
  const res = await fetch(`https://itunes.apple.com/search?${query}`);
  if (!res.ok) throw new Error(`iTunes ${res.status}`);

  const [hit] = (await res.json()).results ?? [];
  if (!hit) return null;

  return { title: hit.collectionName, url: hit.artworkUrl600 };
}

async function findPoster(name) {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error('poster lists need TMDB_API_KEY');

  // TMDB issues two kinds of credential and they authenticate differently: the
  // v3 API key is a 32-character hex string passed as a query parameter, the v4
  // read access token is a JWT passed as a bearer header. Sending a JWT as
  // `api_key` fails with a 401 that names neither problem.
  const isToken = key.split('.').length === 3;

  const year = /\((\d{4})\)\s*$/.exec(name)?.[1];
  const query = new URLSearchParams({
    query: searchTerm(name),
    ...(year ? { year } : {}),
    ...(isToken ? {} : { api_key: key }),
  });

  const res = await fetch(
    `https://api.themoviedb.org/3/search/movie?${query}`,
    {
      headers: isToken ? { Authorization: `Bearer ${key}` } : {},
    }
  );
  if (!res.ok) throw new Error(`TMDB ${res.status}`);

  const [hit] = (await res.json()).results ?? [];
  if (!hit?.poster_path) return null;

  // w780 and not w500: this file is a master that gets re-encoded downstream,
  // and w500 is narrower than EDGE, so asking for it meant upscaling a 500px
  // poster to 512 and then handing the invented pixels to the build to shrink.
  return {
    title: `${hit.title} (${(hit.release_date ?? '').slice(0, 4)})`,
    url: `https://image.tmdb.org/t/p/w780${hit.poster_path}`,
  };
}

/**
 * Downloads to a temp file and hands it to cwebp, which is the one image tool
 * on this machine that both formats arrive in and webp comes out of. The temp
 * file is removed whether or not the encode succeeds.
 */
async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`artwork ${res.status}`);

  const temp = `${dest}.download`;
  await writeFile(temp, Buffer.from(await res.arrayBuffer()));

  try {
    // `-resize` is passed only when the source is genuinely wider than EDGE.
    // cwebp will happily scale up, and an upscaled master hands invented pixels
    // to the build to shrink again -- soft artwork that no delivery-side
    // quality setting can recover.
    const width = await sourceWidth(temp);
    const resize = width > EDGE ? ['-resize', String(EDGE), '0'] : [];

    // This is a master, not a delivery file: it is re-encoded again at build
    // time, so its own artifacts compound. Encode it well above delivery
    // quality and let the build make the small, lossy copies.
    await run('cwebp', ['-q', '90', ...resize, temp, '-o', dest]);
  } finally {
    await unlink(temp).catch(() => {});
  }
}

/** Pixel width of a downloaded file, via the one identify tool always present. */
async function sourceWidth(file) {
  try {
    const { stdout } = await run('sips', ['-g', 'pixelWidth', file]);
    return Number(/pixelWidth:\s*(\d+)/.exec(stdout)?.[1] ?? 0);
  } catch {
    return 0;
  }
}

const list = await readList(listName);
const find = list.thumb === 'poster' ? findPoster : findSquare;
const outDir = join(LISTS, 'artwork', listName);

if (write) await mkdir(outDir, { recursive: true });

console.log(
  `${listName} — ${list.entries.length} entries, ${list.thumb} artwork`
);
console.log(
  write ? `writing to ${outDir}\n` : 'dry run, pass --write to download\n'
);

const paste = [];

for (const entry of list.entries) {
  if (only && entry.name !== only) continue;

  // Present in the frontmatter *and* on disk. A `--force` re-fetch overrides.
  if (entry.imagePath && existsSync(entry.imagePath) && !force) {
    console.log(`  skip  ${entry.name} — already has artwork`);
    continue;
  }

  let hit;
  try {
    hit = await find(term && only ? term : entry.name);
  } catch (error) {
    console.log(`  FAIL  ${entry.name} — ${error.message}`);
    continue;
  }

  if (!hit) {
    console.log(`  MISS  ${entry.name} — no result, add the file by hand`);
    continue;
  }

  // A search result is a guess. Flag the ones a human needs to look at.
  const exact = hit.title.toLowerCase() === entry.name.toLowerCase();
  const mark = exact ? '  ok  ' : ' CHECK';
  const file = `${slugify(entry.name)}.webp`;

  console.log(`${mark}  ${entry.name}${exact ? '' : `  ->  ${hit.title}`}`);
  paste.push(`  ${entry.name}: ./artwork/${listName}/${file}`);

  if (write) await download(hit.url, join(outDir, file));

  // Apple throttles an unauthenticated caller that hammers it.
  await new Promise((resolve) => setTimeout(resolve, 350));
}

if (paste.length) {
  console.log('\nAdd an `image:` to each entry, alongside its `name:`:\n');
  for (const line of paste) console.log(line);
}
