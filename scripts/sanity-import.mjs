#!/usr/bin/env node
/**
 * One-way migration of the MDX collections into Sanity, for evaluation.
 *
 *   node scripts/sanity-import.mjs                 # write content.ndjson
 *   npx sanity dataset import content.ndjson production --replace
 *
 * Emits NDJSON rather than calling the write API, so the import runs under the
 * CLI's own credentials and the repo never needs an editor token. Images are
 * declared with `_sanityAsset` and a file:// URL, which the importer uploads.
 *
 * This is a spike-quality migration and deliberately one-way: the .mdx files
 * stay untouched, so Tina and Sanity can be compared against the same content.
 * Raw HTML in a body (the embedded tweet in the eSIM post) is dropped rather
 * than half-converted, because a broken embed reads as a bug in Sanity when it
 * is really a gap here.
 */
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT = join(ROOT, 'src/content');
const PUBLIC = join(ROOT, 'public');

/** Splits `---\nfrontmatter\n---\nbody` without a markdown dependency. */
function splitFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) throw new Error('no frontmatter');
  return { data: parseYaml(match[1]) ?? {}, body: match[2] };
}

let keyCounter = 0;
/** Portable Text needs a stable `_key` on every array member. */
const key = () => `k${(keyCounter++).toString(36)}`;

/**
 * Inline markdown to Portable Text spans.
 *
 * Handles the marks this site actually uses -- bold, italic, inline code and
 * links -- and leaves anything else as literal text. A general markdown parser
 * would be the right answer for production; for judging an editor, the prose
 * being correct matters more than the long tail.
 */
function toSpans(text) {
  const spans = [];
  const markDefs = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|(?<!\w)_([^_]+)_(?!\w)|`([^`]+)`/g;
  let last = 0;
  let m;

  const push = (value, marks = []) => {
    if (value) spans.push({ _type: 'span', _key: key(), text: value, marks });
  };

  while ((m = pattern.exec(text))) {
    push(text.slice(last, m.index));
    if (m[1]) {
      const defKey = key();
      markDefs.push({ _type: 'link', _key: defKey, href: m[2] });
      push(m[1], [defKey]);
    } else if (m[3]) push(m[3], ['strong']);
    else if (m[4]) push(m[4], ['em']);
    else if (m[5]) push(m[5], ['code']);
    last = m.index + m[0].length;
  }
  push(text.slice(last));

  return { spans, markDefs };
}

const block = (style, text) => {
  const { spans, markDefs } = toSpans(text);
  return { _type: 'block', _key: key(), style, markDefs, children: spans };
};

/**
 * Block-level markdown to Portable Text.
 *
 * Recognises headings, fenced code, list items, images and paragraphs. JSX and
 * raw HTML are skipped -- see the note at the top of this file.
 */
function toPortableText(body) {
  const out = [];
  const lines = body.split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line.trim()) continue;

    if (/^\s*<CaptionedImage/.test(line)) {
      // Collect the whole element: these are written across several lines.
      const jsx = [];
      while (i < lines.length && !lines[i].includes('/>')) jsx.push(lines[i++]);
      jsx.push(lines[i] ?? '');
      const el = jsx.join(' ');
      const prop = (name) =>
        el.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? undefined;
      const src = prop('src');
      if (src) {
        out.push({
          _type: 'image',
          _key: key(),
          alt: prop('alt') ?? prop('caption') ?? '',
          caption: prop('caption'),
          _sanityAsset: `image@file://${join(PUBLIC, src.replace(/^\//, ''))}`,
        });
      }
      continue;
    }

    // Any other raw HTML or JSX is skipped rather than half-converted.
    if (/^\s*<\/?[A-Za-z]/.test(line)) {
      while (i < lines.length && lines[i].trim() !== '') i += 1;
      continue;
    }

    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const code = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith('```')) code.push(lines[i++]);
      out.push({
        _type: 'code',
        _key: key(),
        language: fence[1] || 'text',
        code: code.join('\n'),
      });
      continue;
    }

    const heading = line.match(/^(#{2,3})\s+(.*)$/);
    if (heading) {
      out.push(block(heading[1].length === 2 ? 'h2' : 'h3', heading[2]));
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/);
    if (image) {
      out.push({
        _type: 'image',
        _key: key(),
        alt: image[1],
        _sanityAsset: `image@file://${join(PUBLIC, image[2])}`,
      });
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      out.push({ ...block('normal', bullet[1]), listItem: 'bullet', level: 1 });
      continue;
    }

    const numbered = line.match(/^\s*\d+\.\s+(.*)$/);
    if (numbered) {
      out.push({ ...block('normal', numbered[1]), listItem: 'number', level: 1 });
      continue;
    }

    out.push(block('normal', line));
  }

  return out;
}

/** `public/`-relative path to the `_sanityAsset` form the importer understands. */
const publicAsset = (url) =>
  url ? `image@file://${join(PUBLIC, url.replace(/^\//, ''))}` : undefined;

/** A path relative to an entry file, used by list artwork and project icons. */
const relativeAsset = (dir, rel) =>
  rel ? `image@file://${resolve(dir, rel)}` : undefined;

