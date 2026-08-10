import { defineArrayMember, defineField, defineType } from 'sanity';

import { ArtworkFieldInput } from '../ArtworkFieldInput';

/**
 * The one rich text shape, shared by post bodies and project sections.
 *
 * Named rather than declared inline so an image can be dropped into any of
 * them: an array that only accepts text blocks rejects a dragged file with
 * "no known conversion from content type to array item", which is the error
 * you hit on a project.
 */
export const richText = defineType({
  name: 'richText',
  type: 'array',
  of: [
    defineArrayMember({
      type: 'block',
      styles: [
        { title: 'Paragraph', value: 'normal' },
        // No H1: the page renders the title as its own h1 already.
        { title: 'Heading 2', value: 'h2' },
        { title: 'Heading 3', value: 'h3' },
        { title: 'Quote', value: 'blockquote' },
      ],
      marks: {
        decorators: [
          { title: 'Bold', value: 'strong' },
          { title: 'Italic', value: 'em' },
          { title: 'Code', value: 'code' },
        ],
      },
    }),
    defineArrayMember({
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({ name: 'alt', type: 'string' }),
        defineField({ name: 'caption', type: 'string' }),
        defineField({
          name: 'attribution',
          type: 'object',
          fields: [
            defineField({ name: 'text', type: 'string' }),
            defineField({ name: 'href', type: 'url' }),
          ],
        }),
      ],
    }),
    defineArrayMember({
      name: 'code',
      title: 'Code snippet',
      type: 'object',
      fields: [
        defineField({ name: 'language', type: 'string' }),
        defineField({ name: 'code', type: 'text', rows: 10 }),
      ],
      preview: {
        select: { language: 'language' },
        prepare: ({ language }) => ({ title: `Code (${language ?? 'text'})` }),
      },
    }),
  ],
});

/**
 * The tag vocabulary, in one place. Posts and lists both point at it, so a new
 * chip is added once and offered everywhere rather than retyped per entry.
 *
 * A predefined list rather than free text: the site renders tags as a filter
 * rail, and a typo there becomes a category of one that nothing else matches.
 */
export const tag = defineType({
  name: 'tag',
  title: 'Tag',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      type: 'string',
      validation: (r) => r.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'title' },
      validation: (r) => r.required(),
    }),
  ],
});

/**
 * Tags are documents, not strings, so the vocabulary is one editable list
 * rather than a set of literals retyped per entry. Three things follow:
 * the picker only offers tags that exist, renaming a tag updates every entry
 * that points at it, and adding one is done in the studio instead of in code.
 */
export const tagsField = defineField({
  name: 'tags',
  title: 'Tags',
  type: 'array',
  of: [{ type: 'reference', to: [{ type: 'tag' }] }],
  options: { layout: 'tags' },
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
      // Adds "Fetch artwork" beneath the upload field, for items that already
      // exist. The search row on the array only helps when adding a new one.
      components: { input: ArtworkFieldInput },
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
