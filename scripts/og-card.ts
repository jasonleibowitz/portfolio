import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from 'node:fs';
import { basename, dirname, extname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { launch } from 'puppeteer-core';
import { parse as parseYaml } from 'yaml';
/* Node 24 removes the types when it reads this file. Thus the script can read
   the page headings from the same file as the pages, and no person must type
   them a second time. `.nvmrc` sets that version of Node. Node 22 needs the
   option --experimental-strip-types for this import. */
import { LISTS, WRITING } from '../src/lib/site.ts';

/**
 * Makes each image that a link preview needs, in `public/`, as the first part of
 * `pnpm build`:
 *
 *   og/default.jpg       a page with no image of its own
 *   og/writing.jpg       /writing
 *   og/lists.jpg         /lists
 *   og/post/<id>.jpg     one for each published post
 *   og/list/<id>.jpg     one for each published list
 *   apple-touch-icon.png what iMessage and iOS use if there is no other image
 *
 * No card is in git. Each build makes them again, in CI also, thus a card
 * always agrees with its page and no person must remember to make one.
 *
 * Each card is an HTML page and Chrome makes the image, because sharp shows SVG
 * text in a font of the operating system and this site gets its fonts from npm.
 * The GitHub runner has Chrome. `pnpm dev` does not run this; use `pnpm cards`
 * to see a card during development.
 *
 * Each card is dark in both themes: `og:image` is one address, and a web
 * crawler does not say which theme it wants.
 */

/**
 * Finds Chrome on this computer. It is macOS here and Linux on the GitHub
 * runner, which has Chrome. Set `CHROME_PATH` for a different location.
 */
function findChrome() {
  const candidates: string[] = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter((path) => path !== undefined);

  const found = candidates.find((path) => existsSync(path));
  if (found) return found;

  throw new Error(
    `No Chrome found. Looked in:\n  ${candidates.join('\n  ')}\n` +
      'Set CHROME_PATH, or install Chrome. The share cards are built with it.'
  );
}

const CHROME = findChrome();

/** Each card uses these settings. */
const JPEG = { quality: 92, chromaSubsampling: '4:4:4' };
const WIDTH = 1200;
const HEIGHT = 630;

/* ------------------------------------------------------------------ palette */

const THEME_CSS = 'src/styles/theme.css';

/**
 * Gets one block of `theme.css`. `opener` is the text before the block.
 *
 * A block stops at the first `}` in column one. Each rule in a block has an
 * indent, the `@keyframes` rules in `@theme` also. Thus the `}` of a rule in a
 * block does not stop the search too soon.
 */
function block(css: string, opener: string): string {
  const start = css.indexOf(opener);
  if (start === -1) throw new Error(`No ${opener} block in ${THEME_CSS}`);

  const open = css.indexOf('{', start);
  const close = css.indexOf('\n}', open);
  if (close === -1) throw new Error(`Unterminated ${opener} in ${THEME_CSS}`);

  return css.slice(open, close);
}

/**
 * Reads the dark colors from `theme.css`, the file that holds them. Do not copy
 * the values here: a copy is a second place to change, and no test compares the
 * two.
 *
 * It reads `@theme` first, then `:root[data-theme='dark']` over it, which is
 * the sequence that a browser uses.
 */
function darkPalette(): (name: string) => string {
  /* Remove the comments first. A comment can contain a `;`. */
  const css = readFileSync(THEME_CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const tokens = new Map<string, string>();

  for (const source of [
    block(css, '@theme'),
    block(css, ":root[data-theme='dark']"),
  ]) {
    for (const [, name, value] of source.matchAll(
      /(--[\w-]+)\s*:\s*([^;]+);/g
    )) {
      tokens.set(name, value.trim().replace(/\s+/g, ' '));
    }
  }

  return (name) => {
    const value = tokens.get(name);
    /* Stop here. If the script continues, the CSS gets the value `undefined`,
       and the build makes an incorrect card and reports no error. */
    if (!value) throw new Error(`No ${name} in ${THEME_CSS}`);
    return value;
  };
}

const token = darkPalette();

const CANVAS = token('--color-canvas');
const PANEL = token('--color-panel');
const LINE = token('--color-line');
const LINE_STRONG = token('--color-line-strong');
const INK = token('--color-ink');
const MUTED = token('--color-muted');
const FAINT = token('--color-faint');
const VIOLET = token('--color-violet');
const CYAN = token('--color-cyan');
const GLOW_A = token('--color-glow-a');
const GLOW_B = token('--color-glow-b');
const LIFT = token('--shadow-lift');
/* The same 100deg gradient as `spectrum-fill` and `text-gradient` in
   utilities.css. Those are Tailwind utilities, not tokens, thus this script
   cannot read them. */
const SPECTRUM = `linear-gradient(100deg, ${VIOLET}, ${CYAN})`;

/**
 * The orbit avatar. The values come from the home page, measured in a browser,
 * and this script increases them.
 *
 * Each value is a ratio of the 250px ring on the home page. Thus the card and
 * `OrbitAvatar.astro` agree, and no person calculates the same value two times.
 */
const RING = 300;
const SCALE = RING / 250;
const INSET = Math.round(14 * SCALE);
const DOT = Math.round(8 * SCALE);

/**
 * The position of the dot, as a position on a clock face.
 *
 * The dot on the home page moves continuously, thus no angle is the correct
 * one. Do not use 12 or 3. At 12 the dot looks like a mark on the top of the
 * head. At 3 the dot is level with the role text, and looks like a mark that
 * points at it.
 */
const DOT_OCLOCK = 2;
const dotAngle = (DOT_OCLOCK / 12) * 2 * Math.PI;
const dotLeft = Math.round((RING + RING * Math.sin(dotAngle) - DOT) / 2);
const dotTop = Math.round((RING - RING * Math.cos(dotAngle) - DOT) / 2);

/** The same two lines as the `<title>` of the home page. */
const NAME = 'Jason Leibowitz';
const ROLE = 'Full-stack engineer in New York';
const DOMAIN = 'leibowitz.me';

/* ------------------------------------------------------------------ assets */

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/**
 * Puts a file into the HTML as data. Thus Chrome does not request a file from a
 * server, and a card is complete without one.
 *
 * If the extension is not in the list, the function stops. If it continues, the
 * address contains the word `undefined`. A browser accepts that address and
 * shows no image, thus the card has no picture and there is no error message.
 */
function dataUri(path: string): string {
  const type = MIME[extname(path).toLowerCase()];
  if (!type) throw new Error(`No MIME type known for ${path}`);

  return `data:${type};base64,${readFileSync(path).toString('base64')}`;
}

const grotesk = dataUri(
  'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2'
);
const inter = dataUri(
  'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2'
);
const mono = dataUri(
  'node_modules/@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2'
);
const headshot = dataUri('src/images/headshot.png');
/* The favicon is already a copy of `Monogram.astro` that a person keeps
   correct. Read it here, and there are two copies of the mark and not three. */
const monogram = dataUri('public/favicon.svg');

/* ----------------------------------------------------------------- content */

/**
 * The frontmatter fields that these cards use. This is a part of the schemas in
 * `src/content.config.ts`.
 *
 * Do not import the types from zod. Those types show the entry after Astro
 * reads it, but this script reads the file first. Here a date is still a
 * string, and the artwork of a list is still a relative path.
 */
interface Draftable {
  draft?: boolean;
}

interface PostData extends Draftable {
  title: string;
  pubDate: string;
  image: { url: string; alt: string };
}

interface ListItem {
  name: string;
  /** Relative to the entry file, e.g. `./artwork/podcasts/up-first.webp`. */
  image?: string;
}

interface ListData extends Draftable {
  title: string;
  updated: string;
  ranked?: boolean;
  thumb?: 'square' | 'poster';
  items?: ListItem[];
  groups?: { name: string; items: ListItem[] }[];
}

interface Entry<T> {
  id: string;
  /** The collection directory. Use it to find the artwork of an item. */
  dir: string;
  data: T;
}

/**
 * Whether a draft gets a page, and thus a card. It is the other half of
 * `showDrafts` in `src/lib/content.ts`, which decides the same thing for Astro.
 * The two must agree: a pull request preview sets this variable, and a page
 * that gets no card stops the build.
 *
 * There is no `import.meta.env.DEV` half here, because `pnpm dev` does not run
 * this script.
 */
const SHOW_DRAFTS = process.env.SHOW_DRAFTS === 'true';

/**
 * Reads the frontmatter of each entry in a collection. It gives the published
 * entries, the most recent one first.
 *
 * This script does not run in Astro, thus it cannot call `getPublished`. But it
 * must agree with that function. A draft has no page, thus it must have no
 * card.
 */
function published<T extends Draftable>(
  dir: string,
  date: (data: T) => string
): Entry<T>[] {
  return readdirSync(dir)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => ({
      id: basename(file, extname(file)),
      dir,
      data: parseYaml(
        readFileSync(join(dir, file), 'utf8').split(/^---$/m)[1] ?? ''
      ) as T,
    }))
    .filter((entry) => SHOW_DRAFTS || entry.data.draft !== true)
    .sort(
      (a, b) =>
        new Date(date(b.data)).valueOf() - new Date(date(a.data)).valueOf()
    );
}

/** Each item of a list, in one array, as `allItems()` in `src/lib/lists.ts`. */
const allItems = (data: ListData): ListItem[] =>
  data.items?.length ? data.items : (data.groups ?? []).flatMap((g) => g.items);

const ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

const escape = (text: string): string =>
  text.replace(/[&<>]/g, (c) => ESCAPES[c]!);

/* ------------------------------------------------------------------- shell */

/**
 * The parts that each card has: the background, the glow, and the name of the
 * site at the bottom.
 *
 * There is one shell and not five. Thus each link preview looks like part of
 * one set, and the colors are in one place.
 */
/**
 * Markup and the CSS that the markup needs, in one value.
 *
 * The CSS of a component must not be a separate constant. If it is, each card
 * that uses the component must also remember to put that constant in its own
 * style block, and a card that does not do this shows markup with no style and
 * reports no error.
 */
type Part = { css: string; html: string };

/**
 * Makes the part for one card: the CSS of the card, the markup of the card, and
 * each part that the markup contains.
 *
 * The function removes CSS that is the same, thus a card can use one component
 * two times. The `/lists` card does this: it shows two groups of artwork.
 */
function card(css: string, html: string, ...used: Part[]): Part {
  return {
    css: [...new Set([...used.map((part) => part.css), css])].join('\n'),
    html,
  };
}

const shell = ({ css, html }: Part) => `<!doctype html>
<meta charset="utf-8" />
<style>
  @font-face { font-family: 'Space Grotesk'; src: url('${grotesk}') format('woff2-variations'); font-weight: 300 700; }
  @font-face { font-family: 'Inter'; src: url('${inter}') format('woff2-variations'); font-weight: 100 900; }
  @font-face { font-family: 'JetBrains Mono'; src: url('${mono}') format('woff2'); font-weight: 400; }

  * { margin: 0; box-sizing: border-box; }

  body {
    width: ${WIDTH}px;
    height: ${HEIGHT}px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 56px 76px;
    background-color: ${CANVAS};
    /* The glow of the site, in px because a card has one size. */
    background-image:
      radial-gradient(460px 460px at 12% 8%, ${GLOW_A}, transparent 62%),
      radial-gradient(410px 410px at 88% 22%, ${GLOW_B}, transparent 60%),
      radial-gradient(480px 480px at 60% 92%, ${GLOW_A}, transparent 65%);
  }

  main { flex: 1; display: flex; align-items: center; min-height: 0; }

  /*
    No text on a card is smaller than 30px.

    A card is 1200px wide and a message program shows it at approximately 350px,
    thus divide each size here by 3.5. The 12px caption size of the site becomes
    less than 4px. A card therefore shows few things, each one large, and no
    counts and no dates.
  */
  .eyebrow {
    font: 400 30px/1 'JetBrains Mono';
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${FAINT};
  }

  h1 { font-family: 'Space Grotesk'; font-weight: 700; letter-spacing: -0.04em; color: ${INK}; }
  .lead { font: 500 34px/1.35 'Inter'; color: ${MUTED}; }

  .rule {
    width: 116px;
    height: 6px;
    border-radius: 3px;
    background-image: ${SPECTRUM};
  }

  /* The bottom of each card is the same. Thus a person sees that the cards are
     part of one set, although the cards show different things. */
  footer { display: flex; align-items: center; gap: 16px; flex: none; }
  footer img { width: 44px; height: 44px; }
  footer span { font: 600 32px/1 'Inter'; letter-spacing: 0.01em; color: ${VIOLET}; }

${css}
</style>
${html}
<footer>
  <img src="${monogram}" alt="" />
  <span>${DOMAIN}</span>
</footer>
`;

/* ------------------------------------------------------------------- cards */

/**
 * The OrbitAvatar of the home page, but it does not move. A person knows the
 * ring and the dot from the site. Thus the card and the page look the same.
 */
const Orbit = (): Part => ({
  css: `
  .orbit {
    position: relative;
    width: ${RING}px;
    height: ${RING}px;
    flex: none;
    border: 1px dashed ${LINE_STRONG};
    border-radius: 50%;
  }
  .orbit::after {
    content: '';
    position: absolute;
    top: ${dotTop}px;
    left: ${dotLeft}px;
    width: ${DOT}px;
    height: ${DOT}px;
    border-radius: 50%;
    background-image: ${SPECTRUM};
    box-shadow: 0 0 ${Math.round(12 * SCALE)}px ${GLOW_A};
  }
  /* Give a width and a height. An image with position absolute uses its own
     size of 500px if you give only the insets. */
  .orbit img {
    position: absolute;
    inset: ${INSET}px;
    width: ${RING - 2 * INSET}px;
    height: ${RING - 2 * INSET}px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: ${LIFT};
  }`,
  html: `<div class="orbit"><img src="${headshot}" alt="" /></div>`,
});

/** For the home page, About, Projects, and each page with no image. */
function defaultCard(): Part {
  const orbit = Orbit();

  return card(
    `
  main { gap: 64px; }
  h1 { font-size: 72px; line-height: 1.05; }
  .lead { margin-top: 18px; }
  .rule { margin-top: 32px; }`,
    `<main>
  ${orbit.html}
  <div>
    <h1>${NAME}</h1>
    <p class="lead">${ROLE}</p>
    <div class="rule"></div>
  </div>
</main>`,
    orbit
  );
}

/**
 * The card for `/writing`. It shows the two most recent posts.
 *
 * This page has no single image, thus the card shows the items on the page. The
 * titles of real posts show the subject of the page better than an icon.
 */
const writingCard = (posts: Entry<PostData>[]): Part =>
  card(
    `
  main { gap: 52px; }
  .copy { flex: 1; min-width: 0; }
  h1 { font-size: 104px; line-height: 1; }
  .eyebrow + h1 { margin-top: 16px; }
  .lead { margin-top: 22px; }
  .rule { margin-top: 30px; }
  /* Two titles, not three, and no dates. Both changes give more space for the
     text. A third row makes each title too small. A date must be smaller than
     the title, and text that small is not legible on a card. */
  .recent {
    flex: none;
    width: 520px;
    border: 1px solid ${LINE};
    border-radius: 18px;
    background: ${PANEL};
    padding: 4px 32px;
  }
  .recent li { list-style: none; padding: 34px 0; border-top: 1px solid ${LINE}; }
  .recent li:first-child { border-top: 0; }
  /* Put the line-clamp property on the inner element, not on the element with
     the padding. An element with padding shows the three dots at line two, but
     it also shows line three in the padding, across the edge of the panel. */
  .recent span {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    font: 600 40px/1.25 'Inter';
    color: ${INK};
  }`,
    `<main>
  <div class="copy">
    <p class="eyebrow">${escape(WRITING.eyebrow)}</p>
    <h1>${escape(WRITING.headline)}</h1>
    <p class="lead">${escape(WRITING.description)}</p>
    <div class="rule"></div>
  </div>
  <ul class="recent">
    ${posts
      .slice(0, 2)
      .map((post) => `<li><span>${escape(post.data.title)}</span></li>`)
      .join('')}
  </ul>
</main>`
  );

/**
 * The artwork of one list, in the arrangement that `ListRow.astro` uses. The
 * images overlap, the image on the left is on top, and each image has a border
 * in the background color. Thus two images of similar color stay separate.
 */
function Fan(
  entry: Entry<ListData>,
  { width, limit }: { width: number; limit: number }
): Part {
  const poster = entry.data.thumb === 'poster';
  const height = poster ? Math.round((width * 3) / 2) : width;
  const covers = allItems(entry.data)
    .filter((item) => item.image !== undefined)
    .slice(0, limit);

  return {
    css: `
  .fan { display: flex; align-items: flex-start; }
  .fan img {
    flex: none;
    object-fit: cover;
    border: 1px solid ${LINE};
    border-radius: 14px;
    box-shadow: 0 0 0 4px ${CANVAS}, ${LIFT};
  }`,
    html: `<div class="fan">${covers
      .map((item, i) => {
        const file = resolve(entry.dir, item.image!);
        return `<img src="${dataUri(file)}" alt="" style="
        width: ${width}px;
        height: ${height}px;
        z-index: ${covers.length - i};
        margin-left: ${i === 0 ? 0 : -Math.round(width * 0.36)}px;
      " />`;
      })
      .join('')}</div>`,
  };
}

/**
 * How many lists the `/lists` card shows. Three stacks fill the column. A
 * fourth goes below the bottom edge, where `overflow: hidden` removes it, and
 * no gate reports this: a gate does not look at an image.
 *
 * `published()` sorts by `updated`, thus these are the newest three. The
 * Writing card keeps the newest two posts for the same reason.
 */
const MAX_STACKS = 3;

/**
 * The card for `/lists`. It shows the artwork of the most recent lists, below
 * the title of each one.
 *
 * A list with no artwork does not go on this card. `image` is optional on an
 * item, thus such a list is correct content, but it gives a title above an
 * empty space, which reads as a picture that did not arrive. Do not draw a
 * substitute picture: a fan is five tiles wide, and five copies of the same
 * tile take more attention than the space does and say less. Such a list keeps
 * its page and its own card, and it goes on this card when it gets artwork.
 *
 * The heading is the heading of the page, not the word "Lists". The small label
 * above it already gives the name of the section. If the heading gives it a
 * second time, the card does not tell the reader what the section contains.
 */
function listsCard(lists: Entry<ListData>[]): Part {
  const stacks = lists
    .filter((list) => allItems(list.data).some((item) => item.image))
    .slice(0, MAX_STACKS)
    .map((list) => ({
      list,
      art: Fan(list, { width: 108, limit: 5 }),
    }));

  return card(
    `
  main { gap: 52px; }
  .copy { flex: 1; min-width: 0; }
  h1 { font-size: 68px; line-height: 1.06; }
  .eyebrow + h1 { margin-top: 16px; }
  .rule { margin-top: 30px; }
  .stacks { flex: none; display: flex; flex-direction: column; gap: 32px; align-items: flex-end; }
  .stack .name { margin-bottom: 14px; text-align: right; font: 600 32px/1 'Inter'; color: ${INK}; }`,
    `<main>
  <div class="copy">
    <p class="eyebrow">${escape(LISTS.eyebrow)}</p>
    <h1>${escape(LISTS.headline)}</h1>
    <div class="rule"></div>
  </div>
  <div class="stacks">
    ${stacks
      .map(
        ({ list, art }) => `<div class="stack">
      <p class="name">${escape(list.data.title)}</p>
      ${art.html}
    </div>`
      )
      .join('')}
  </div>
