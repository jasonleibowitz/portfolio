import { execFileSync } from 'node:child_process';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import sharp from 'sharp';
import { parse as parseYaml } from 'yaml';

/**
 * Rebuilds every raster a link preview needs. They are committed to `public/`
 * rather than generated at build time:
 *
 *   og/default.jpg       the card for any page with nothing of its own
 *   og/writing.jpg       /writing
 *   og/lists.jpg         /lists
 *   og/post/<id>.jpg     one per published post
 *   og/list/<id>.jpg     one per published list
 *   apple-touch-icon.png what iMessage and iOS fall back to
 *
 * Run it after adding a post or a list, and after changing the headshot, the
 * role line or the palette:
 *
 *   node scripts/og-card.mjs
 *
 * A route asks for its card through `shareCard()` in `src/lib/og.ts`, which
 * fails the build when the file is absent. A new post therefore cannot ship
 * with a stale or missing card without the build saying so.
 *
 * Cards are laid out in HTML and shot with headless Chrome rather than composed
 * in sharp, because sharp rasterizes SVG text with system fonts and this site's
 * typefaces are npm packages. Chrome loads the same woff2 files the site
 * serves. Chrome is a local tool here, not a dependency: CI never runs this, it
 * reads the committed images.
 *
 * Every card is dark, in both themes. `og:image` is one URL and a scrape
 * carries no theme signal, so a page cannot offer a light card and a dark card
 * and let the client choose. One card serves both, and the dark one is the
 * better of the two in iMessage, where most bubbles are dark already.
 */

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Tokens copied from `:root[data-theme='dark']` in `src/styles/theme.css`,
 * which is where they are owned.
 */
const CANVAS = '#16161f';
const PANEL = 'rgb(255 255 255 / 0.07)';
const LINE = 'rgb(255 255 255 / 0.13)';
const LINE_STRONG = 'rgb(255 255 255 / 0.22)';
const INK = '#f4f2fb';
const MUTED = '#c2becf';
const FAINT = '#948fa8';
const VIOLET = '#a99bff';
const CYAN = '#5fdff2';
const GLOW_A = 'rgb(125 95 255 / 0.2)';
const GLOW_B = 'rgb(70 205 235 / 0.14)';
const LIFT = '0 12px 38px rgb(0 0 0 / 0.42)';
const SPECTRUM = `linear-gradient(100deg, ${VIOLET}, ${CYAN})`;

/**
 * The orbit avatar, measured off the running hero and scaled up. Every value
 * is a ratio of the hero's 250px ring, so the card cannot drift from
 * `OrbitAvatar.astro` by a rounding decision made twice.
 */
const RING = 300;
const SCALE = RING / 250;
const INSET = Math.round(14 * SCALE);
const DOT = Math.round(8 * SCALE);

/**
 * Where the orbiting dot rests, read as a clock face.
 *
 * The hero's dot never stops, so no angle is the true one. This one avoids the
 * two that read as something other than an orbit: 12 looks like a deliberate
 * mark on the crown, and 3 lines up with the role line and becomes a bullet
 * pointing at it.
 */
const DOT_OCLOCK = 2;
const dotAngle = (DOT_OCLOCK / 12) * 2 * Math.PI;
const dotLeft = Math.round((RING + RING * Math.sin(dotAngle) - DOT) / 2);
const dotTop = Math.round((RING - RING * Math.cos(dotAngle) - DOT) / 2);

/** The same two lines the homepage `<title>` states, so a card cannot drift. */
const NAME = 'Jason Leibowitz';
const ROLE = 'Full-stack engineer in New York';
const DOMAIN = 'leibowitz.me';

/* ------------------------------------------------------------------ assets */

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

/** Chrome gets every asset inline, so a card never depends on a served file. */
const dataUri = (path) =>
  `data:${MIME[extname(path).toLowerCase()]};base64,${readFileSync(
    path
  ).toString('base64')}`;

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
/* The favicon is already a hand-kept copy of `Monogram.astro`. Reading it here
   keeps the mark at two copies rather than three. */
const monogram = dataUri('public/favicon.svg');

