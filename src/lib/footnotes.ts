/**
 * Turns GFM footnote references into popovers.
 *
 * Markdown gives us `<sup><a data-footnote-ref href="#user-content-fn-1">`,
 * which throws the reader to the bottom of the page and loses their place.
 * Each reference is swapped for a button that opens the note where it is; the
 * ↩ in the footnote list scrolls back and reopens the popover it came from.
 *
 * Progressive by construction: with JS off the anchors are left alone and the
 * footnote list at the bottom still works as normal.
 */
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function initFootnotes() {
  const refs = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[data-footnote-ref]')
  );
  if (!refs.length) return;

  const pop = document.createElement('div');
  pop.id = 'fnpop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-live', 'polite');
  document.body.appendChild(pop);

  let openRef: HTMLButtonElement | null = null;

  const close = () => {
    pop.classList.remove('is-open');
    openRef?.setAttribute('aria-expanded', 'false');
    openRef = null;
  };

  const open = (button: HTMLButtonElement) => {
    const source = document.getElementById(button.dataset.fnTarget!);
    if (!source) return;

    const body = source.cloneNode(true) as HTMLElement;
    body.querySelector('[data-footnote-backref]')?.remove();

    pop.replaceChildren();
    const label = document.createElement('span');
    label.className = 'fn-num';
    label.textContent = `Note ${button.textContent?.trim()}`;
    pop.append(label);
    pop.insertAdjacentHTML('beforeend', body.innerHTML.trim());

    pop.classList.add('is-open');
    button.setAttribute('aria-expanded', 'true');
    openRef = button;

    // Centre under the reference, then clamp inside the viewport.
    const rect = button.getBoundingClientRect();
    const width = pop.offsetWidth;
    pop.style.top = `${rect.bottom + window.scrollY + 8}px`;
    pop.style.left = `${Math.min(
      Math.max(12, rect.left + window.scrollX - width / 2 + rect.width / 2),
      document.documentElement.clientWidth - width - 12
    )}px`;
  };

  refs.forEach((ref) => {
    const target = ref.getAttribute('href')!.slice(1);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'fn-btn';
    button.dataset.fnTarget = target;
    button.id = ref.id;
    button.setAttribute('aria-expanded', 'false');
    button.textContent = ref.textContent;

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const wasOpen = openRef === button;
      close();
      if (!wasOpen) open(button);
    });

    ref.replaceWith(button);
  });

  document
    .querySelectorAll<HTMLAnchorElement>('a[data-footnote-backref]')
    .forEach((back) => {
      back.addEventListener('click', (event) => {
        event.preventDefault();
        const ref = document.getElementById(
          back.getAttribute('href')!.slice(1)
        ) as HTMLButtonElement | null;
        if (!ref) return;

        ref.scrollIntoView({
          behavior: reduced ? 'auto' : 'smooth',
          block: 'center',
        });
        // Wait for the scroll to settle, or the popover lands at the old
        // position and then slides away from its own reference.
        setTimeout(
          () => {
            close();
            open(ref);
          },
          reduced ? 0 : 420
        );
      });
    });

  document.addEventListener('click', (event) => {
    if (
      pop.classList.contains('is-open') &&
      !pop.contains(event.target as Node)
    ) {
      close();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') close();
  });
}