async function readCollection(name) {
  const dir = join(CONTENT, name);
  const files = (await readdir(dir)).filter((f) => f.endsWith('.mdx'));
  return Promise.all(
    files.map(async (file) => {
      const raw = await readFile(join(dir, file), 'utf8');
      return { id: basename(file, '.mdx'), dir, ...splitFrontmatter(raw) };
    })
  );
}

const slug = (current) => ({ _type: 'slug', current });

/** A date field wants `YYYY-MM-DD`; yaml hands back a Date at UTC midnight. */
const day = (value) =>
  value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '');

/** Every tag seen across the content, so the vocabulary is created once. */
const tags = new Set();
const tagRef = (name) => {
  tags.add(name);
  return { _type: 'reference', _key: key(), _ref: `tag-${name}` };
};
const tagRefs = (list) => (list ?? []).map(tagRef);

/**
 * Splits a project body on its `##` headings into the named sections the
 * schema now defines, so the three questions stay in the same order on every
 * project instead of being whatever the author typed.
 */
const PROJECT_SECTIONS = {
  'the problem': 'problem',
  'how it works': 'howItWorks',
  "what i'd do differently": 'lessons',
};

function splitSections(body) {
  const sections = {};
  let current = null;
  const buffer = [];

  const flush = () => {
    if (current) sections[current] = toPortableText(buffer.join('\n'));
    buffer.length = 0;
  };

  for (const line of body.split('\n')) {
    const heading = line.match(/^##\s+(.*)$/);
    if (heading) {
      flush();
      current = PROJECT_SECTIONS[heading[1].trim().toLowerCase()] ?? null;
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();
  return sections;
}

/** The spec rail's rows, keyed by the label they used to carry. */
const SPEC_FIELDS = {
  platform: 'platform',
  client: 'client',
  backend: 'backend',
  status: 'status',
  started: 'started',
};

const toSpecs = (specs) =>
  (specs ?? []).reduce((acc, { label, value }) => {
    const field = SPEC_FIELDS[String(label).trim().toLowerCase()];
    if (field) acc[field] = value;
    return acc;
  }, {});

const listItem = (item, dir) => ({
  _type: 'listItem',
  _key: key(),
  name: item.name,
  href: item.href,
  subtitle: item.subtitle,
  note: item.note,
  tags: tagRefs(item.tags),
  ...(item.image ? { image: { _sanityAsset: relativeAsset(dir, item.image) } } : {}),
});

async function main() {
  const docs = [];

  for (const post of await readCollection('blog')) {
    docs.push({
      _id: `post-${post.id}`,
      _type: 'post',
      title: post.data.title,
      slug: slug(post.id),
      pubDate: day(post.data.pubDate),
      description: post.data.description ?? '',
      author: post.data.author,
      tags: tagRefs(post.data.tags),
      draft: post.data.draft ?? false,
      ...(post.data.image?.url
        ? {
            image: {
              _sanityAsset: publicAsset(post.data.image.url),
              alt: post.data.image.alt,
            },
          }
        : {}),
      body: toPortableText(post.body),
    });
  }

  for (const list of await readCollection('lists')) {
    docs.push({
      _id: `list-${list.id}`,
      _type: 'list',
      title: list.data.title,
      slug: slug(list.id),
      description: list.data.description ?? '',
      updated: day(list.data.updated),
      ranked: list.data.ranked ?? false,
      thumb: list.data.thumb ?? 'square',
      draft: list.data.draft ?? false,
      items: (list.data.items ?? []).map((i) => listItem(i, list.dir)),
      groups: (list.data.groups ?? []).map((g) => ({
        _type: 'group',
        _key: key(),
        name: g.name,
        description: g.description,
        items: (g.items ?? []).map((i) => listItem(i, list.dir)),
      })),
    });
  }

  for (const project of await readCollection('projects')) {
    docs.push({
      _id: `project-${project.id}`,
      _type: 'project',
      title: project.data.title,
      slug: slug(project.id),
      description: project.data.description,
      status: project.data.status,
      status_text: project.data.status_text,
      stack: project.data.stack ?? [],
      frame: project.data.frame ?? 'phone',
      is_featured: project.data.is_featured ?? false,
      draft: project.data.draft ?? false,
      specs: toSpecs(project.data.specs),
      ...(project.data.icon
        ? { icon: { _sanityAsset: relativeAsset(project.dir, project.data.icon) } }
        : {}),
      ...splitSections(project.body),
    });
  }

  for (const name of tags) {
    docs.push({
      _id: `tag-${name}`,
      _type: 'tag',
      title: name,
      slug: { _type: 'slug', current: name },
    });
  }

  const out = join(ROOT, 'content.ndjson');
  await writeFile(out, docs.map((d) => JSON.stringify(d)).join('\n') + '\n');

  const counts = docs.reduce((acc, d) => {
    acc[d._type] = (acc[d._type] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`wrote ${docs.length} documents to ${out}`);
  console.log(counts);
}

await main();
