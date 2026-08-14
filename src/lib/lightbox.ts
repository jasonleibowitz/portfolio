import type { PanzoomObject } from '@panzoom/panzoom';

/**
 * Opens a project capture full size, in a modal that pages and zooms.
 *
 * The row on a project page draws its captures to be recognized, not read: a
 * phone matched to a browser's height never reaches the 280px where body copy
 * resolves. This is the other half. Almost all of it is the platform's:
 * `showModal()` gives the focus trap, Escape, the inert background and the
 * `::backdrop`, and a scroll-snap rail gives 1:1 tracking, momentum, snapping
 * and rubber-banding that no hand-written pager matches. Panzoom is loaded on
 * the first open, for the one thing neither of those has, which is pinch.
 */

/** How near two taps must fall, in ms and px, to read as one double tap. */
const DOUBLE_TAP = { ms: 320, px: 30 };

/** Where a double tap lands, as a share of the distance to `maxScale`. */
const DOUBLE_TAP_SCALE = 0.6;

/** Past this the pointer was dragging the rail, and its click is not a click. */
const DRAG_SLOP = 10;

/** How long an open waits for its capture before going without it. */
const WARM_MS = 220;

/** How far a zoomed capture must be dragged past its own edge to page. */
const HANDOFF_PX = 90;

/** Symmetric clamp, because every bound here is the same distance either way. */
const clamp = (value: number, min: number) =>
  Math.min(Math.max(value, min), -min);

interface Pan {
  x: number;
  y: number;
  scale: number;
}

/**
 * Picks the rendition that matches the theme on the page.
 *
 * Two captures deliberately name one file for both themes, because they are
 * drawn over poster art and there is nothing to re-take, so `dark` equalling
 * `light` is a normal input and not a mistake.
 */
export function fullSrcFor(
  sources: { light: string; dark?: string },
  theme?: string | null
): string {
  return theme === 'dark' ? (sources.dark ?? sources.light) : sources.light;
}

/**
 * How far a capture may be zoomed, as a multiple of the width it is drawn at.
 *
 * The tempting ceiling is one image pixel per device pixel, and it is wrong
 * here. A browser capture is 1968px wide holding a ~984pt window; on a 3x
 * phone that ceiling stops at 1.68, well before the window reaches the size
 * it was captured at, which is the one size its body copy is known to read.
 * Natural width over drawn width always clears that point, and the cap keeps
 * a small capture in a large viewport from zooming absurdly.
 */
export function maxScaleFor(naturalWidth: number, drawnWidth: number): number {
  if (!naturalWidth || !drawnWidth) return 1;
  return Math.min(8, Math.max(1, naturalWidth / drawnWidth));
}

/** The one of a frame's two renditions that the current theme is showing. */
function visibleImg(within: Element): HTMLImageElement | undefined {
  const imgs = Array.from(within.querySelectorAll('img'));
  return imgs.find((img) => img.offsetParent !== null) ?? imgs[0];
}

interface Slide {
  el: HTMLElement;
  img: HTMLImageElement;
  full: string;
  panzoom?: PanzoomObject;
  loaded?: boolean;
  /** The drawn size at rest, which every pan bound is measured against. */
  baseW: number;
  baseH: number;
  /** How far the reader has dragged past an edge in this one gesture. */
  overshoot?: number;
  /** Set while this file is correcting a pan, so the correction does not
      re-enter as another change to correct. */
  clamping?: boolean;
}