/* ----------------------------------------------------------------- content */

/**
 * Published entries of a collection, newest first, read straight from the
 * frontmatter.
 *
 * The script runs outside Astro and so cannot call `getPublished`, but it must
 * agree with it: a draft has no page, so it must have no card either.
 */
function published(dir, dateField) {
  return readdirSync(dir)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => ({
      id: basename(file, extname(file)),
      dir,
      data: parseYaml(
        readFileSync(join(dir, file), 'utf8').split(/^---$/m)[1] ?? ''
      ),
    }))
    .filter((entry) => entry.data.draft !== true)
    .sort((a, b) => new Date(b.data[dateField]) - new Date(a.data[dateField]));
}

/** Matches `formatDay()` in `src/lib/dates.ts`: a plain day, read in UTC. */
const formatDay = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

/** Every item of a list, flat, the way `allItems()` in `src/lib/lists.ts` does. */
const allItems = (data) =>
  data.items?.length ? data.items : (data.groups ?? []).flatMap((g) => g.items);

const escape = (text) =>
  String(text).replace(
    /[&<>]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]
  );

/* ------------------------------------------------------------------- shell */

/**
 * The frame every card shares: the canvas, the aurora, and the signature.
 *
 * One shell rather than five, so a link preview reads as one family whichever
 * page produced it, and so the palette lives in one place.
 */
const shell = (main) => `<!doctype html>
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
    /* The page's aurora, in px because a card has a fixed size. */
    background-image:
      radial-gradient(460px 460px at 12% 8%, ${GLOW_A}, transparent 62%),
      radial-gradient(410px 410px at 88% 22%, ${GLOW_B}, transparent 60%),
      radial-gradient(480px 480px at 60% 92%, ${GLOW_A}, transparent 65%);
  }

  main { flex: 1; display: flex; align-items: center; min-height: 0; }

  /* Uppercase mono label, the caption role in src/lib/typography.ts. */
  .eyebrow {
    font: 400 20px/1 'JetBrains Mono';
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${FAINT};
  }
  .meta { font: 400 20px/1.6 'JetBrains Mono'; letter-spacing: 0.06em; color: ${FAINT}; }

  h1 { font-family: 'Space Grotesk'; font-weight: 700; letter-spacing: -0.04em; color: ${INK}; }
  .lead { font: 500 30px/1.35 'Inter'; color: ${MUTED}; }

  .rule {
    width: 116px;
    height: 6px;
    border-radius: 3px;
    background-image: ${SPECTRUM};
  }

  /* The signature. Every card ends the same way, so the family is legible even
     when the cards themselves are not alike. */
  footer { display: flex; align-items: center; gap: 14px; flex: none; }
  footer img { width: 34px; height: 34px; }
  footer span { font: 600 24px/1 'Inter'; letter-spacing: 0.01em; color: ${VIOLET}; }
</style>
${main}
<footer>
  <img src="${monogram}" alt="" />
  <span>${DOMAIN}</span>
</footer>
`;

/* ------------------------------------------------------------------- cards */

/** Home, About, Projects and anything else with no picture of its own. */
const defaultCard = () =>
  shell(`
<style>
  /* The hero's OrbitAvatar, held still. The ring and the dot are the shape a
     reader already associates with the site, so the card and the page it opens
     read as the same object. */
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
  /* Sized, not just inset: an absolutely positioned replaced element falls
     back to its intrinsic 500px if width and height are left to the insets. */
  .orbit img {
    position: absolute;
    inset: ${INSET}px;
    width: ${RING - 2 * INSET}px;
    height: ${RING - 2 * INSET}px;
    border-radius: 50%;
    object-fit: cover;
    box-shadow: ${LIFT};
  }
  main { gap: 64px; }
  h1 { font-size: 72px; line-height: 1.05; }
  .lead { margin-top: 18px; }
  .rule { margin-top: 32px; }
</style>
<main>
  <div class="orbit"><img src="${headshot}" alt="" /></div>
  <div>
    <h1>${NAME}</h1>
    <p class="lead">${ROLE}</p>
    <div class="rule"></div>
  </div>
</main>`);

