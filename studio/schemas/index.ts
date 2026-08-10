import { defineArrayMember, defineField, defineType } from 'sanity';

import { ArtworkInput } from '../ArtworkInput';
import { SOURCE_OPTIONS } from '../artwork-sources';
import { listItem, richText, tag, tagsField, thumbField } from './shared';

const post = defineType({
  name: 'post',
  title: 'Writing',
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
      options: { source: 'title', maxLength: 96 },
      validation: (r) => r.required(),
    }),
    /*
     * `date`, not `datetime`. A post's publish date is a plain day with no time
     * and no zone, so a datetime would be converted through the editor's local
     * time and land a day early west of Greenwich. That is exactly the bug Tina
     * has, and picking the right primitive is what avoids it.
     */
    defineField({
      name: 'pubDate',
      title: 'Published',
      type: 'date',
      options: { dateFormat: 'YYYY-MM-DD' },
      validation: (r) => r.required(),
    }),
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({
      name: 'author',
      type: 'string',
      initialValue: 'Jason Leibowitz',
    }),
    defineField({
      name: 'image',
      title: 'Cover image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          type: 'string',
          validation: (r) => r.required(),
        }),
      ],
    }),
    tagsField,
    defineField({ name: 'draft', type: 'boolean', initialValue: true }),
    defineField({ name: 'body', type: 'richText' }),
  ],
  preview: { select: { title: 'title', subtitle: 'pubDate', media: 'image' } },
});

const list = defineType({
  name: 'list',
  title: 'Lists',
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
    defineField({ name: 'description', type: 'text', rows: 3 }),
    defineField({ name: 'updated', type: 'date' }),
    defineField({
      name: 'ranked',
      title: 'Ranked',
      type: 'boolean',
      initialValue: false,
      description:
        'A ranked list is one numbered sequence, so it cannot be grouped.',
    }),
    thumbField,
    /*
     * Where this list's items come from, which drives the search box on the
     * items array. Separate from `thumb`: the ratio is how an item looks, the
     * source is where its data lives, and a coffee shop is square like a
     * podcast while sharing nothing else with one.
     */
    defineField({
      name: 'source',
      title: 'Item source',
      type: 'string',
      initialValue: 'manual',
      options: { list: SOURCE_OPTIONS },
      description:
        'Adds a search box to the items below. Pick "None" for lists with no catalogue behind them.',
    }),
    /*
     * `items` and `groups` are mutually exclusive, and the editor enforces it
     * two ways so an invalid list cannot be built in the first place: each is
     * hidden when the other is in use, and validation rejects the combination
     * anyway. This is the zod `superRefine` rule, moved to where the mistake
     * would be made instead of where the build would fail.
     */
    defineField({
      name: 'items',
      title: 'Items',
      type: 'array',
      of: [{ type: 'listItem' }],
      components: { input: ArtworkInput },
      hidden: ({ document }) => !!(document?.groups as unknown[])?.length,
      validation: (r) =>
        r.custom((items, ctx) => {
          const groups = (ctx.document?.groups as unknown[]) ?? [];
          if (items?.length && groups.length)
            return 'A list carries items or groups, never both';
          if (!items?.length && !groups.length)
            return 'A list needs either items or groups';
          return true;
        }),
    }),
    defineField({
      name: 'groups',
      title: 'Groups',
      type: 'array',
      hidden: ({ document }) =>
        !!(document?.ranked || (document?.items as unknown[])?.length),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'group',
          fields: [
            defineField({
              name: 'name',
              type: 'string',
              validation: (r) => r.required(),
            }),
            defineField({ name: 'description', type: 'text', rows: 2 }),
            // Same `listItem` type as the flat array above, which is what lets
            // an item be dragged between groups.
            defineField({
              name: 'items',
              type: 'array',
              of: [{ type: 'listItem' }],
              components: { input: ArtworkInput },
            }),
          ],
          preview: {
            select: { title: 'name', items: 'items' },
            prepare: ({ title, items }) => ({
              title,
              subtitle: `${(items as unknown[] | undefined)?.length ?? 0} items`,
            }),
          },
        }),
      ],
    }),
    defineField({ name: 'draft', type: 'boolean', initialValue: true }),
  ],
  preview: { select: { title: 'title', subtitle: 'updated' } },
});

const project = defineType({
  name: 'project',
  title: 'Projects',
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
    defineField({ name: 'description', type: 'text', rows: 2 }),
    defineField({ name: 'icon', type: 'image' }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: ['development', 'testing', 'live'],
        layout: 'radio',
      },
    }),
    defineField({ name: 'status_text', title: 'Status text', type: 'string' }),
    defineField({
      name: 'stack',
      title: 'Stack',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    /*
     * Named fields rather than a label/value array. The array let every project
     * invent its own rows, so the spec rail drifted between pages; these are
     * the same five rows everywhere, and a blank one simply does not render.
     * Renaming a row is a change here, once, rather than an edit per project.
     */
    defineField({
      name: 'specs',
      title: 'Specs',
      type: 'object',
      options: { columns: 2 },
      fields: [
        defineField({ name: 'platform', title: 'Platform', type: 'string' }),
        defineField({ name: 'client', title: 'Client', type: 'string' }),
        defineField({ name: 'backend', title: 'Backend', type: 'string' }),
        defineField({ name: 'status', title: 'Status', type: 'string' }),
        defineField({ name: 'started', title: 'Started', type: 'string' }),
      ],
    }),
    defineField({
      name: 'screenshots',
      type: 'array',
      of: [defineArrayMember({ type: 'image', options: { hotspot: true } })],
    }),
    defineField({
      name: 'frame',
      type: 'string',
      options: { list: ['phone', 'window'], layout: 'radio' },
      initialValue: 'phone',
    }),
    defineField({ name: 'is_featured', title: 'Featured', type: 'boolean' }),
    defineField({ name: 'draft', type: 'boolean', initialValue: true }),
    /*
     * The write-up is three named sections rather than one free body, because
     * every project page is meant to answer the same three questions in the
     * same order. Renaming "What I'd do differently" is then one change here
     * and it moves on every project at once, which a free body cannot do.
     */
    defineField({
      name: 'problem',
      title: 'The problem',
      type: 'richText',
    }),
    defineField({
      name: 'howItWorks',
      title: 'How it works',
      type: 'richText',
    }),
    defineField({
      name: 'lessons',
      title: "What I'd do differently",
      type: 'richText',
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'status_text', media: 'icon' },
  },
});

export const schemaTypes = [post, list, project, listItem, tag, richText];
