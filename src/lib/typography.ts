import { tv } from './tv';

/**
 * The type roles from DESIGN.md, as classes.
 *
 * This lives apart from `Typography.astro` so `Link.astro` can wear a role
 * without rendering through it. That is what lets `Typography` refuse to be an
 * anchor: a link needs an `href`, and a component that takes one belongs in
 * `Link`, where the prop can be required.
 */
export const text = tv({
  variants: {
    variant: {
      heading1: 'font-display text-h1 font-bold tracking-headline',
      heading2: 'font-display text-h2 font-bold tracking-title',
      heading3: 'font-display text-h3 font-bold tracking-subtitle',
      intro: 'text-lead',
      longform: 'text-read leading-reading',
      body: 'text-body',
      compact: 'text-ui',
      footnote: 'text-note',
      /* The two monospace roles carry a color because they are nearly always
         de-emphasized against the thing they annotate. Pass `text-muted` to
         bring one forward. */
      caption: 'font-mono text-meta tracking-label text-faint uppercase',
      data: 'font-mono text-meta tracking-data text-faint',
    },
  },
});

/** What each role is semantically, absent an `as` that says otherwise. */
export const ELEMENT = {
  heading1: 'h1',
  heading2: 'h2',
  heading3: 'h3',
  intro: 'p',
  longform: 'div',
  body: 'p',
  compact: 'p',
  footnote: 'p',
  /* A caption sits on its own line; a date or count sits inside one. */
  caption: 'p',
  data: 'span',
} as const;

export type TypographyVariant = keyof typeof ELEMENT;
