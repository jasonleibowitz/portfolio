/**
 * Chrome behavior that every page gets: the theme toggle, the mobile nav
 * control, and the reading-progress bar.
 *
 * Vanilla, no framework — the site ships zero JS islands.
 */

import { initFilters } from './filter';

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');
const systemTheme = () => (darkMedia.matches ? 'dark' : 'light');

function savedTheme(): string | null {
  try {
    return localStorage.getItem('theme');
  } catch {
    return null;
  }
}

/** Keeps an open page in step with the device until the visitor overrides it. */
function initThemeSync() {
  darkMedia.addEventListener('change', () => {
    if (!savedTheme()) document.documentElement.dataset.theme = systemTheme();
  });
}

function initThemeToggle() {
  const btn = document.getElementById('themeBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    const el = document.documentElement;
    const next = el.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      el.dataset.theme = next;
      try {
        // Only remember a choice that differs from the device.
        if (next === systemTheme()) localStorage.removeItem('theme');
        else localStorage.setItem('theme', next);
      } catch {
        /* private mode; the theme still applies for this page */
      }
    };

    if (reduced || !document.startViewTransition) {
      apply();
      return;
    }

    // Sweep the new theme out as a circle from the button.
    const r = btn.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const end = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    document
      .startViewTransition(apply)
      .ready.then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${end}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 620,
            easing: 'cubic-bezier(0.3, 0, 0.2, 1)',
            pseudoElement: '::view-transition-new(root)',
          }
        );
      })
      // `ready` rejects whenever the browser skips the transition -- a hidden
      // tab, or a second click while one is still running. The theme has
      // already been applied by then, so there is nothing to recover: just
      // don't leave an unhandled rejection in the console.
      .catch(() => {});
  });
}

/**
 * Mirrors the nav panel's open state onto the control, and collapses the
 * control to its node on scroll down.
 *
 * The panel is a native popover, so the open state is already in CSS as
 * `:popover-open`. What CSS cannot reach from there is the control: it is a
 * sibling of the panel, and a top-layer element gives its invoker nothing to
 * select on. `data-open` on the wrapper is what turns the chevron and drives
 * `aria-expanded`.
 */
function initMobileNav() {
  const root = document.querySelector<HTMLElement>('.mobile-nav');
  const btn = document.getElementById('navBtn');
  const panel = document.getElementById('navPanel');
  if (!root || !btn || !panel) return;

  const setOpen = (open: boolean) => {
    root.toggleAttribute('data-open', open);
    btn.setAttribute('aria-expanded', String(open));
  };

  if (Object.hasOwn(HTMLElement.prototype, 'popover')) {
    panel.addEventListener('toggle', () =>
      setOpen(panel.matches(':popover-open'))
    );
  } else {
    // Below Safari 17 / Chrome 114 / Firefox 125 the attribute is inert: the
    // button does nothing and the panel has no UA rule hiding it. `data-open`
    // stands in for `:popover-open` in the class list, so the same styles
    // apply; dismissal and Esc are what have to be rebuilt.
    const close = () => {
      panel.removeAttribute('data-open');
      setOpen(false);
    };
    btn.addEventListener('click', () => {
      const open = !panel.hasAttribute('data-open');
      panel.toggleAttribute('data-open', open);
      setOpen(open);
    });
    document.addEventListener('click', (e) => {
      if (!root.contains(e.target as Node)) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
    });
  }

  if (reduced) return;

  // The collapsed control is slid off the right edge. Tabbing to it has to
  // bring it back, or the focus ring lands outside the viewport.
  btn.addEventListener('focus', () => root.removeAttribute('data-collapsed'));

  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      // Collapsing the control out from under an open panel would leave the
      // panel pointing at nothing.
      if (root.hasAttribute('data-open')) {
        lastY = y;
        return;
      }
      if (y > lastY + 4 && y > 140) root.setAttribute('data-collapsed', '');
      else if (y < lastY - 4) root.removeAttribute('data-collapsed');
      lastY = y;
    },
    { passive: true }
  );
}

function initProgress() {
  const fill = document.getElementById('progressFill');
  // The bar is only displayed on posts and project pages; wiring the scroll
  // listener anywhere else is pure cost.
  const page = document.body.dataset.page;
  if (!fill || (page !== 'post' && page !== 'project')) return;

  const update = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0;
    fill.style.width = `${(p * 100).toFixed(2)}%`;
  };

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
}

export function initChrome() {
  initThemeSync();
  initThemeToggle();
  initMobileNav();
  initProgress();
  initFilters();
}
