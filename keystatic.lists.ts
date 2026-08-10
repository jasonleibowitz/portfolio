import { fields, collection } from '@keystatic/core';

/**
 * One entry in a list. Artwork resolves as `./artwork/<slug>/<file>`, which is
 * the shape Keystatic's image field already writes: it appends the entry slug
 * to `publicPath`. The existing files match it, so nothing has to move.
 */
const listItem = fields.object({
  name: fields.text({ label: 'Name' }),
  href: fields.url({ label: 'Link' }),
  image: fields.image({
    label: 'Artwork',
    directory: 'src/content/lists/artwork',
    publicPath: './artwork/',
  }),
  subtitle: fields.text({ label: 'Credit' }),
  note: fields.text({ label: 'Note', multiline: true }),
  tags: fields.array(fields.text({ label: 'Tag' }), {
    label: 'Tags',
    itemLabel: (props) => props.value ?? '',
  }),
  placeholder: fields.array(fields.text({ label: 'Field' }), {
    label: 'Placeholder fields',
    itemLabel: (props) => props.value ?? '',
  }),
});

export const lists = collection({
  label: 'Lists',
  slugField: 'title',
  path: 'src/content/lists/*',
  format: { contentField: 'content' },
  schema: {
    title: fields.slug({ name: { label: 'Title' } }),
    description: fields.text({ label: 'Description', multiline: true }),
    updated: fields.date({ label: 'Updated' }),
    ranked: fields.checkbox({ label: 'Ranked' }),
    thumb: fields.select({
      label: 'Artwork ratio',
      options: [
        { label: 'Square (1:1)', value: 'square' },
        { label: 'Poster (2:3)', value: 'poster' },
      ],
      defaultValue: 'square',
    }),
    items: fields.array(listItem, {
      label: 'Items',
      itemLabel: (props) => props.fields.name.value || 'Item',
    }),
    groups: fields.array(
      fields.object({
        name: fields.text({ label: 'Group name' }),
        description: fields.text({ label: 'Description', multiline: true }),
        placeholder: fields.array(fields.text({ label: 'Field' }), {
          label: 'Placeholder fields',
          itemLabel: (props) => props.value ?? '',
        }),
        items: fields.array(listItem, {
          label: 'Items',
          itemLabel: (props) => props.fields.name.value || 'Item',
        }),
      }),
      {
        label: 'Groups',
        itemLabel: (props) => props.fields.name.value || 'Group',
      }
    ),
    draft: fields.checkbox({ label: 'Draft' }),
    placeholder: fields.array(fields.text({ label: 'Field' }), {
      label: 'Placeholder fields',
      itemLabel: (props) => props.value ?? '',
    }),
    content: fields.mdx({ label: 'Body' }),
  },
});
