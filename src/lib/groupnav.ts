/**
 * Marks the section rail on a grouped list with whichever group is in view.
 *
 * Without this the rail is a list of links that never tells you where you are,
 * which on a page whose whole structure is its groups is the half of the
 * feature that matters. The anchors work with JavaScript off; this only adds
 * the position report.
 *
 * The observer watches a band across the upper third of the viewport rather
 * than the whole of it, so "current" means the heading you have most recently
 * scrolled past -- not whichever of three simultaneously visible sections
 * happens to intersect first.
 */
export function initGroupNav() {
  const rail = document.querySelector<HTMLElement>('[data-group-nav]');
  if (!rail) return;

  const links = new Map<string, HTMLAnchorElement>();
  for (const link of rail.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
    links.set(decodeURIComponent(link.hash.slice(1)), link);
  }
  if (!links.size) return;

  const sections = [...links.keys()]
    .map((id) => document.getElementById(id))
    .filter((el): el is HTMLElement => el !== null);
  if (!sections.length) return;

  let current = '';

  const mark = (id: string) => {
    if (id === current) return;
    current = id;

    for (const [key, link] of links) {
      if (key === id) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  };

  const observer = new IntersectionObserver(
    () => {
      // Pick from live positions rather than from the entries the callback
      // happens to carry: a single scroll can fire for one section while a
      // different one is the topmost thing on screen.
      const line = window.innerHeight * 0.3;
      let best = sections[0];

      for (const section of sections) {
        if (section.getBoundingClientRect().top <= line) best = section;
      }

      mark(best.id);
    },
    { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
  );

  for (const section of sections) observer.observe(section);
}
