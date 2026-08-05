# Verification — how these mockups were checked

Screenshots hide 10–20px of horizontal overflow, so nothing here was signed off
by eye. Everything below was measured in Chrome against the files as they stand
in this directory, served over `http://` (a local `python3 -m http.server` in
`design/mockups/`) so same-origin frame measurement works.

## Method

Each mockup was loaded into an iframe of an exact CSS pixel width — an iframe
establishes its own layout viewport, so this measures the same thing a phone
does — then:

```js
document.documentElement.scrollWidth > viewportWidth; // → overflow
```

Interactive targets were measured with `getBoundingClientRect().height` on every
`<a>` and `<button>` inside the header, the rendered page panel, the footer and
the tab bar.

## 1. Horizontal overflow

**3 directions × 4 screens (home, blog index, post, spec) × 2 themes ×
6 widths = 144 combinations. Zero overflow.**

| Width  | Device              | A   | B   | C   |
| ------ | ------------------- | --- | --- | --- |
| 320px  | iPhone SE (1st gen) | ✅  | ✅  | ✅  |
| 360px  | Galaxy S series     | ✅  | ✅  | ✅  |
| 390px  | iPhone 12–15        | ✅  | ✅  | ✅  |
| 414px  | iPhone Plus, Pixel  | ✅  | ✅  | ✅  |
| 768px  | iPad portrait       | ✅  | ✅  | ✅  |
| 1280px | laptop              | ✅  | ✅  | ✅  |

In every passing case `scrollWidth` equals the viewport width exactly — not
"close enough".

For comparison, the current site (measured in issue #7 against the Astro 7
build): 320px → 377px (**+57**), 360px → 397px (**+37**), 390px → 412px
(**+22**), 414px → 424px (**+10**), clean only above ~440px.

Two failures were found and fixed during this work, both on the **spec** screen
rather than a site template: wide `clamp()` values in the spec tables pushed the
document to 347px at 320px (A), 361px (B) and 368px (C). Fixed by putting those
tables in `overflow-x: auto` containers. Worth noting because it is exactly the
class of bug that a screenshot review passes.

## 2. Tap targets at 360px

Every control and chrome link — nav, footer, tags, chips, buttons, tab bar,
wordmark — is **≥44px tall** in all three directions across home, blog index and
post.

Deliberately excluded, and not padded to 44px:

- inline links inside a sentence (`<p>`, `<dd>`)
- post-title links inside a heading (`<h3><a>`)
- B's table-of-contents entries

These are text links. They clear the WCAG 2.2 AA target-size minimum of 24×24
but not the 44px AAA/Apple guideline, which is the standard inline exception.
Calling that out here so the accessibility audit (#9) grades the real decision
rather than rediscovering it.

Four real failures were found and fixed here too: A's tag links (21px), A's
"All posts →" (22px), B's filter chips (32px) and both wordmarks (22–35px).

## 3. Console

No errors or warnings from any of the three files in either theme, on any
screen.

## 4. Repo gates

The mockups live in the repo, so they are subject to the same gates. All four
pass with **exit code 0** — checked by exit code, not by grepping output:

```
pnpm format:check  → 0
pnpm lint          → 0
pnpm check         → 0
pnpm build         → 0
```

## Reproducing

```bash
cd design/mockups && python3 -m http.server 8899
# then open http://localhost:8899/index.html
```

The comparison page prints the live `scrollWidth` vs viewport number under each
frame, so the measurement is visible while you browse rather than only in this
file.
