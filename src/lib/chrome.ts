/**
 * Chrome behavior that every page gets: the theme toggle, the tab bar's
 * scroll collapse, and the reading-progress bar.
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

/** Collapses to icons as you scroll down, expands again on the way up. */
function initMobileTabNav() {
  const nav = document.querySelector('.mobile-tab-nav');
  if (!nav || reduced) return;

  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      if (y > lastY + 4 && y > 140) nav.setAttribute('data-collapsed', '');
      else if (y < lastY - 4) nav.removeAttribute('data-collapsed');
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
  initMobileTabNav();
  initProgress();
  initFilters();
}
