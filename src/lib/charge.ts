/**
 * Lights a chip that was touched rather than pointed at.
 *
 * CSS owns the lit state through `:hover`, which a finger never delivers.
 * `:active` is the touch equivalent, but it lasts only while the finger is
 * down, so a tap shorter than the 140ms rise would decay from halfway and
 * read as a flicker. Holding a state after its input has ended is the one
 * thing CSS cannot express, and it is the only reason this file exists.
 *
 * One delegated listener rather than one per chip: a stack list renders 36 of
 * them, and none of them owns anything a listener would need to close over.
 */
export function initCharge() {
  document.addEventListener(
    'pointerdown',
    (event) => {
      // Hover already owns the mouse, and lights the chip on the way past.
      if (event.pointerType === 'mouse') return;
      const chip = (event.target as Element | null)?.closest?.('[data-chip]');
      if (!chip) return;
      chip.setAttribute('data-charged', '');
      setTimeout(() => chip.removeAttribute('data-charged'), 260);
    },
    { passive: true }
  );
}