export function initLightbox() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
  const frames = document.querySelectorAll<HTMLElement>('[data-shot]');
  if (!dialog || !frames.length) return;

  const rail = dialog.querySelector<HTMLElement>('[data-lb-rail]')!;
  const counter = dialog.querySelector<HTMLElement>('[data-lb-count]')!;
  const closeBtn = dialog.querySelector<HTMLElement>('[data-lb-close]')!;
  const prevBtn = dialog.querySelector<HTMLButtonElement>('[data-lb-prev]')!;
  const nextBtn = dialog.querySelector<HTMLButtonElement>('[data-lb-next]')!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /*
   * Checked per call, not once. A hidden document gets no rendering
   * opportunity, and `startViewTransition` holds its update callback until it
   * does, so a lightbox opened in a background tab would never open at all.
   */
  const animated = () =>
    !reduced && !!document.startViewTransition && !document.hidden;

  let slides: Slide[] = [];
  let index = 0;
  let opener: HTMLElement | null = null;
  let Panzoom: typeof import('@panzoom/panzoom').default | null = null;

  /* ---------------------------------------------------------------- frames */

  /**
   * Turns each frame into a button at runtime rather than rendering one.
   *
   * A server-rendered button whose handler never arrives is a control that
   * does nothing, and the captures are meant to render exactly as they do now
   * when there is no JS. `footnotes.ts` upgrades its references the same way.
   */
  frames.forEach((frame) => {
    /* Before the children move, because afterwards the frame holds none. */
    const alt = frame.querySelector('img')?.alt ?? '';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${frame.className} shot-btn`;
    Object.assign(button.dataset, frame.dataset);
    button.append(...frame.childNodes);
    button.setAttribute('aria-label', alt ? `Enlarge: ${alt}` : 'Enlarge');
    button.addEventListener('click', () => open(button));

    frame.replaceWith(button);
  });

  /* ----------------------------------------------------------------- slides */

  const buildRail = (row: HTMLElement) => {
    const theme = document.documentElement.dataset.theme;

    const shots = Array.from(row.querySelectorAll<HTMLElement>('[data-shot]'));
    /*
     * The foot is reserved for the whole row, not per capture. Sized slide by
     * slide, a capture would change size as the reader paged between one that
     * has a caption and one that does not, which reads as the layout breaking
     * rather than as two different captures.
     */
    rail.toggleAttribute(
      'data-captioned',
      shots.some((shot) => shot.dataset.caption)
    );

    rail.replaceChildren();
    slides = shots.map((shot) => {
      const el = document.createElement('figure');
      el.className = 'lb-slide';

      const img = document.createElement('img');
      img.alt = shot.querySelector('img')?.alt ?? '';
      img.draggable = false;
      /* The drawn size is known before the file is, so the rail has its final
         geometry on the first frame and nothing reflows as the captures
         arrive. */
      img.width = Number(shot.dataset.fullW) || 0;
      img.height = Number(shot.dataset.fullH) || 0;
      /* No `src` yet. The attributes above already give the slide its box, so
         a capture that has not been reached costs nothing and still holds its
         place. */
      el.append(img);

      /* `textContent`, so a caption is text and never markup. */
      if (shot.dataset.caption) {
        const caption = document.createElement('figcaption');
        caption.className = 'lb-caption';
        caption.textContent = shot.dataset.caption;
        el.append(caption);
      }

      rail.append(el);

      return {
        el,
        img,
        baseW: 0,
        baseH: 0,
        full: fullSrcFor(
          { light: shot.dataset.full!, dark: shot.dataset.fullDark },
          theme
        ),
      };
    });
  };

  /**
   * Fetches a slide's capture, once. Called for the one being opened and for
   * its two neighbours, so paging never lands on an empty frame and a row of
   * eight captures never costs eight downloads to read one.
   */
  const load = (slide?: Slide) => {
    if (!slide || slide.loaded || !slide.full) return Promise.resolve();
    slide.loaded = true;
    slide.img.src = slide.full;
    return slide.img
      .decode()
      .then(() => armZoom(slide))
      .catch(() => {});
  };

  /* ------------------------------------------------------------------- zoom */

  /**
   * Gives a slide its zoom, and re-reads its ceiling every time it is called.
   *
   * The ceiling is a ratio against the file, and Panzoom is loaded in parallel
   * with the captures, so whichever arrives first calls this and the other
   * corrects it. Setting it once would pin a capture to whatever was known at
   * the time, which for a slide with no file yet is no zoom at all.
   */
  const armZoom = (slide: Slide) => {
    if (!Panzoom) return;

    /* The drawn size with the zoom taken back out, which is what every bound
       below is a ratio against. Read rather than stored, so a rotation or a
       resize cannot leave it describing a capture that has since changed. */
    const scaleNow = slide.panzoom?.getScale() ?? 1;
    const rect = slide.img.getBoundingClientRect();
    slide.baseW = rect.width / scaleNow;
    slide.baseH = rect.height / scaleNow;

    const maxScale = maxScaleFor(slide.img.naturalWidth, slide.baseW);

    if (slide.panzoom) {
      slide.panzoom.setOptions({ maxScale });
      return;
    }

    slide.panzoom = Panzoom(slide.img, {
      maxScale,
      minScale: 1,
      /*
       * No `contain`. Panzoom's two modes both assume a fixed relationship
       * between the element and its parent that a fitted capture does not
       * have. `'outside'` asks a letterboxed capture to cover a parent it
       * cannot cover, and answered with a 3107px translation that put the
       * picture off screen at rest. `'inside'` is worse in the other
       * direction: a capture fitted to its slide already fills it, so
       * "never leave the parent" pins the scale at 1 and there is no zoom at
       * all. `clampPan` below holds the picture instead, and it is a function
       * of the zoom rather than a mode.
       */
      /* Apple's rule, and Panzoom states it as an option: at rest a drag is
         the rail paging, and only a zoomed capture takes the drag as a pan. */
      panOnlyWhenZoomed: true,
      /* Panzoom would otherwise write `touch-action: none` onto the image and
         the rail, which stops the rail scrolling at all. The pair of values
         this needs is a function of the zoom, so `lightbox.css` owns it and
         keys it off `data-zoomed`. */
      touchAction: '',
      cursor: 'zoom-in',
      animate: true,
      duration: 180,
      step: 0.35,
    });

    slide.img.addEventListener('panzoomstart', () => {
      slide.overshoot = 0;
    });

    slide.img.addEventListener('panzoomchange', (event) => {
      const { scale } = (event as CustomEvent<{ scale: number }>).detail;
      slide.el.toggleAttribute('data-zoomed', scale > 1.01);
      clampPan(slide, event as CustomEvent<Pan>);
    });
  };

  /**
   * Holds a zoomed capture inside its own edges, and hands a drag that pushes
   * past them to the rail.
   *
   * Panning is bounded by how far the picture reaches beyond the slide, which
   * is nothing until it is zoomed: at rest the limit is zero on both axes, so
   * a capture recentres itself the moment the reader zooms back out.
   *
   * What the reader drags past that limit is not thrown away. It accumulates,
   * and enough of it in one direction moves to the next capture, which is what
   * makes a zoomed capture still feel like one of a set rather than a dead end.
   * iOS composes this out of nested scroll views; on the web the outer one is
   * the rail and this is the join between them.
   *
   * The total is cleared per gesture, by `panzoomstart`, and never by a pan
   * that lands in bounds. Correcting a pan makes Panzoom report the corrected
   * value back, and that report arrives after the guard below has cleared, so
   * treating an in-bounds value as "the reader stopped pushing" zeroed the
   * total on every frame and no amount of dragging ever reached the threshold.
   */
  const clampPan = (slide: Slide, event: CustomEvent<Pan>) => {
    if (slide.clamping) return;
    const { x, y, scale } = event.detail;

    const limit = (base: number, box: number) =>
      Math.max(0, base / 2 - box / (2 * scale));
    const cx = clamp(x, -limit(slide.baseW, slide.el.clientWidth));
    const cy = clamp(y, -limit(slide.baseH, slide.el.clientHeight));

    if (cx === x && cy === y) return;

    slide.clamping = true;
    slide.panzoom!.pan(cx, cy, { animate: false, force: true });
    slide.clamping = false;

    /* Only sideways. Pushing past the top of a capture means the reader is at
       the top of it, not that they want the next one. */
    slide.overshoot = (slide.overshoot ?? 0) + (x - cx);
    if (Math.abs(slide.overshoot) < HANDOFF_PX) return;

    const forward = slide.overshoot < 0;
    slide.overshoot = 0;
    go(index + (forward ? 1 : -1));
  };

  /** Loads Panzoom the first time a capture is opened, and never before. */
  const loadZoom = async () => {
    if (!Panzoom) Panzoom = (await import('@panzoom/panzoom')).default;
    slides.forEach(armZoom);
  };

  const resetZoom = (slide?: Slide) => {
    if (!slide?.panzoom) return;
    slide.panzoom.reset({ animate: false });
    slide.el.removeAttribute('data-zoomed');
  };

  /* ---------------------------------------------------------------- paging */

  /**
   * Moves to a capture, marking it before the scroll rather than after.
   *
   * The rail is still the truth for a finger, but it cannot be the only
   * source: a scroll that reports nothing back leaves the index behind, and
   * the next press then computes its target from a stale number and asks for
   * the position the rail is already at, which reads as a dead control.
   */
  const go = (to: number) => {
    const next = Math.min(Math.max(to, 0), slides.length - 1);
    setIndex(next);
    rail.scrollTo({
      left: next * rail.clientWidth,
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  const setIndex = (next: number) => {
    if (next === index || !slides[next]) return;
    resetZoom(slides[index]);
    mark(next);
  };

  const mark = (next: number) => {
    index = next;
    counter.textContent = `${next + 1} / ${slides.length}`;
    /* A control that disables under its own focus hands focus to the body,
       and the dialog would have nothing focused inside it. */
    [
      [prevBtn, next === 0],
      [nextBtn, next === slides.length - 1],
    ].forEach(([button, atEnd]) => {
      const btn = button as HTMLButtonElement;
      btn.disabled = atEnd as boolean;
      if (btn.disabled && document.activeElement === btn)
        rail.focus({ preventScroll: true });
    });
    void load(slides[next]);
    void load(slides[next + 1]);
    void load(slides[next - 1]);
  };

  /*
   * A finger can move the rail without anything above being called, so the
   * position is read back off the scroller itself. `scrollLeft` over the
   * rail's width is the whole calculation, which is why this is a scroll
   * listener and not an `IntersectionObserver` watching four slides for a
   * ratio: same answer, one concept instead of two.
   */
  let ticking = false;
  rail.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (rail.clientWidth)
          setIndex(Math.round(rail.scrollLeft / rail.clientWidth));
      });
    },
    { passive: true }
  );

  /* ------------------------------------------------------------ open/close */

  const show = (row: HTMLElement, start: number) => {
    buildRail(row);
    dialog.showModal();

    /* `clientWidth` is 0 while the dialog is display:none, so the rail can
       only be positioned once it is open. Nothing paints between the two, so
       the first frame is already on the right capture. */
    rail.scrollLeft = start * rail.clientWidth;
    mark(start);

    void loadZoom();
    rail.focus({ preventScroll: true });
  };

  async function open(button: HTMLElement) {
    const row = button.closest<HTMLElement>('[data-shots]');
    if (!row) return;

    const shots = Array.from(row.querySelectorAll<HTMLElement>('[data-shot]'));
    const start = Math.max(0, shots.indexOf(button));
    opener = button;

    if (!animated()) {
      show(row, start);
      return;
    }

    /* Warm the capture before the transition rather than during it, or the
       frame grows into an image that has not arrived. Raced, because a slow
       connection must delay the open by a blink and not by a download. */
    const warm = new Image();
    warm.src = fullSrcFor(
      { light: button.dataset.full!, dark: button.dataset.fullDark },
      document.documentElement.dataset.theme
    );
    await Promise.race([
      warm.decode().catch(() => {}),
      new Promise((r) => setTimeout(r, WARM_MS)),
    ]);

    /* The capture grows out of the frame that was tapped, so the enlargement
       has a place it came from, and closing puts it back there. */
    const from = visibleImg(button);
    if (from) from.style.viewTransitionName = 'lb-shot';

    document
      .startViewTransition(() => {
        if (from) from.style.removeProperty('view-transition-name');
        show(row, start);
        slides[start].img.style.viewTransitionName = 'lb-shot';
      })
      /* `ready` and `finished` reject whenever the browser skips a
         transition, and by then the dialog is already open. */
      .finished.catch(() => {})
      .finally(() =>
        slides[start]?.img.style.removeProperty('view-transition-name')
      );
  }

  /**
   * Gives back everything an open took: the zoom instances, the rail, and the
   * focus. Idempotent, because it is called directly and is also wired to the
   * `close` event for any dismissal this file did not perform itself.
   */
  const teardown = () => {
    slides.forEach((slide) => slide.panzoom?.destroy());
    slides = [];
    rail.replaceChildren();
    /* Without `preventScroll` the browser drags the snap row to bring the
       frame into view, and it lands on a different capture than the one that
       was opened. */
    opener?.focus({ preventScroll: true });
    opener = null;
  };

  const close = () => {
    if (!animated()) {
      dialog.close();
      teardown();
      return;
    }

    const back = opener && visibleImg(opener);
    const leaving = slides[index]?.img;
    if (leaving) leaving.style.viewTransitionName = 'lb-shot';

    document
      .startViewTransition(() => {
        if (leaving) leaving.style.removeProperty('view-transition-name');
        dialog.close();
        /* Inside the callback, so the state the transition captures is the
           one the reader is going back to. */
        teardown();
        if (back) back.style.viewTransitionName = 'lb-shot';
      })
      .finished.catch(() => {})
      .finally(() => back?.style.removeProperty('view-transition-name'));
  };

  /* The `close` event is queued on the user-interaction task source, which a
     hidden document does not run, so it is a safety net and never the only
     path: `close()` above tears down for itself. */
  dialog.addEventListener('close', teardown);

  /* Escape closes a modal dialog on its own, which would skip the transition
     back into the frame. */
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    close();
  });

  /* ----------------------------------------------------------------- input */

  closeBtn.addEventListener('click', close);
  prevBtn.addEventListener('click', () => go(index - 1));
  nextBtn.addEventListener('click', () => go(index + 1));

  /* A tap beside the capture dismisses, but a drag that ends beside it is the
     reader paging the rail and must not. */
  let down = { x: 0, y: 0 };
  dialog.addEventListener('pointerdown', (event) => {
    down = { x: event.clientX, y: event.clientY };
  });
  dialog.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('button') || target.tagName === 'IMG') return;
    if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_SLOP)
      return;
    close();
  });

  dialog.addEventListener('keydown', (event) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => go(index + 1),
      ArrowLeft: () => go(index - 1),
      Home: () => go(0),
      End: () => go(slides.length - 1),
      '+': () => slides[index]?.panzoom?.zoomIn(),
      '=': () => slides[index]?.panzoom?.zoomIn(),
      '-': () => slides[index]?.panzoom?.zoomOut(),
      '0': () => resetZoom(slides[index]),
    };
    const act = keys[event.key];
    if (!act) return;
    event.preventDefault();
    act();
  });

  /**
   * A trackpad reports a pinch as a wheel event with `ctrlKey` set, and a
   * two-finger scroll as the same event without it. Panzoom's own
   * `zoomWithWheel` does not read the flag, and its documentation says as
   * much, so binding it directly would zoom the capture whenever a reader
   * scrolled.
   */
  rail.addEventListener(
    'wheel',
    (event) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      slides[index]?.panzoom?.zoomWithWheel(event, { step: 0.08 });
    },
    { passive: false }
  );

  /* Pinch needs two fingers, which a trackpad has and a tap does not, so a
     double tap is the other way in. */
  let lastTap = { t: 0, x: 0, y: 0 };
  rail.addEventListener('pointerup', (event) => {
    if (event.pointerType === 'mouse') return;
    const slide = slides[index];
    const near =
      event.timeStamp - lastTap.t < DOUBLE_TAP.ms &&
      Math.hypot(event.clientX - lastTap.x, event.clientY - lastTap.y) <
        DOUBLE_TAP.px;

    lastTap = { t: event.timeStamp, x: event.clientX, y: event.clientY };
    if (!near || !slide?.panzoom) return;

    lastTap.t = 0;
    if (slide.el.hasAttribute('data-zoomed')) {
      resetZoom(slide);
      return;
    }
    const max = maxScaleFor(
      slide.img.naturalWidth,
      slide.img.getBoundingClientRect().width
    );
    slide.panzoom.zoomToPoint(1 + (max - 1) * DOUBLE_TAP_SCALE, event);
  });
}
