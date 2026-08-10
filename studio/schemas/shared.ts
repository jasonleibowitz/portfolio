import { defineField, defineType } from 'sanity';

/**
 * The tag vocabulary, in one place. Posts and lists both point at it, so a new
 * chip is added once and offered everywhere rather than retyped per entry.
 *
 * A predefined list rather than free text: the site renders tags as a filter
 * rail, and a typo there becomes a category of one that nothing else matches.
 */
export const TAGS = [
  'apple',
  'coffee',
  'comedy',
  'design',
  'economics',
  'gadgets',
  'how-to',
  'networking',
  'review',
  'sci-fi',
  'trivia',
] as const;

export const tagsField = defineField({
  name: 'tags',
  title: 'Tags',
  type: 'array',
  of: [{ type: 'string' }],
  options: {
    list: TAGS.map((t) => ({ title: t, value: t })),
    layout: 'tags',
  },
});

/**
 * Artwork ratios, as data rather than code.
 *
 * The site ships two: square art (podcasts, albums) and 2:3 posters (films,
 * books). Both render 56px wide so the artwork column lines up across lists and
 * only the row height changes. Adding a third ratio is one entry here plus one
 * `aspectRatio` case, not a schema migration.
 */
export const THUMB_RATIOS = {
  square: { title: 'Square (1:1)', aspectRatio: 1 },
  poster: { title: 'Poster (2:3)', aspectRatio: 2 / 3 },
} as const;

export const thumbField = defineField({
  name: 'thumb',
  title: 'Artwork ratio',
  type: 'string',
  initialValue: 'square',
  options: {
    list: Object.entries(THUMB_RATIOS).map(([value, { title }]) => ({
      title,
      value,
    })),
    layout: 'radio',
  },
});

/**
 * One entry in a list: a recommendation, so usually a link out.
 *
 * Defined as a named object type rather than inline so the flat `items` array
 * and the arrays nested inside `groups` are the same shape. That is what lets
 * an item be dragged from one group to another without changing form.
 */
export const listItem = defineType({
  name: 'listItem',
  title: 'Item',
  type: 'object',
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({ name: 'href', title: 'Link', type: 'url' }),
    defineField({
      name: 'image',
      title: 'Artwork',
      type: 'image',
      // Hotspot lets one upload serve any ratio: the crop is stored with the
      // asset, so adding a ratio later re-crops rather than re-uploads.
      options: { hotspot: true },
    }),
    defineField({
      name: 'subtitle',
      title: 'Credit',
      type: 'string',
      description:
        "A few words that identify this kind of thing: a podcast's hosts, a book's author.",
    }),
    defineField({ name: 'note', type: 'text', rows: 3 }),
    tagsField,
  ],
  preview: {
    select: { title: 'name', subtitle: 'subtitle', media: 'image' },
  },
});