/**
 * `/writing`, showing the three most recent posts.
 *
 * A section index has no single picture, so the card shows what the page is a
 * list of. Real titles say "writing" more plainly than any icon would.
 */
const writingCard = (posts) =>
  shell(`
<style>
  main { gap: 56px; }
  .side { flex: none; width: 470px; }
  h1 { font-size: 108px; line-height: 1; }
  .eyebrow + h1 { margin-top: 16px; }
  .lead { margin-top: 20px; font-size: 26px; }
  .rule { margin-top: 28px; }
  .recent {
    border: 1px solid ${LINE};
    border-radius: 18px;
    background: ${PANEL};
    padding: 8px 30px;
  }
  .recent li { list-style: none; padding: 22px 0; border-top: 1px solid ${LINE}; }
  .recent li:first-child { border-top: 0; }
  .recent .date { font: 400 17px/1 'JetBrains Mono'; letter-spacing: 0.06em; color: ${FAINT}; }
  .recent .title {
    margin-top: 10px;
    font: 600 25px/1.25 'Inter';
    color: ${INK};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
<main>
  <div>
    <p class="eyebrow">Archive</p>
    <h1>Writing</h1>
    <p class="lead">${escape(
      "Long reviews of hardware I probably didn't need to buy, plus the occasional how-to."
    )}</p>
    <div class="rule"></div>
  </div>
  <ul class="recent side">
    ${posts
      .slice(0, 3)
      .map(
        (post) => `<li>
      <p class="date">${formatDay(post.data.pubDate).toUpperCase()}</p>
      <p class="title">${escape(post.data.title)}</p>
    </li>`
      )
      .join('')}
  </ul>
</main>`);

/**
 * One list's artwork, fanned the way `ListRow.astro` fans it: leftmost on top,
 * overlapped, each cover ringed in the canvas colour so two similar covers do
 * not merge.
 */
function fan(entry, { width, limit }) {
  const poster = entry.data.thumb === 'poster';
  const height = poster ? Math.round((width * 3) / 2) : width;
  const covers = allItems(entry.data)
    .filter((item) => item.image)
    .slice(0, limit);

  return `<div class="fan">${covers
    .map((item, i) => {
      const file = resolve(entry.dir, item.image);
      return `<img src="${dataUri(file)}" alt="" style="
        width: ${width}px;
        height: ${height}px;
        z-index: ${covers.length - i};
        margin-left: ${i === 0 ? 0 : -Math.round(width * 0.36)}px;
      " />`;
    })
    .join('')}</div>`;
}

const FAN_CSS = `
  .fan { display: flex; align-items: flex-start; }
  .fan img {
    flex: none;
    object-fit: cover;
    border: 1px solid ${LINE};
    border-radius: 14px;
    box-shadow: 0 0 0 4px ${CANVAS}, ${LIFT};
  }`;

/**
 * `/lists`, showing each published list's own fan under its title.
 *
 * The headline is the page's own, not the word "Lists": the eyebrow already
 * says which section this is, and repeating it wastes the one line that could
 * say what the section is for.
 */
const listsCard = (lists) => {
  const entries = lists.reduce(
    (sum, list) => sum + allItems(list.data).length,
    0
  );

  return shell(`
<style>
  ${FAN_CSS}
  main { gap: 56px; }
  .copy { flex: 1; min-width: 0; }
  h1 { font-size: 66px; line-height: 1.06; }
  .eyebrow + h1 { margin-top: 16px; }
  .rule { margin-top: 28px; }
  .meta { margin-top: 24px; text-transform: uppercase; }
  .stacks { flex: none; display: flex; flex-direction: column; gap: 34px; align-items: flex-end; }
  .stack .name { margin-bottom: 12px; text-align: right; font: 600 22px/1 'Inter'; color: ${INK}; }
</style>
<main>
  <div class="copy">
    <p class="eyebrow">Lists</p>
    <h1>Things, ranked and sorted</h1>
    <div class="rule"></div>
    <p class="meta">${lists.length} lists · ${entries} entries</p>
  </div>
  <div class="stacks">
    ${lists
      .map(
        (list) => `<div class="stack">
      <p class="name">${escape(list.data.title)}</p>
      ${fan(list, { width: 88, limit: 5 })}
    </div>`
      )
      .join('')}
  </div>
