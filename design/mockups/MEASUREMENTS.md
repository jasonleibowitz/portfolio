# Verification

Screenshots hide 10–20px of horizontal overflow, so nothing here was signed off
by eye. Everything was measured in Chrome against the files as they stand,
served over `http://` so same-origin frame measurement works.

## Method

Each mockup is loaded into an iframe of an exact CSS pixel width — an iframe
establishes its own layout viewport, so this measures what a phone measures —
then:

```js
document.documentElement.scrollWidth > viewportWidth; // → overflow
```

Interactive targets are measured with `getBoundingClientRect().height` on every
`<a>` and `<button>` in the header, the rendered page panel, the footer and the
dock.

## Orbit v2 (the chosen direction, with Jason's revisions)

**8 screens × 2 themes × 6 widths = 96 combinations. Zero overflow.** Tap targets
at 360px: every control and chrome link ≥44px.

With Lists promoted to a top-level destination the dock carries five tabs. At a
320px viewport that is 56×56px per tab — it fits without scrolling or wrapping,
and still clears the 44px target rule. Labels are allowed to ellipsis rather than
widen the dock.

| Width  | Device              | v2  |
| ------ | ------------------- | --- |
| 320px  | iPhone SE (1st gen) | ✅  |
| 360px  | Galaxy S series     | ✅  |
| 390px  | iPhone 12–15        | ✅  |
| 414px  | iPhone Plus, Pixel  | ✅  |
| 768px  | iPad portrait       | ✅  |
| 1280px | laptop              | ✅  |

### Bugs this round caught

| Where                   | Symptom                                      | Cause                                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Writing screen, mobile  | **+400px at 320px** (and +306 at 414)        | The tag rail is a flex row of chips. In a single-column grid the auto track sizes to max-content, so seven chips widened the whole page. Fixed with `grid-template-columns: minmax(0, 1fr)` and `min-width: 0` on the grid children. |
| Theme toggle            | Unhandled `InvalidStateError` in the console | `viewTransition.ready` rejects whenever the browser skips the transition — a hidden tab, or a second click mid-transition. The theme had already applied; the promise just needed a `.catch`.                                        |
| Placeholder marking     | A dotted line drawn across the whole column  | `.ph` used `border-bottom`, which spans the full block on a paragraph or list item. Switched to `text-decoration: underline dotted`, which follows the text.                                                                         |
| Hero → next section     | Double gap                                   | The hero pays a section's bottom padding and the next section paid its own top padding. Added `.hero + .section, .page-head + .section { padding-top: 0 }`.                                                                          |
| Theme icon              | Sun and moon overlapping                     | One SVG with a translated moon path still painted over the sun in light mode. Replaced with two stacked glyphs that cross-fade.                                                                                                      |
| Timeline spacing toggle | 34px tall                                    | Below the 44px target rule; bumped.                                                                                                                                                                                                  |

Only the first of those is visible in a screenshot.

### Interactions tested in a real browser

- Headline word cycler runs (`ship → last → delight → scale`) and the container
  animates its width so the full stop doesn't jump.
- Theme toggle sweeps as a circular reveal; console clean after the `.catch` fix;
  triple-clicking it does not throw.
- Tag filter: clicking `how-to` leaves exactly the two how-to posts and updates
  the count line to "2 posts tagged how-to".
- Footnote popover opens under the reference with the note text; `↩` in the
  footnote list scrolls back and reopens it.
- Reading progress bar reaches 98.6% at 98.6% scroll depth on the post screen.
- Post measure resolves to 736px (46rem) with 22px body type.
- All three reading layouts (centred / side rail / wide margin) switch cleanly and
  none overflows at any width; the grid layouts collapse back to a single column
  below 62em and 68em respectively.

## Earlier rounds

Round 2's three directions (D1 Signal, D2 Console, D3 Orbit v1) measured clean at
**252 combinations** — 3 directions × 7 screens × 2 themes × 6 widths — run twice,
before and after Prettier reformatted the files. That sweep caught two mobile
overflows in the project cards (+41px and +25px, from a non-wrapping flex row) and
four sub-44px tap targets.

For reference, the current live site (measured in issue #7 against the Astro 7
build): 320px → 377px (**+57**), 360px → 397px (**+37**), 390px → 412px
(**+22**), 414px → 424px (**+10**); clean only above ~440px.

## Console

No errors or warnings from any mockup, in either theme, on any screen.

## Repo gates

All four pass with **exit code 0** — checked by exit code, not by grepping
output:

```
pnpm format:check  → 0
pnpm lint          → 0
pnpm check         → 0
pnpm build         → 0
```

## Not verified here

- **Real-device behaviour.** The dock reserves `env(safe-area-inset-bottom)`, but
  iOS Safari's collapsing toolbar needs a real phone.
- **View Transitions support.** The theme sweep is Chromium and Safari 18+;
  Firefox falls back to an instant swap, which is correct but untested here.
- **Font metrics.** The mockups use system fallbacks, not Space Grotesk / Inter.
  Real webfonts will shift line breaks slightly, so re-run these measurements
  once fonts are wired up.
- **`backdrop-filter` cost** on real hardware — reduced from ~12 blurred elements
  per page to 2, but not profiled on a low-end device.

## Reproducing

```bash
cd design/mockups && python3 -m http.server 8899
# then open http://localhost:8899/index.html
```

The comparison page prints the live `scrollWidth` vs viewport number under each
frame.
