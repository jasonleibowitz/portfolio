---
name: Orbit — leibowitz.me
description: Deep-space instrumentation rendered in daylight; one violet-to-cyan spectrum over warm paper.
colors:
  base: '#fcfaf6'
  panel: 'rgb(255 255 255 / 0.72)'
  line: 'rgb(20 18 30 / 0.09)'
  line-strong: 'rgb(20 18 30 / 0.16)'
  ink: '#131220'
  muted: '#55536a'
  faint: '#6f6b86'
  ultraviolet: '#5b3df5'
  aurora-teal: '#0e9fb8'
  glow-a: 'rgb(91 61 245 / 0.16)'
  glow-b: 'rgb(14 159 184 / 0.16)'
  sun: '#c2701a'
typography:
  display:
    fontFamily: "'Space Grotesk Variable', 'Space Grotesk', 'Avenir Next', system-ui, sans-serif"
    fontSize: 'clamp(2.625rem, 1.4rem + 5.4vw, 4.75rem)'
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: '-0.042em'
  heading1:
    fontFamily: "'Space Grotesk Variable', 'Space Grotesk', 'Avenir Next', system-ui, sans-serif"
    fontSize: 'clamp(2rem, 1.45rem + 2.4vw, 3.25rem)'
    fontWeight: 700
    letterSpacing: '-0.04em'
  heading2:
    fontFamily: "'Space Grotesk Variable', 'Space Grotesk', 'Avenir Next', system-ui, sans-serif"
    fontSize: 'clamp(1.375rem, 1.15rem + 1vw, 2rem)'
    fontWeight: 700
    letterSpacing: '-0.03em'
  heading3:
    fontFamily: "'Space Grotesk Variable', 'Space Grotesk', 'Avenir Next', system-ui, sans-serif"
    fontSize: 'clamp(1.25rem, 1.1rem + 0.6vw, 1.625rem)'
    fontWeight: 700
    letterSpacing: '-0.025em'
  intro:
    fontFamily: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 'clamp(1.0625rem, 0.98rem + 0.4vw, 1.3125rem)'
    fontWeight: 400
    letterSpacing: 'normal'
  longform:
    fontFamily: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: 'clamp(1.125rem, 1.02rem + 0.45vw, 1.375rem)'
    fontWeight: 400
    lineHeight: 1.72
    letterSpacing: 'normal'
  body:
    fontFamily: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: '1.0625rem'
    fontWeight: 400
    lineHeight: 1.62
    letterSpacing: 'normal'
  compact:
    fontFamily: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: '0.9375rem'
    fontWeight: 400
    letterSpacing: 'normal'
  footnote:
    fontFamily: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: '0.8125rem'
    fontWeight: 400
    letterSpacing: 'normal'
  caption:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: '0.75rem'
    fontWeight: 400
    letterSpacing: '0.16em'
  data:
    fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: '0.75rem'
    fontWeight: 400
    letterSpacing: '0.06em'
rounded:
  sm: '6px'
  md: '14px'
  card: '18px'
  full: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '32px'
  2xl: '48px'
  3xl: '64px'
  gutter: 'clamp(20px, 12px + 2vw, 36px)'
  section: 'clamp(44px, 24px + 2.6vw, 72px)'
components:
  button-primary:
    backgroundColor: '{colors.ultraviolet}'
    textColor: '#ffffff'
    rounded: '{rounded.full}'
    padding: '0 22px'
    height: '50px'
    typography: '{typography.caption}'
  button-primary-hover:
    backgroundColor: '{colors.ultraviolet}'
    textColor: '#ffffff'
  button-default:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    rounded: '{rounded.full}'
    padding: '0 22px'
    height: '50px'
  button-default-hover:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
  panel:
    backgroundColor: '{colors.panel}'
    textColor: '{colors.ink}'
    rounded: '{rounded.card}'
    padding: '24px'
  chip:
    backgroundColor: 'transparent'
    textColor: '{colors.muted}'
    rounded: '{rounded.full}'
    padding: '4px 10px'
  chip-accent:
    backgroundColor: 'transparent'
    textColor: '{colors.muted}'
    rounded: '{rounded.full}'
    padding: '4px 10px'
  nav-link-active:
    backgroundColor: '{colors.ultraviolet}'
    textColor: '#ffffff'
    rounded: '{rounded.full}'
    padding: '0 16px'
    height: '40px'
  dock-tab:
    backgroundColor: 'transparent'
    textColor: '{colors.faint}'
    rounded: '{rounded.card}'
    height: '56px'