</main>`);
};

/**
 * A post's own card: its cover beside its title.
 *
 * The cover alone used to be the `og:image`, which made every post's card a
 * different shape and told a reader nothing about which post they were being
 * shown. Here the cover is one element of a 1200x630 card that also carries
 * the title, the date and the site's signature.
 */
const postCard = (post) => {
  const title = post.data.title;
  /* Set by length, so a 52-character headline and a 20-character one both fill
     the column instead of one overflowing it. */
  const size = title.length > 46 ? 54 : title.length > 30 ? 64 : 76;

  return shell(`
<style>
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
  }
</style>
<main>
  <div class="copy">
    <p class="eyebrow">Writing · ${formatDay(post.data.pubDate)}</p>
    <h1>${escape(title)}</h1>
    <div class="rule"></div>
  </div>
  <img class="cover" src="${dataUri(join('public', post.data.image.url))}" alt="" />
</main>`);
};

/** A list's own card: the fan from its page, over its title and its counts. */
const listCard = (list) => {
  const items = allItems(list.data);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const shape = list.data.ranked
    ? 'Ranked'
    : list.data.groups?.length
      ? plural(list.data.groups.length, 'section', 'sections')
      : null;
  const meta = [
    plural(items.length, 'entry', 'entries'),
    shape,
    `Updated ${formatDay(list.data.updated)}`,
  ].filter(Boolean);

  return shell(`
<style>
  ${FAN_CSS}
  main { flex-direction: column; align-items: flex-start; justify-content: center; gap: 40px; }
  h1 { font-size: 76px; line-height: 1.05; }
  .eyebrow + h1 { margin-top: 16px; }
  .meta { margin-top: 16px; text-transform: uppercase; }
</style>
<main>
  ${fan(list, { width: list.data.thumb === 'poster' ? 116 : 134, limit: 6 })}
  <div>
    <p class="eyebrow">Lists</p>
    <h1>${escape(list.data.title)}</h1>
    <p class="meta">${meta.join(' · ')}</p>
  </div>
</main>`);
};

/* ------------------------------------------------------------------ render */

const scratch = mkdtempSync(join(tmpdir(), 'og-card-'));

/**
 * Shoots one card and writes it as JPEG.
 *
 * Every card carries a photograph, which PNG stores losslessly and at four
 * times the weight. At quality 92 with no chroma subsampling the difference is
 * invisible on the headline, which is the only part a lossy codec could hurt.
 */
async function shoot(html, out) {
  const page = join(scratch, 'card.html');
  const raw = join(scratch, 'shot.png');
  writeFileSync(page, html);
  mkdirSync(dirname(out), { recursive: true });

  execFileSync(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${raw}`,
    `file://${page}`,
  ]);

  await sharp(raw)
    .jpeg({ quality: 92, chromaSubsampling: '4:4:4' })
    .toFile(out);
}

const posts = published('src/content/blog', 'pubDate');
const lists = published('src/content/lists', 'updated');

/* Cleared first, so a card whose post was deleted or drafted does not linger
   in `public/` as an orphan nothing links to. */
rmSync('public/og', { recursive: true, force: true });

const cards = [
  ['public/og/default.jpg', defaultCard()],
  ['public/og/writing.jpg', writingCard(posts)],
  ['public/og/lists.jpg', listsCard(lists)],
  ...posts.map((post) => [`public/og/post/${post.id}.jpg`, postCard(post)]),
  ...lists.map((list) => [`public/og/list/${list.id}.jpg`, listCard(list)]),
];

for (const [out, html] of cards) await shoot(html, out);

/**
 * The touch icon comes straight from the favicon, whose monogram is drawn in
 * paths -- no text, so sharp can rasterize it without a font.
 *
 * Two changes on the way through. The corner radius goes, because iOS masks the
 * icon itself and a rounded source leaves the mask's corners empty; and the
 * result is flattened, because a touch icon with an alpha channel renders over
 * black on some surfaces.
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