</main>`,
    ...stacks.map(({ art }) => art)
  );
}

/**
 * The card for one post. It shows the cover image of the post and its title.
 *
 * Do not use the cover image as the `og:image`. Each cover image has a
 * different size, and a cover image alone does not tell the reader which post
 * it is. This card is always 1200x630, and it also shows the title and the name
 * of the site.
 */
function postCard(post: Entry<PostData>): Part {
  const title = post.data.title;
  /* The size comes from the number of characters. Thus a title of 52
     characters and a title of 20 characters both fill the column. */
  const size = title.length > 46 ? 54 : title.length > 30 ? 64 : 76;

  return card(
    `
  main { gap: 56px; }
  .copy { flex: 1; min-width: 0; }
  h1 { font-size: ${size}px; line-height: 1.08; }
  .eyebrow + h1 { margin-top: 18px; }
  .rule { margin-top: 30px; }
  .cover {
    flex: none;
    width: 372px;
    height: 372px;
    object-fit: cover;
    border: 1px solid ${LINE};
    border-radius: 18px;
    box-shadow: ${LIFT};
  }`,
    `<main>
  <div class="copy">
    <p class="eyebrow">${escape(WRITING.title)}</p>
    <h1>${escape(title)}</h1>
    <div class="rule"></div>
  </div>
  <img class="cover" src="${dataUri(join('public', post.data.image.url))}" alt="" />