---

# Design System: Orbit — leibowitz.me

## Overview

**Creative North Star: "The Daylit Observatory"**

Every motif in this system is borrowed from deep space — an aurora, an orbit, a
spectrum, a status light — and every one of them is rendered in full daylight on
warm paper. That inversion is the whole idea. The obvious way to build a sci-fi
interface is neon on black; this one refuses that and puts the same instruments
on `#FCFAF6`, where they have to earn their presence through precision instead
of contrast. The result reads as an observatory at midday rather than a console
at night.

The system's governing tension is that the **atmosphere is alive while the
objects are still.** Behind everything, a three-gradient aurora drifts on a
34-second loop, a dot orbits the portrait, a status light pulses, and a pulse
travels up the career timeline. In front of it, the components are almost
severe: hairline borders, flat translucent fills, pill geometry, monospace
labels, and exactly one accent. Nothing in the foreground competes with the
motion behind it. When a new component is ambiguous, resolve it toward
restraint — the luminosity is already handled by the field it sits on.

Depth comes from light rather than from shadow, which is why the standard
surface is a translucent fill over the aurora rather than a card floating above
a flat page. The palette is near-monochrome ink on paper with a single
violet-to-cyan spectrum that marks anything active, anywhere, and marks nothing
else.

**Key Characteristics:**

- Sci-fi vocabulary rendered on warm paper (`#FCFAF6`), never on a dark console
- A single Ultraviolet → Aurora Teal spectrum as the only accent in the system
- Ambient motion behind, still and restrained objects in front
- Hairline borders and flat translucent fills instead of cards and shadows
- Monospace for every label, date, number, and path
- Theming by token redefinition, so utilities re-derive rather than needing a `dark:` twin

## Colors

Near-monochrome ink on warm paper, lit from behind by a single two-hue spectrum
that appears only where something is active.

### Primary

- **Ultraviolet** (`#5B3DF5`): The system's voice. It carries active navigation, focus rings, links in prose, the reading-progress bar, timeline nodes, and the start of every gradient. In dark mode it lifts to `#A99BFF` so it stays legible against the raised base rather than vibrating on it.

### Secondary

- **Aurora Teal** (`#0E9FB8`): The far end of the spectrum. It terminates every gradient and marks active state alongside ink — it does not operate independently. At 3.1:1 on the base it is a _structural_ color, not a text color. Dark mode lifts it to `#5FDFF2`.

### Tertiary

- **Sun** (`#C2701A`): A single warm accent reserved for the sun half of the theme toggle, which keeps its warmth in both themes so the control never reads as disabled. It appears nowhere else.

### Neutral

- **Warm Paper** (`#FCFAF6`): The base in light mode. Warm off-white, deliberately not pure white — it is the surface the entire sci-fi vocabulary is inverted onto.
- **Lifted Slate** (`#16161F` in dark): The dark base, deliberately lifted off near-black. An earlier revision sat at `#0B0B12` and read as murkier than its contrast ratio suggested, because the surface was so close to black. Body text measures 15.6:1 here.
- **Ink** (`#131220`): Primary text. Near-black with a violet cast rather than neutral gray, so it belongs to the same family as the accent.
- **Muted** (`#55536A`): Secondary text — lead paragraphs, body copy in supporting positions, chip labels.
- **Faint** (`#6F6B86`): Metadata, eyebrows, dates, captions, inactive dock tabs. 4.9:1 on the canvas; the earlier `#85819C` measured 3.59:1, under the 4.5 this token's text sizes need.
- **Line** (`rgb(20 18 30 / 0.09)`) and **Line Strong** (`rgb(20 18 30 / 0.16)`): The hairline vocabulary. These do the work that borders and shadows do in other systems.
- **Panel** (`rgb(255 255 255 / 0.72)`): The translucent surface fill every card, tile, and container uses.
- **Glow A / Glow B** (`rgb(91 61 245 / 0.16)`, `rgb(14 159 184 / 0.16)`): The aurora's two hues at low alpha. They exist only inside the background gradient.

