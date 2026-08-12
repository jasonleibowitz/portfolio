import { describe, expect, it } from 'vitest';
import { slugify } from './slug.ts';

/**
 * Each case here is one this project got wrong, or nearly did. A slug reaches
 * the address of a page, thus a wrong one is a wrong address.
 */
describe('slugify', () => {
  it('joins the words of a title with single dashes', () => {
    expect(slugify('My AirPods Pro Review')).toBe('my-airpods-pro-review');
  });

  it('keeps a name that holds a capital in the middle', () => {
    // `dashCase` gave `e-sim`, `i-phone` and `wi-fi` here.
    expect(slugify('How to Transfer an eSIM from an old iPhone')).toBe(
      'how-to-transfer-an-esim-from-an-old-iphone'
    );
    expect(slugify('Your WiFi Router')).toBe('your-wifi-router');
  });

  it('removes an accent and keeps the letter', () => {
    expect(slugify('A Café in Zürich')).toBe('a-cafe-in-zurich');
  });

  it('removes an apostrophe instead of making it a dash', () => {
    expect(slugify("What I'd Do Differently")).toBe('what-id-do-differently');
    expect(slugify('The Reader’s Digest')).toBe('the-readers-digest');
  });

  it('gives one dash where a title holds several characters to drop', () => {
    expect(slugify('C++ vs. C#: a 50/50 split')).toBe('c-vs-c-a-50-50-split');
    expect(slugify('Two   spaces -- and a dash')).toBe('two-spaces-and-a-dash');
  });

  it('leaves no dash at the start or the end', () => {
    expect(slugify('  Leading and trailing  ')).toBe('leading-and-trailing');
    expect(slugify('Shipping 🚀 Fast')).toBe('shipping-fast');
  });

  it('gives what the schema accepts', () => {
    // The same rule as `address` in `src/content.config.ts`.
    const rule = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    for (const title of [
      'A Café in Zürich',
      'Shipping 🚀 Fast',
      "Don't Buy an Espresso Machine",
      '  Leading and trailing  ',
    ]) {
      expect(slugify(title)).toMatch(rule);
    }
  });
});