</main>`
  );
}

/**
 * The card for one list. It shows the artwork of the list and its title.
 *
 * Do not add the number of entries, the type of list, or the date. Each of
 * these is less important than the title, thus each must be smaller than the
 * title. The title is 80px, and a smaller line is not legible when a person
 * sees the card at one third of this size.
 */
function listCard(list: Entry<ListData>): Part {
  const art = Fan(list, {
    width: list.data.thumb === 'poster' ? 124 : 148,
    limit: 6,
  });

  return card(
    `
  main { flex-direction: column; align-items: flex-start; justify-content: center; gap: 46px; }
  h1 { font-size: 80px; line-height: 1.05; }
  .eyebrow + h1 { margin-top: 18px; }`,
    `<main>
  ${art.html}
  <div>
    <p class="eyebrow">${escape(LISTS.eyebrow)}</p>
    <h1>${escape(list.data.title)}</h1>
  </div>
</main>`,
    art
  );
}

/* ------------------------------------------------------------------ render */

/** The path of the file to write, and the HTML that makes it. */
type Card = [out: string, html: string];

/**
 * Makes an image of each card and writes it as a JPEG file.
 *
 * One Chrome for all the cards: Chrome needs 2.5 seconds to start and almost no
 * time to show a card. Ten cards took 28 seconds with one Chrome for each, and
 * take three seconds through one browser.
 *
 * Chrome makes a PNG and sharp writes the JPEG. Do not let Chrome write the
 * JPEG: it selects 4:2:0 chroma subsampling, which puts color errors on the
 * edges of the letters. A JPEG because each card contains a photograph, which a
 * PNG keeps at four times the size.
 */
async function shoot(cards: Card[]) {
  const browser = await launch({
    executablePath: CHROME,
    args: [
      /* The sandbox of Chrome is off, because CI runs this script also, and
         Chrome opens only HTML that this script made. On some CI computers
         `/dev/shm` is small, and Chrome stops instead of using a different
         memory area. */
      '--no-sandbox',
      '--disable-dev-shm-usage',
      /* Keep both of these. The GPU makes the edges of the letters and the
         steps of a gradient different, thus a computer with a different GPU
         makes a different card. With software rendering, each computer makes
         the same image. */
      '--disable-gpu',
      '--force-device-scale-factor=1',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: WIDTH,
      height: HEIGHT,
      deviceScaleFactor: 1,
    });

    for (const [out, html] of cards) {
      await page.setContent(html, { waitUntil: 'load' });
      /* Wait for the fonts. `load` does not wait for a font, and a card made
         too early shows a fallback font. */
      await page.evaluate(() => document.fonts.ready);

      const shot = await page.screenshot({ type: 'png' });
      mkdirSync(dirname(out), { recursive: true });
      await sharp(shot).jpeg(JPEG).toFile(out);
    }
  } finally {
    await browser.close();
  }
}

const posts = published<PostData>('src/content/blog', (d) => d.pubDate);
const lists = published<ListData>('src/content/lists', (d) => d.updated);

/* Delete the directory first. If you delete a post, or make it a draft, its
   card must not stay in `public/`. */
rmSync('public/og', { recursive: true, force: true });

const cards: Card[] = [
  ['public/og/default.jpg', shell(defaultCard())],
  ['public/og/writing.jpg', shell(writingCard(posts))],
  ['public/og/lists.jpg', shell(listsCard(lists))],
  ...posts.map((post): Card => [
    `public/og/post/${post.id}.jpg`,
    shell(postCard(post)),
  ]),
  ...lists.map((list): Card => [
    `public/og/list/${list.id}.jpg`,
    shell(listCard(list)),
  ]),
];

await shoot(cards);

/**
 * Makes the touch icon from the favicon. The favicon contains only paths and no
 * text, thus sharp can make an image of it without a font.
 *
 * The script makes two changes. It removes the corner radius, because iOS makes
 * the corners round, and a source that is already round leaves an empty area in
 * each corner. It also removes the alpha channel, because some surfaces show a
 * transparent icon on a black background.
 */
const squared = readFileSync('public/favicon.svg', 'utf8').replace(
  / rx="[\d.]+"/,
  ''
);

await sharp(Buffer.from(squared), { density: 720 })
  .resize(180, 180)
  .flatten()
  .png()
  .toFile('public/apple-touch-icon.png');

let total = 0;
for (const [out] of [...cards, ['public/apple-touch-icon.png']]) {
  const { size } = statSync(out);
  total += size;
  console.log(`${String(Math.round(size / 1024)).padStart(5)}kB  ${out}`);
}
console.log(`${String(Math.round(total / 1024)).padStart(5)}kB  total`);
