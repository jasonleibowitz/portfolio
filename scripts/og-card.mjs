import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';

/**
 * Rebuilds the two raster assets a link preview needs, which are committed to
 * `public/` rather than generated at build time:
 *
 *   og-default.png      1200x630, the share card for every page with no image
 *   apple-touch-icon.png  180x180, what iMessage and iOS use when there is none
 *
 * Run it after changing the headshot, the role line or the palette:
 *
 *   node scripts/og-card.mjs
 *
 * The card is laid out in HTML and shot with headless Chrome rather than
 * composed in sharp, because sharp rasterizes SVG text with system fonts and
 * the site's two typefaces are npm packages. Chrome loads the same woff2 files
 * the site serves, so the card is set in Space Grotesk and Inter and not in a
 * fallback. Chrome is a local tool here, not a dependency: CI never runs this,
 * it reads the committed PNGs.
 *
 * The card is dark in both themes. `og:image` is one URL, and a scrape carries
 * no theme signal, so a page cannot offer a light card and a dark card and let
 * the client choose. One card must serve both, and the dark one is the better
 * of the two in iMessage, where most bubbles are already dark.
 */

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

/**
 * Tokens copied from `:root[data-theme='dark']` in `src/styles/theme.css`,
 * which is where they are owned.
 */
const CANVAS = '#16161f';
const PANEL = 'rgb(255 255 255 / 0.07)';
const LINE = 'rgb(255 255 255 / 0.13)';
const INK = '#f4f2fb';
const MUTED = '#c2becf';
const VIOLET = '#a99bff';
const CYAN = '#5fdff2';
const GLOW_A = 'rgb(125 95 255 / 0.2)';
const GLOW_B = 'rgb(70 205 235 / 0.14)';

/** The same two lines the homepage `<title>` states, so a card cannot drift. */
const NAME = 'Jason Leibowitz';
const ROLE = 'Full-stack engineer in New York';
const DOMAIN = 'leibowitz.me';

const dataUri = (path, mime) =>
  `data:${mime};base64,${readFileSync(path).toString('base64')}`;

const grotesk = dataUri(
  'node_modules/@fontsource-variable/space-grotesk/files/space-grotesk-latin-wght-normal.woff2',
  'font/woff2'
);
const inter = dataUri(
  'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  'font/woff2'
);
/**
 * The headshot with its white studio background made transparent.
 *
 * The photo is shot on white, which disappears into the light page but becomes
 * a bright disc on this canvas. A flood fill from the border finds the
 * background: it walks inward through pale pixels, so the teeth and the white
 * squares of the shirt stay opaque because neither one touches an edge. A
 * sub-pixel blur on the alpha channel alone keeps the hair from stepping.
 */
async function cutBackground(file) {
  /** At or above this, a pixel the fill reaches counts as background. */
  const PALE = 225;

  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  const background = new Uint8Array(width * height);
  const pending = [];

  const visit = (x, y) => {
    const pixel = y * width + x;
    if (background[pixel]) return;
    const i = pixel * channels;
    if (Math.min(data[i], data[i + 1], data[i + 2]) < PALE) return;
    background[pixel] = 1;
    pending.push(pixel);
  };

  for (let x = 0; x < width; x++) {
    visit(x, 0);
    visit(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    visit(0, y);
    visit(width - 1, y);
  }

  while (pending.length) {
    const pixel = pending.pop();
    const x = pixel % width;
    const y = (pixel - x) / width;
    if (x > 0) visit(x - 1, y);
    if (x < width - 1) visit(x + 1, y);
    if (y > 0) visit(x, y - 1);
    if (y < height - 1) visit(x, y + 1);
  }

  for (let pixel = 0; pixel < width * height; pixel++) {
    if (background[pixel]) data[pixel * channels + 3] = 0;
  }

  const raw = { width, height, channels };
  const cut = sharp(data, { raw });
  const alpha = await cut.clone().extractChannel(3).blur(0.7).toBuffer();

  return sharp(await cut.clone().removeAlpha().toBuffer(), {
    raw: { width, height, channels: 3 },
  })
    .joinChannel(alpha, { raw: { width, height, channels: 1 } })
    .png()
    .toBuffer();
}

const headshot = `data:image/png;base64,${(
  await cutBackground('src/images/headshot.png')
).toString('base64')}`;

const html = `<!doctype html>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'Space Grotesk';
    src: url('${grotesk}') format('woff2-variations');
    font-weight: 300 700;
  }
  @font-face {
    font-family: 'Inter';
    src: url('${inter}') format('woff2-variations');
    font-weight: 100 900;
  }
  * { margin: 0; box-sizing: border-box; }
  body {
    width: 1200px;
    height: 630px;
    display: flex;
    align-items: center;
    gap: 72px;
    padding: 0 88px;
    background-color: ${CANVAS};
    /* The page's aurora, in px because the card has a fixed size. */
    background-image:
      radial-gradient(460px 460px at 12% 8%, ${GLOW_A}, transparent 62%),
      radial-gradient(410px 410px at 88% 22%, ${GLOW_B}, transparent 60%),
      radial-gradient(480px 480px at 60% 92%, ${GLOW_A}, transparent 65%);
  }
  /* The circle is a panel behind the cutout, not a crop of the photo, so the
     surround takes the page's own raised surface instead of white. */
  img {
    width: 340px;
    height: 340px;
    flex: none;
    border-radius: 50%;
    object-fit: cover;
    background: ${PANEL};
    box-shadow: inset 0 0 0 1px ${LINE};
  }
  h1 {
    font: 700 76px/1.05 'Space Grotesk';
    letter-spacing: -0.02em;
    color: ${INK};
  }
  p {
    margin-top: 20px;
    font: 500 34px/1.3 'Inter';
    color: ${MUTED};
  }
  hr {
    width: 132px;
    height: 6px;
    margin: 40px 0 0;
    border: 0;
    border-radius: 3px;
    background-image: linear-gradient(100deg, ${VIOLET}, ${CYAN});
  }
  small {
    display: block;
    margin-top: 24px;
    font: 600 26px/1 'Inter';
    letter-spacing: 0.01em;
    color: ${VIOLET};
  }
</style>
<img src="${headshot}" alt="" />
<div>
  <h1>${NAME}</h1>
  <p>${ROLE}</p>
  <hr />
  <small>${DOMAIN}</small>
</div>
`;

const scratch = mkdtempSync(join(tmpdir(), 'og-card-'));
const page = join(scratch, 'card.html');
writeFileSync(page, html);

execFileSync(CHROME, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--force-device-scale-factor=1',
  '--window-size=1200,630',
  '--screenshot=public/og-default.png',
  `file://${page}`,
]);

await sharp('public/og-default.png')
  .png({ compressionLevel: 9, palette: false })
  .toFile(join(scratch, 'og.png'));
writeFileSync('public/og-default.png', readFileSync(join(scratch, 'og.png')));

/**
 * The touch icon comes straight from the favicon, whose monogram is drawn in
 * paths -- no text, so sharp can rasterize it without a font.
 *
 * Two changes on the way through. The corner radius goes, because iOS masks
 * the icon itself and a rounded source leaves the mask's corners empty; and
 * the result is flattened, because a touch icon with an alpha channel renders
 * over black on some surfaces.
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

for (const file of ['public/og-default.png', 'public/apple-touch-icon.png']) {
  const { width, height } = await sharp(file).metadata();
  const { size } = statSync(file);
  console.log(`${file}  ${width}x${height}  ${Math.round(size / 1024)}kB`);
}
