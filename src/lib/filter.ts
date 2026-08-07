/**
 * Tag filtering for the Writing index and any list with a tag rail.
 *
 * A page has at most one filter. The rows and group headings must live inside
 * `[data-filter-root]` so they can be scoped, but the count line does not —
 * on a list page it sits up in the page header, above the rail entirely — so
 * the count and empty-state elements are looked up page-wide.
 *
 * Filtering hides rows; it never reorders or renumbers them. A ranked list's
 * position comes from the item's index in the data and is written into the
 * markup, so a film ranked seventh overall still reads as seventh once you
 * narrow to sci-fi. Deriving it from `<ol>` numbering or a CSS counter would
 * renumber from one the moment a row above it is hidden.
 */
export function initFilters() {
  const root = document.querySelector<HTMLElement>('[data-filter-root]');
  if (!root) return;

  const buttons = Array.from(
    root.querySelectorAll<HTMLButtonElement>('[data-tag]')
  );
  if (!buttons.length) return;

  const rows = Array.from(root.querySelectorAll<HTMLElement>('[data-tags]'));
  const groups = Array.from(
    root.querySelectorAll<HTMLElement>('[data-filter-group]')
  );
  const countEl = document.querySelector<HTMLElement>('[data-filter-count]');
  const emptyEl = document.querySelector<HTMLElement>('[data-filter-empty]');
  const sectionsEl = document.querySelector<HTMLElement>(
    '[data-filter-sections]'
  );

  const unit = root.dataset.unit || 'posts';

  // Stripping a trailing `s` turns "posts" into "post" and "entries" into
  // "entrie", so the singular is declared alongside the plural instead.
  const singular = root.dataset.unitOne || unit.replace(/s$/, '');

  const apply = (tag: string) => {
    let shown = 0;

    rows.forEach((row) => {
      const match = !tag || ` ${row.dataset.tags} `.includes(` ${tag} `);
      row.hidden = !match;
      if (match) shown += 1;
    });

    // A group with nothing left in it shouldn't leave a stray heading, and one
    // that survives has to report what it is actually showing -- a heading that
    // still reads "News 4" above three rows is worse than no count at all.
    groups.forEach((group) => {
      const left = group.querySelectorAll('[data-tags]:not([hidden])').length;
      group.hidden = left === 0;

      const badge = group.querySelector<HTMLElement>('[data-group-count]');
      if (badge) badge.textContent = String(left);
    });

    if (sectionsEl) {
      const left = groups.filter((group) => !group.hidden).length;
      sectionsEl.textContent = `${left} ${left === 1 ? 'section' : 'sections'}`;
    }

    if (countEl) {
      countEl.textContent =
        `${shown} ${shown === 1 ? singular : unit}` +
        (tag ? ` tagged ${tag}` : '');
    }
    if (emptyEl) emptyEl.hidden = shown > 0;
  };

  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      buttons.forEach((other) =>
        other.setAttribute('aria-pressed', String(other === button))
      );
      apply(button.dataset.tag || '');
    });
  });
}
