import { createTV } from 'tailwind-variants';

/**
 * `tv` de-duplicates conflicting Tailwind classes, and it reads an
 * unrecognized `text-*` as a text *color*. The design tokens in `@theme` are
 * invisible to it, so `text-ui` — a font size — looked like a color and
 * silently cancelled the `text-white` it was merged with: every primary
 * Button rendered ink-on-gradient instead. Naming the tokens here is what
 * stops a size from eating a color.
 *
 * This mirrors the `--text-*`, `--tracking-*`, `--leading-*`, `--shadow-*`,
 * `--radius-*` and `--container-*` namespaces in `src/styles/global.css`. A
 * token added there needs its name added here too; nothing renders a page to
 * catch the omission.
 */
export const tv = createTV({
  twMergeConfig: {
    extend: {
      theme: {
        text: [
          'mega',
          'h1',
          'h2',
          'h3',
          'lead',
          'read',
          'body',
          'ui',
          'note',
          'meta',
        ],
        tracking: ['headline', 'title', 'subtitle', 'data', 'label'],
        leading: ['numeral', 'reading'],
        ease: ['orbit'],
        shadow: ['lift'],
        radius: ['card'],
        container: ['page', 'measure', 'bio'],
      },
    },
  },
});
