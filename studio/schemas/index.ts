import { defineArrayMember, defineField, defineType } from 'sanity';

import { listItem, tagsField, thumbField } from './shared';

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
    defineField({
      name: 'body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            { title: 'Paragraph', value: 'normal' },
            // No H1: the page renders the title as its own h1, so a second one
            // in the body is a duplicate.
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
        // An image in the body is a first-class block, so it renders as the
        // real picture in the editor rather than an opaque card.
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
        }),
      ],
    }),
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
      description: 'A ranked list is one numbered sequence, so it cannot be grouped.',
    }),
    thumbField,
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
    // The spec rail, rendered in order.
    defineField({
      name: 'specs',
      title: 'Specs',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'object',
          fields: [
            defineField({ name: 'label', type: 'string' }),
            defineField({ name: 'value', type: 'string' }),
          ],
          preview: { select: { title: 'label', subtitle: 'value' } },
        }),
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
    defineField({ name: 'body', type: 'array', of: [{ type: 'block' }] }),
  ],
  preview: { select: { title: 'title', subtitle: 'status_text', media: 'icon' } },
});

export const schemaTypes = [post, list, project, listItem];
