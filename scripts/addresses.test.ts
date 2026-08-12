import { describe, expect, it } from 'vitest';
import { refuseDuplicateAddresses } from './addresses.ts';

/**
 * Astro keeps the last of two entries that claim one address, and says nothing.
 * These cases used to need a real post, a real build, and an exit code to read.
 */
describe('refuseDuplicateAddresses', () => {
  it('accepts entries that each hold their own address', () => {
    expect(() =>
      refuseDuplicateAddresses([
        { id: 'transfer-esim', file: 'a.mdx' },
        { id: 'espresso-machines', file: 'b.mdx' },
      ])
    ).not.toThrow();
  });

  it('refuses two entries with one address', () => {
    expect(() =>
      refuseDuplicateAddresses([
        { id: 'transfer-esim', file: 'a.mdx' },
        { id: 'transfer-esim', file: 'b.mdx' },
      ])
    ).toThrow(/Two entries claim the address "transfer-esim"/);
  });

  it('names both files, because one name does not say which two', () => {
    try {
      refuseDuplicateAddresses([
        { id: 'reel', file: 'reel-watch.mdx' },
        { id: 'reel', file: 'leibowitz-me.mdx' },
      ]);
      expect.unreachable('it must throw');
    } catch (error) {
      expect((error as Error).message).toContain('reel-watch.mdx');
      expect((error as Error).message).toContain('leibowitz-me.mdx');
    }
  });

  it('accepts an empty collection', () => {
    expect(() => refuseDuplicateAddresses([])).not.toThrow();
  });
});
