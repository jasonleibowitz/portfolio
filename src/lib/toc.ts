/**
 * Marks the section being read in a post's contents rail.
 *
 * Heading positions are measured once and re-measured only when something can
 * have moved them, so the scroll handler reads `scrollY` and nothing else.
 * Calling `getBoundingClientRect` on every heading per frame would force a
 * layout on a page that is otherwise doing no work while it scrolls.
 *
 * Progressive: the anchors already navigate. This only adds the mark saying
 * which one you are inside.
 */

/**
 * The sticky header's underside, read from the token the headings' own
 * `scroll-mt-header` and every sticky rail resolve against, so this cannot
 * hold a number the stylesheet has since moved on from.
 */
const HEADER = parseFloat(
  getComputedStyle(document.documentElement).getPropertyValue(
    '--spacing-header'
  )
);

/**
 * How far past the header a heading has to travel before its section counts as
 * the one being read, so the mark changes as a heading settles under the
 * chrome rather than the instant its first pixel clears it.
 */
const LEAD = 24;

export function initToc() {
  const nav = document.querySelector<HTMLElement>('[data-toc]');
  if (!nav) return;

  const items = Array.from(
    nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')
  )
    .map((link) => ({
      link,
      section: document.getElementById(decodeURIComponent(link.hash.slice(1))),
    }))
    .filter((item) => item.section !== null) as {
    link: HTMLAnchorElement;
    section: HTMLElement;
  }[];

  if (!items.length) return;

  let tops: number[] = [];
  const measure = () => {
    tops = items.map(
      ({ section }) => section.getBoundingClientRect().top + window.scrollY
    );
  };

  let current = -1;
  const paint = () => {
    /* The last screenful of a post cannot be scrolled to the top, so the
       headings inside it never cross the line and the final sections would
       never light up -- on a post ending in a short Conclusion and Resources,
       the rail sat on the section before them while the reader looked straight
       at the last one. Past the point where scrolling runs out, the line
       stretches down through the rest of the viewport instead, which hands the
       remaining sections the band they actually live in. */
    const furthest = document.documentElement.scrollHeight - window.innerHeight;
    const reach = window.innerHeight - HEADER - LEAD;
    const stretch = Math.max(0, window.scrollY - (furthest - reach));
    const line = window.scrollY + HEADER + LEAD + stretch;

    /* Defaults to the first section rather than to nothing: a post body has to
       start at `##`, so there is no stretch of prose above the first heading
       for "no section" to describe. */
    let next = 0;
    for (let index = 0; index < tops.length; index += 1) {
      if (tops[index] <= line) next = index;
    }

    if (next === current) return;
    items[current]?.link.removeAttribute('aria-current');
    items[next].link.setAttribute('aria-current', 'location');
    current = next;
  };

  let queued = false;
  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      paint();
    });
  };

  const remeasure = () => {
    measure();
    paint();
  };

  remeasure();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', remeasure);
  /* Images in the body settle after first paint and move every heading under
     them; without this the marks are off by a section on a picture-heavy post. */
  window.addEventListener('load', remeasure);
}