### Named Rules

**The One Spectrum Rule.** There is exactly one accent in this system and it is a
gradient: `linear-gradient(100deg, Ultraviolet, Aurora Teal)`. It marks active
navigation, primary buttons, the progress bar, status pulses, and gradient text.
Introducing a third hue — a red error, a green success, a category color — is a
change to the system, not a use of it.

**The Cyan Never Reads Rule.** Aurora Teal is 3.1:1 on the light base. It may
terminate a gradient, fill a dot, or mark a state beside ink. It may never carry
body text, and it may never be the sole signal of meaning.

**The Re-derive Rule.** Dark mode overrides the same custom properties rather
than adding `dark:` variants, so every utility recomputes automatically. Reach
for the `dark:` variant only when a property genuinely has no token behind it.

## Typography

**Display Font:** Space Grotesk Variable (with Avenir Next, system-ui)
**Body Font:** Inter Variable (with -apple-system, Segoe UI)
**Label/Mono Font:** JetBrains Mono (with ui-monospace, SFMono-Regular, Menlo)

**Character:** Space Grotesk's slightly mechanical geometry gives the display
type an instrument-panel quality without tipping into novelty; Inter disappears
underneath it and does the reading; JetBrains Mono handles anything that is
data rather than prose. The pairing is contemporary and technical, and it is
tightly tracked at large sizes — display type sets at `-0.042em`, which is what
keeps a 76px headline from feeling loose.

### Hierarchy

Every role below is a variant of the `Typography` component, and the component
is the only way text gets styled. The names here and the variant names are the
same string on purpose: if they ever disagree, that is a bug you can see.

- **Display** (700, `clamp(2.625rem, 1.4rem + 5.4vw, 4.75rem)`, 0.96): The homepage headline only. Line breaks are explicit, never emergent. Deliberately **not** a `Typography` variant, because a shared component exists to make a style easy to reuse and this one must not be. It lives inline in `Hero.astro`.
- **heading1** (700, `clamp(2rem, 1.45rem + 2.4vw, 3.25rem)`): Page titles. Renders an `h1`.
- **heading2** (700, `clamp(1.375rem, 1.15rem + 1vw, 2rem)`): Section headings, card titles, and `##` in markdown. Renders an `h2`.
- **heading3** (700, `clamp(1.25rem, 1.1rem + 0.6vw, 1.625rem)`): Employer names, homepage project titles, and `###` in markdown. Renders an `h3`. Sized to clear Longform at every width: both used to run 18-22px, so a `###` in a post was the same size as the paragraph under it.
- **intro** (400, `clamp(1.0625rem, 0.98rem + 0.4vw, 1.3125rem)`): The paragraph under a page title. Capped near 48ch and always muted.
- **longform** (400, `clamp(1.125rem, 1.02rem + 0.45vw, 1.375rem)`, 1.72): Text read for minutes, set on a 46rem measure (~78 characters). Blog posts, project write-ups, the About bio.
- **body** (400, `1.0625rem`, 1.62): Default text. Card descriptions, and the trailing note on a list.
- **compact** (400, `0.9375rem`): Dense interface text: rows, role lines, list items, nav and footer links.
- **footnote** (400, `0.8125rem`): Annotation prose. A list entry's note, and anything else that explains the thing it sits under. It exists because a remark set at Compact size sits 2px under its own title and reads as a second title, while Caption is 12px and belongs to data rather than sentences.
- **caption** (400, `0.75rem`, `0.16em`, uppercase, mono): Section captions, stat labels, status text. The line that names the thing beneath it.
- **data** (400, `0.75rem`, `0.06em`, mono): Dates, tenures, counts, ranks. The same size and family as Caption but not uppercased, because these are values being read rather than labels being scanned. Splitting the two is deliberate: uppercasing "Jan 2019" is a real change, not a styling detail.

