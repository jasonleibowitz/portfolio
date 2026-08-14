import { describe, expect, it } from 'vitest';
import { fullSrcFor, maxScaleFor } from './lightbox.ts';

/**
 * The two decisions in the lightbox that are arithmetic rather than DOM, and
 * both are ones this project can get wrong silently: a rendition picked for
 * the wrong theme opens a light capture on a dark page, and a ceiling set too
 * low leaves a capture that cannot be zoomed to the size its copy reads at.
 */
describe('fullSrcFor', () => {
  it('takes the dark rendition on a dark page', () => {
    expect(fullSrcFor({ light: '/l.webp', dark: '/d.webp' }, 'dark')).toBe(
      '/d.webp'
    );
  });

  it('takes the light rendition on a light page', () => {
    expect(fullSrcFor({ light: '/l.webp', dark: '/d.webp' }, 'light')).toBe(
      '/l.webp'
    );
  });

  it('falls back to light where a capture has no dark twin', () => {
    // Two reel-watch captures are drawn over poster art and name one file for
    // both themes, so this is a normal input and not a missing one.
    expect(fullSrcFor({ light: '/l.webp' }, 'dark')).toBe('/l.webp');
  });

  it('treats an unset theme as light, the way the page does', () => {
    // `BaseLayout` renders `data-theme="light"`, but the attribute is read
    // before the bootstrap script has necessarily run.
    expect(fullSrcFor({ light: '/l.webp', dark: '/d.webp' })).toBe('/l.webp');
    expect(fullSrcFor({ light: '/l.webp', dark: '/d.webp' }, null)).toBe(
      '/l.webp'
    );
  });
});

describe('maxScaleFor', () => {
  it('lets a browser capture reach the size it was captured at', () => {
    // 1968px holding a ~984pt window, fit to a 390px phone. A device-pixel
    // ceiling would stop at 1.68 and never reach 984pt, which is the one
    // width the window's body copy is known to read at.
    expect(maxScaleFor(1968, 390)).toBeCloseTo(5.05, 2);
    expect(390 * maxScaleFor(1968, 390)).toBeGreaterThan(984);
  });

  it('leaves a capture drawn larger than its source alone', () => {
    expect(maxScaleFor(1320, 1400)).toBe(1);
  });

  it('caps a small capture in a large viewport', () => {
    expect(maxScaleFor(4000, 100)).toBe(8);
  });

  it('returns 1 before the file has loaded and reported a size', () => {
    expect(maxScaleFor(0, 390)).toBe(1);
    expect(maxScaleFor(1968, 0)).toBe(1);
  });
});
