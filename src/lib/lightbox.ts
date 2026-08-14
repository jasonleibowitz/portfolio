import type { PanzoomObject } from '@panzoom/panzoom';

/**
 * Opens a project capture full size, in a modal that pages and zooms.
 *
 * The row draws its captures to be recognized, not read: a phone matched to a
 * browser's height never reaches the 280px where body copy resolves. Almost
 * all of the answer is the platform's, `showModal()` and a scroll-snap rail
 * between them. Panzoom is loaded on the first open for the one thing neither
 * has, which is pinch.
 */

/** How near two taps must fall, in ms and px, to read as one double tap. */
const DOUBLE_TAP = { ms: 320, px: 30 };

/** Where a double tap lands, as a share of the distance to `maxScale`. */
const DOUBLE_TAP_SCALE = 0.6;

/** Past this the pointer was dragging the rail, and its click is not a click. */
const DRAG_SLOP = 10;

/** How long an open waits for its capture before going without it. */
const WARM_MS = 220;

/** Symmetric clamp, because every bound here is the same distance either way. */
const clamp = (value: number, min: number) =>
  Math.min(Math.max(value, min), -min);

interface Pan {
  x: number;
  y: number;
  scale: number;
}

/**
 * Picks the rendition that matches the theme on the page. Two captures name
 * one file for both, because they are drawn over poster art and there is
 * nothing to re-take, so `dark` equalling `light` is a normal input.
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
 * Not one image pixel per device pixel. That ceiling stops a 1968px browser
 * capture at 1.68 on a 3x phone, short of the ~984pt width its body copy is
 * known to read at. The cap stops a small capture in a large viewport zooming
 * absurdly.
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
  light: string;
  dark?: string;
  /** Which theme the loaded file belongs to, so a flip between opens is seen. */
  theme?: string;
  panzoom?: PanzoomObject;
  /** The drawn size at rest, which every pan bound is measured against. */
  baseW: number;
  baseH: number;
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
  const fitBtn = dialog.querySelector<HTMLElement>('[data-lb-fit]')!;
  const prevBtn = dialog.querySelector<HTMLButtonElement>('[data-lb-prev]')!;
  const nextBtn = dialog.querySelector<HTMLButtonElement>('[data-lb-next]')!;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  /* Per call, not once: a hidden document gets no rendering opportunity, and
     `startViewTransition` holds its callback until it does, so a lightbox
     opened in a background tab would never open at all. */
  const animated = () =>
    !reduced && !!document.startViewTransition && !document.hidden;

  let index = 0;
  let opener: HTMLElement | null = null;
  /* Whether the reader reached the lightbox by keyboard, which decides
     whether returning focus should be visible. */
  let byKeyboard = false;
  let Panzoom: typeof import('@panzoom/panzoom').default | null = null;

  /* ---------------------------------------------------------------- frames */

  /**
   * Turns each frame into a button at runtime rather than rendering one. A
   * server-rendered button whose handler never arrives is a control that does
   * nothing, and with no JS the captures must render exactly as they do now.
   * `footnotes.ts` upgrades its references the same way.
   */
  const frameList = Array.from(frames, (frame) => {
    /* Before the children move, because afterwards the frame holds none. */
    const alt = frame.querySelector('img')?.alt ?? '';

    const button = document.createElement('button');
    button.type = 'button';
    /* `shot-btn` carries the reset in `base.css`, which needs no specificity;
       the focus rule is a utility, and utilities outrank `@layer base`. */
    button.className = `${frame.className} shot-btn data-[quiet-focus]:focus-visible:outline-none`;
    Object.assign(button.dataset, frame.dataset);
    button.append(...frame.childNodes);
    button.setAttribute('aria-label', alt ? `Enlarge: ${alt}` : 'Enlarge');
    /* `detail` is 0 when a click came from Enter or Space rather than from a
       pointer, which is the only reliable way to tell the two apart here. */
    button.addEventListener('click', (event) => {
      byKeyboard = event.detail === 0;
      void open(button);
    });

    frame.replaceWith(button);
    return button;
  });

  /* ----------------------------------------------------------------- slides */

  /* The slides are markup `Lightbox.astro` rendered, not something this file
     builds, so they are read once and outlive every open. */
  const slides: Slide[] = Array.from(
    rail.querySelectorAll<HTMLElement>('[data-lb-slide]'),
    (el) => ({
      el,
      img: el.querySelector('img')!,
      light: el.dataset.full!,
      dark: el.dataset.fullDark,
      baseW: 0,
      baseH: 0,
    })
  );

  /**
   * Fetches a slide's capture, once per theme. The one being opened and its
   * two neighbours, so paging never lands on an empty frame and a row of eight
   * never costs eight downloads to read one.
   */
  const load = (slide?: Slide) => {
    if (!slide) return Promise.resolve();
    /* Per theme, because the slides outlive an open and the reader may have
       changed it in between. */
    const theme = document.documentElement.dataset.theme ?? 'light';
    const src = fullSrcFor({ light: slide.light, dark: slide.dark }, theme);
    if (slide.theme === theme || !src) return Promise.resolve();

    slide.theme = theme;
    slide.img.src = src;
    return slide.img
      .decode()
      .then(() => armZoom(slide))
      .catch(() => {});
  };

  /* ------------------------------------------------------------------- zoom */

  /**
   * Gives a slide its zoom, once both halves are in hand.
   *
   * Panzoom is fetched while the captures are and either can arrive first. A
   * capture with no decoded file has no natural width, and a ceiling worked
   * from that is 1: a capture that cannot be zoomed at all.
   */
  const armZoom = (slide: Slide) => {
    if (!Panzoom || !slide.img.naturalWidth) return;

    /* The drawn size with the zoom taken back out, which every bound below is
       a ratio against. Read rather than stored, so a resize cannot leave it
       describing a capture that has changed. */
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
      /* No `contain`: neither mode fits a fitted capture. `'outside'` threw
         the picture off screen at rest, `'inside'` pinned the scale at 1, and
         `clampPan` below holds it instead. */
      /* Apple's rule, and Panzoom states it as an option: at rest a drag is
         the rail paging, and only a zoomed capture takes the drag as a pan. */
      panOnlyWhenZoomed: true,
      /* Panzoom would otherwise write `touch-action: none` onto the image and
         the rail, which stops the rail scrolling at all. The capture's own
         utilities own that pair and key it off `data-zoomed`. */
      touchAction: '',
      /* Same again: Panzoom writes a cursor inline whether asked or not, and
         inline outranks any class. */
      cursor: '',
      animate: true,
      duration: 180,
      step: 0.35,
    });

    slide.img.addEventListener('panzoomchange', (event) => {
      const { scale } = (event as CustomEvent<{ scale: number }>).detail;
      markZoom(slide, scale > 1.01);
      clampPan(slide, event as CustomEvent<Pan>);
    });
  };

  /**
   * Holds a zoomed capture inside its own edges.
   *
   * The bound is how far the picture reaches beyond the slide, which is
   * nothing until it is zoomed, so a capture recentres itself on the way back
   * down.
   *
   * A drag that pushes past the bound does nothing else. It used to page, the
   * way iOS hands a pan at the edge to the scroll view outside it, and three
   * attempts at that all paged when the reader meant to look around: a finger
   * resting past the edge, a vertical drag on a capture already pinned
   * sideways, and a pinch whose midpoint drifts. Zoomed is its own mode now,
   * and the control in the corner is the way out of it.
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
  };

  /* The capture carries it for its own `touch-action` and cursor; the dialog
     carries it so the control that undoes the zoom knows to appear. */
  const markZoom = (slide: Slide, zoomed: boolean) => {
    slide.img.toggleAttribute('data-zoomed', zoomed);
    dialog.toggleAttribute('data-zoomed', zoomed);
  };

  /** Loads Panzoom the first time a capture is opened, and never before. */
  const loadZoom = async () => {
    if (!Panzoom) Panzoom = (await import('@panzoom/panzoom')).default;
    slides.forEach(armZoom);
  };

  const resetZoom = (slide?: Slide) => {
    if (!slide?.panzoom) return;
    slide.panzoom.reset({ animate: true, duration: 180 });
    markZoom(slide, false);
  };

  /* ---------------------------------------------------------------- paging */

  /**
   * Moves to a capture, marking it before the scroll rather than after. A
   * scroll that reports nothing back would leave the index behind, and the
   * next press would aim at where the rail already is, which reads as a dead
   * control.
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

  /* A finger moves the rail without anything above being called, so the
     position is read back off the scroller. `scrollLeft` over the rail's width
     is the whole calculation. */
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

  const show = (start: number) => {
    dialog.showModal();

    /* `clientWidth` is 0 while the dialog is display:none, so the rail can
       only be positioned once it is open. Nothing paints between the two, so
       the first frame is already on the right capture. */
    rail.scrollLeft = start * rail.clientWidth;
    mark(start);

    void loadZoom();
    rail.focus({ preventScroll: true });
  };

  async function open(button: HTMLButtonElement) {
    const start = frameList.indexOf(button);
    if (start < 0 || !slides[start]) return;
    opener = button;

    if (!animated()) {
      show(start);
      return;
    }

    /* Warm the capture before the transition rather than during it, or the
       frame grows into an image that has not arrived. Raced, because a slow
       connection must delay the open by a blink and not by a download. */
    await Promise.race([
      load(slides[start]),
      new Promise((r) => setTimeout(r, WARM_MS)),
    ]);

    /* The capture grows out of the frame that was tapped, so the enlargement
       has a place it came from, and closing puts it back there. */
    const from = visibleImg(button);
    if (from) from.style.viewTransitionName = 'lb-shot';

    document
      .startViewTransition(() => {
        if (from) from.style.removeProperty('view-transition-name');
        show(start);
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
   * Gives back what an open took: the zoom instances and the focus. The rail
   * is markup and stays standing. Idempotent, because it is called directly
   * and is also wired to `close` for any dismissal this file did not perform.
   */
  const teardown = () => {
    slides.forEach((slide) => {
      slide.panzoom?.destroy();
      slide.panzoom = undefined;
      slide.img.removeAttribute('data-zoomed');
      slide.img.style.removeProperty('transform');
    });
    dialog.removeAttribute('data-zoomed');
    /* Focus goes back either way: a reader who cannot see the capture must not
       be dropped at the top of the document. Only the ring is conditional, and
       only because Safari matches `:focus-visible` for a programmatic focus
       even when the reader has done nothing but tap. */
    const back = opener;
    opener = null;
    if (!back) return;

    if (!byKeyboard) {
      back.setAttribute('data-quiet-focus', '');
      /* Two ways out, or a keyboard reader loses the ring on this capture for
         the rest of the page's life. */
      const restore = () => back.removeAttribute('data-quiet-focus');
      back.addEventListener('blur', restore, { once: true });
      document.addEventListener('keydown', restore, { once: true });
    }
    back.focus({ preventScroll: true });
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
  fitBtn.addEventListener('click', () => resetZoom(slides[index]));
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
   * A trackpad reports a pinch as a wheel event with `ctrlKey`, and a
   * two-finger scroll as the same event without it. Panzoom's `zoomWithWheel`
   * does not read the flag, so binding it directly zooms the capture whenever
   * a reader scrolls.
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
    if (slide.img.hasAttribute('data-zoomed')) {
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