### Named Rules

**The Three Voices Rule.** Space Grotesk states, Inter explains, JetBrains Mono
labels. Every piece of text belongs to exactly one of those three jobs. A fourth
family is a defect, not an addition.

**The Mono Means Data Rule.** Monospace is not a decorative texture here — it
marks content that is a value rather than a sentence: dates, tenures, counts,
stacks, tags, file paths, captions. Prose never sets in mono, and a date never
sets in Inter.

**The Explicit Break Rule.** Display headlines break where they are told. The
homepage headline contains a word that changes at runtime, so an emergent break
would recompose the type every few seconds; the breaks are hard-coded and
collapse to inline only below 26rem. `text-wrap: balance` does not solve this.

**The Fluid Scale Rule.** Every size above Compact is a `clamp()` fluid from
320px up. There is no viewport where type is sized for a different screen than
the one it is on, and there are no size breakpoints.

## Layout

The page is a single centered column: a 70rem shell (`--container-page`) with a
fluid gutter (`clamp(20px, 12px + 2vw, 36px)`), narrowing to 46rem for long-form
reading (`--container-measure`) and 52rem for the About bio (`--container-bio`).
There is no multi-column grid at the page level; rhythm does the work that
columns do elsewhere.

Vertical rhythm is a single value. Every band on every page uses
`py-(--section)` — `clamp(44px, 24px + 2.6vw, 72px)` — and the spacing ladder
inside a band is Tailwind's default 4/8/12/16/24/32/40/48/64 scale.

Breakpoints are named after the layout decision each one makes rather than after
a device size: `hero` (26rem, headline breaks collapse), `card` (46rem, card
internals go horizontal), `nav` (50rem, header nav replaces the dock), `rail`
(52rem, tag rails move beside content), `spec` (54rem, the spec rail becomes
sticky), `bio` (56rem, the About photo floats), `feature` (58rem, a featured
project brief gains its second column), and `toc` (68rem, a post's contents
leave the body and become a rail beside it).

### Named Rules

**The One Rhythm Rule.** Bands are spaced by `--section` and nothing else.
Per-block vertical padding is what made the gaps drift in the first revision;
if a band needs more air, the value changes for every band or not at all.

**The Never Touch `--spacing` Rule.** `--section` and `--gutter` live in plain
`:root`, not in `@theme`. Defining any `--spacing-*` key inside `@theme` drops
Tailwind's own `--spacing` base and every numeric `p-*`, `gap-*`, and `size-*`
utility silently stops resolving — with an error that points at the wrong file.

**The Zero-Overflow Rule.** `document.documentElement.scrollWidth` must not
exceed the viewport at 320/360/390/414/768/1280 in both themes on every page.
Grid children need `min-width: 0` and `minmax(0, 1fr)` tracks; a flex row of
chips in an auto-sized track measures to max-content and drags a 320px page
~400px wide.

## Elevation & Depth

This system layers with **light**, not with shadow. A fixed three-gradient
aurora sits behind every page at `z-index: -1`, drifting on a 34-second loop,
and surfaces are translucent fills laid over it. Because the aurora never
scrolls, those surfaces can use a flat `rgb(255 255 255 / 0.72)` fill instead of
a live `backdrop-filter` — which would cost GPU work on every frame and buy
nothing visually.

There is exactly one shadow token in the system.

### Shadow Vocabulary

