# Design directions for leibowitz.me — round 2

Issue #7. Static mockups, not production code. Round 1 lives in
`mockups/round-1/`; this replaces it.

**Open `design/mockups/index.html`.** Three frames side by side, with controls
for screen (home / projects / case study / writing / post / about / spec),
viewport (320 → 1280) and theme. Each direction is one self-contained file you
can also open alone — `d1-signal.html`, `d2-console.html`, `d3-orbit.html` — with
the same switcher bottom-right.

---

## What the brief changed

| Your note                          | What happened                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Blog was treated as the main event | Homepage is now a résumé scroll: hero → at a glance → experience → projects → writing. Writing is the **last** section.             |
| No projects page                   | New `/projects` index plus a case study per app, with a sticky spec rail on desktop. Winnie leads; Reel Watch second.               |
| "C felt amateurish / childish"     | The playfulness is gone. Each direction takes a different serious lens: minimalism, developer-tool, sci-fi.                         |
| Hated the scrolling ticker         | Deleted.                                                                                                                            |
| Beige background, prefer A's       | All three sit on `#FCFAF6`.                                                                                                         |
| Liked the headshot hover swap      | Kept, and it now works on touch — hover on desktop, tap on mobile, chip stays lit until you tap another. ~15 lines of vanilla JS.   |
| Liked B's stats block              | Kept as "at a glance" on the homepage, styled per direction.                                                                        |
| Liked B's year-grouped index       | Kept — year headers, and every row carries date, read time and tags.                                                                |
| Post text too narrow               | Measure went 36rem → **40rem** (~78 characters).                                                                                    |
| Liked the table of contents        | In all three.                                                                                                                       |
| Need footnotes and code rendering  | Both designed on the post screen: footnote refs with back-links, and a syntax-highlighted code block.                               |
| Keep the About page                | Kept — long bio, résumé PDF, and a "beyond the CV" stat row. Nav is Home / Projects / Writing / About, with Lists a tab in Writing. |

Bottom tabs survive in all three, since you liked them — but each treats them
differently (edge-to-edge, amber-marked, or a floating glass dock).

---

## The three

### D1 — Signal (minimalism)

Near-monochrome on warm off-white with one deep-green signal colour, hairlines
instead of boxes, no shadows anywhere. Hierarchy comes from size and space.
Inter Tight + Inter + JetBrains Mono. Motion budget is a fade-up on scroll and
one underline sweep.

**Strength:** it will never look wrong, and it stays legible as content grows.
**Weakness:** the least memorable of the three. A very well-made version of a
layout plenty of good engineers already have — it answers "modern" and mostly
skips "techy".

### D2 — Console (tech)

Built like a developer tool. Monospace carries every label, path, date and
number; IBM Plex Sans carries prose. Content sits in panels with title bars
(`about.json`, `project.toml`, `brew-ratio.ts`), the footer is a status bar, the
experience section is a deploy log, projects are repo cards with language dots,
and code has a line-number gutter. One signal amber marks anything active.

**Strength:** signals "this person builds things" in about two seconds, and it
fits your content better than the other two — real stacks on repo cards, a career
that reads as a log, and the footnotes-and-code requirement looking deliberate
rather than bolted on.
**Weakness:** the monospace and the `~/` paths are a bet. Engineers read fluency;
a non-technical recruiter may read noise, and the lowercase headings are an
affectation if you don't like them. Both are easy to dial back — keep the panels
and the amber, set headings in sentence case.

### D3 — Orbit (sci-fi)

Sci-fi on your off-white rather than on a black screen. An aurora drifts behind
the page, content sits on glass, and a violet→cyan spectrum carries every active
state. Space Grotesk display. The whimsy is ambient: drifting glow, one orbiting
dot around the portrait, a pulsing status light. Mobile nav is a floating glass
dock rather than an edge-to-edge bar.

**Strength:** by far the most distinctive, and the one people remember. Dark mode
is where it's strongest.
**Weakness:** `backdrop-filter` on a dozen elements per page is the expensive
part and the most likely thing to trip the performance audit (#10). Cyan is only
3.1:1 on the light base, so it can never carry body text — that constrains the
palette more than it appears. It is also the most "of its moment" and will want
revisiting soonest.

---

## Recommendation

**D2 Console.** You're sending this to engineering hiring managers, and it does
the most work for that audience without saying anything out loud. If you want to
be remembered rather than understood, D3 — it's genuinely striking, and the cost
is maintenance and a performance conversation. D1 is the safe floor.

Cherry-picking is easy here: all three share the same structure, spacing logic
and component set. D2's panels on D1's palette, or D1's restraint with D3's
portrait orbit, are both about an hour of work rather than a rebuild.

---

## Still placeholder

Marked in the mockups with a dotted underline, so the gaps are visible rather
than described:

- **Employment dates and job titles** — the repo only gave me the order of the
  companies, so I didn't invent them.
- **One-line pitches** for Winnie the Poo Tracker and Reel Watch, and all
  case-study body copy.
- **App screenshots** — the phone frames are drawn in CSS. Real ones drop in.
- **The About bio** and the "beyond the CV" numbers. Once you pick a direction
  I'll draft the bio with you. Countries visited is a good stat; cities lived in,
  concerts, marathons, a "currently reading" slot and a small map are other
  options.

## Verification

Measured, not eyeballed: `document.documentElement.scrollWidth` vs viewport at
320 / 360 / 390 / 414 / 768 / 1280px, across 3 directions × 7 screens × 2 themes
— 252 combinations — plus a tap-target sweep at 360px. Details, and the two
overflow bugs this caught, are in [`mockups/MEASUREMENTS.md`](mockups/MEASUREMENTS.md).