- **Lift** (`box-shadow: 0 10px 34px rgb(24 18 60 / 0.08)`; dark: `0 12px 38px rgb(0 0 0 / 0.42)`): The only shadow. It belongs to objects — the portrait, images inside rendered posts, device frames — and to buttons on hover.
- **Dock glass** (a four-layer composite of outer shadow, inner top highlight, and inner bottom shading): Not a reusable token. It exists once, on the mobile dock, and is documented in Components.

### Named Rules

**The Surface/Object Rule.** Flat surfaces never cast; objects do. `Panel` — the
translucent fill behind every card, stat tile, and container — carries no shadow,
ever. `shadow-lift` is reserved for things that behave like physical objects
resting on the page: photographs, screenshots, device frames. Buttons borrow it
on hover, which is exactly why the hover reads as picking the button up. When a
new component is ambiguous, ask whether it is a surface or an object; there is no
third answer.

**The Two Blurs Rule.** `backdrop-filter` appears in exactly two places — the
sticky header and the floating dock — because those are the only elements that
composite against content that moves beneath them. Everywhere else it is
forbidden: a dozen blurred elements per page is the single most likely thing to
fail a performance audit, and over a static aurora it is invisible anyway.

## Shapes

Four radii, and no others. **Pill** (`rounded-full`) marks anything interactive
or token-like: buttons, chips, nav links, the tab bar, the theme toggle, the
avatar. **Card** (`18px`) marks surfaces: panels, code blocks, images, embeds.
**Medium** (`14px`) is for smaller surfaces that sit inside one, like a list
entry's artwork or a post row. **Small** (`6px`) is for inline marks: code,
focus outlines, the footnote popover and its backref.

Tailwind's own seven-step radius scale is cleared in `@theme`, so `rounded-lg`
and `rounded-xl` do not exist here. Anything outside these four is either a
circle (`50%`), the app icon's superellipse (`22.37%`), or a component already
marked for removal.

The form language is defined by hairlines rather than fills. A `1px` border in
`line` or `line-strong` is the default way to bound anything, and the aurora
supplies the tonal separation that a heavier border would otherwise provide.

Two shapes break the rules deliberately. The **dock** uses per-position radii so
its first and last tabs take the capsule's own end caps (`999px 18px 18px
999px`), leaving no uncolored gap around the active tab. The **orbit ring**
around the portrait is a dashed circle — the only dashed border in the system.

### Named Rules

**The Pill-or-Card Rule.** If a user can act on it, it is a pill. If it holds
content, it is an 18px card. A new radius value needs a reason that neither
covers.

## Components

### Buttons

- **Shape:** Full pill (`999px`), minimum height 50px, horizontal padding 22px.
- **Primary:** The spectrum gradient (`bg-linear-100 from-violet to-cyan`) with a transparent border. The label is white in light mode and `#14141D` in dark — it carries the ink color of the _opposite_ theme, because the gradient itself does not invert.
- **Default:** `line` hairline border over the translucent panel fill, ink label.
- **Hover:** Rises 2px and gains `shadow-lift`, over 200ms on `cubic-bezier(0.2, 0.8, 0.2, 1)`. Transition is scoped to `transform` and `box-shadow` only.
- **Icons:** 20px, from `astro-icon` (`lucide:*`, `simple-icons:*`), never hand-pasted SVG paths.

### Chips

- **Style:** Pill, hairline `line` border, transparent fill, monospace at `0.6875rem` with `0.04em` tracking, muted text.
- **Sizes:** `default` for stack and project chips; `mini` (tighter padding) for tag markers inside a dense meta row.
- **Accent:** A single `violet` variant that swaps the border to `violet/45`. Reserved for genuine emphasis — the AI row on the About stack list uses it.

### Cards / Containers

- **Corner Style:** 18px (`--radius-card`).
- **Background:** The translucent panel fill, over the aurora.
- **Shadow Strategy:** None. See The Surface/Object Rule.
- **Border:** 1px `line` hairline.
- **Internal Padding:** 24px typical; the ladder is Tailwind's default.

### Navigation

- **Desktop (≥50rem):** A pill row in a sticky header with `backdrop-blur-md` over a `color-mix` base at 78%. The active item takes the full spectrum gradient with white text; inactive items are muted and darken to ink on hover.
- **Mobile (<50rem):** A floating glass dock — a fixed capsule, `min(420px, 100vw - 24px)`, with a real four-layer glass treatment. Five tabs at 56px, each 59px wide at a 320px viewport, above the 44px target minimum. Labels ellipsis rather than widen the dock.
- **Dock collapse:** On scroll down the capsule narrows to `min(300px, 100vw - 24px)` and tabs drop to 46px with labels fading out, transitioning over 300ms.
- **Press feedback:** A dock tab scales to `0.93` on `:active`.

### Status

- **Style:** A 7px dot beside monospace uppercase text at `0.1em` tracking.
- **Behavior:** The dot takes the spectrum gradient and a 2.6s pulse _only_ when a project is actively moving; a parked project gets a flat `faint` dot. The pulse is information, not decoration.

### Signature: The Aurora

A fixed, `aria-hidden` layer at `z-index: -1`, inset `-20vh -10vw`, composed of
three radial gradients in the two glow colors positioned at 12%/8%, 88%/22%, and
60%/92%. It drifts between two transforms over 34 seconds on an infinite
alternating ease. It is the reason every surface above it can be flat, and it is
the single element most responsible for the system's character.

### Signature: The Orbit Ring

A dashed `line-strong` circle around the homepage portrait, rotating once every
26 seconds. The portrait inside it cross-fades to a social profile picture, and
the chip for that platform fills with the spectrum.

**The portrait is the control; the chips are the display.** Tapping the portrait
cycles through the four platforms and back to Jason. Pointing at a chip, by
mouse or by keyboard, previews that platform and leaving it returns to whatever
the portrait was last set to. The chips themselves are never intercepted: they
are ordinary links on every device, which is the point. A chip's tap is spoken
for permanently, so the interaction belongs on the one element in the group that
owns no gesture, and nothing has to be cancelled to make room for it.

## Do's and Don'ts

### Do:

- **Do** route every accent through the one Ultraviolet → Aurora Teal spectrum, and let its rarity carry the emphasis.
- **Do** set every label, date, count, tag, and stack item in JetBrains Mono, uppercase with `0.16em` tracking where it is an eyebrow.
- **Do** bound elements with a 1px `line` hairline and a translucent fill rather than with a shadow or a solid card.
- **Do** define new colors as tokens overridden under `:root[data-theme='dark']`, so utilities re-derive instead of needing a `dark:` twin.
- **Do** name a new breakpoint after the layout decision it makes, not after a device.
- **Do** keep interactive controls and chrome at 44px or larger. Inline text links inside prose are exempt.
- **Do** use `bg-linear-100 from-violet to-cyan` — the Tailwind v4 gradient names, not `bg-gradient-to-r`.
- **Do** verify anything visual in a real browser at 320/360/390/414/768/1280 in both themes. None of the four build gates renders a page.

### Don't:

- **Don't** add a marquee, ticker, or any content that scrolls horizontally on its own. This was rejected explicitly and is a standing ban.
- **Don't** put a `backdrop-filter` on anything but the header and the dock.
- **Don't** give a `Panel` a shadow, or give a photograph none.
- **Don't** let Aurora Teal carry body text, or be the only signal that something is active.
- **Don't** add a key to the `--spacing` namespace in `@theme`; it silently breaks every numeric spacing utility in the project.
- **Don't** introduce a fourth type family, or set prose in monospace.
- **Don't** let a display headline break wherever the browser lands — set the breaks explicitly.
- **Don't** renumber a ranked list when it is filtered; rank comes from the data, not from `<ol>` or a CSS counter.
