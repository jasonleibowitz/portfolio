import { defineConfig } from 'tinacms';

import { ArtworkList } from './artwork-field';

/** One entry in a list, shared by the flat `items` and the ones inside groups. */
const listItemFields = [
  { type: 'string' as const, name: 'name', label: 'Name' },
  { type: 'string' as const, name: 'href', label: 'Link' },
  { type: 'string' as const, name: 'image', label: 'Artwork' },
  { type: 'string' as const, name: 'subtitle', label: 'Credit' },
  { type: 'string' as const, name: 'note', label: 'Note', ui: { component: 'textarea' as const } },
  { type: 'string' as const, name: 'tags', label: 'Tags', list: true },
];

export default defineConfig({
  branch: 'main',
  // Null on both means the local filesystem client, so nothing talks to
  // TinaCloud. `tinacms dev` serves the GraphQL layer from disk.
  clientId: null,
  token: null,

  build: {
    // Deliberately not `admin`: the Sveltia spike already owns
    // public/admin/index.html and the two would overwrite each other.
    outputFolder: 'tina-admin',
    publicFolder: 'public',
  },
  media: {
    tina: { mediaRoot: 'blog-images', publicFolder: 'public' },
  },

  schema: {
    collections: [
      {
        name: 'blog',
        label: 'Writing',
        path: 'src/content/blog',
        format: 'mdx',
        fields: [
          { type: 'string', name: 'title', label: 'Title', isTitle: true, required: true },
          { type: 'datetime', name: 'pubDate', label: 'Published' },
          { type: 'string', name: 'description', label: 'Description', ui: { component: 'textarea' } },
          { type: 'string', name: 'author', label: 'Author' },
          {
            type: 'object',
            name: 'image',
            label: 'Cover image',
            fields: [
              { type: 'image', name: 'url', label: 'Image' },
              { type: 'string', name: 'alt', label: 'Alt text' },
            ],
          },
          { type: 'string', name: 'tags', label: 'Tags', list: true },
          { type: 'boolean', name: 'draft', label: 'Draft' },
          {
            type: 'rich-text',
            name: 'body',
            label: 'Body',
            isBody: true,
            // Tina models MDX components as templates, so CaptionedImage stays
            // an editable block rather than becoming opaque text. This is the
            // one thing Sveltia gives up and Keystatic did well.
            templates: [
              {
                name: 'CaptionedImage',
                label: 'Captioned image',
                fields: [
                  { type: 'string', name: 'src', label: 'Image path' },
                  { type: 'string', name: 'caption', label: 'Caption' },
                ],
              },
            ],
          },
        ],
      },

      {
        name: 'lists',
        label: 'Lists',
        path: 'src/content/lists',
        format: 'mdx',
        fields: [
          { type: 'string', name: 'title', label: 'Title', isTitle: true, required: true },
          { type: 'string', name: 'description', label: 'Description', ui: { component: 'textarea' } },
          { type: 'datetime', name: 'updated', label: 'Updated' },
          { type: 'boolean', name: 'ranked', label: 'Ranked' },
          {
            type: 'string',
            name: 'thumb',
            label: 'Artwork ratio',
            options: ['square', 'poster'],
          },
          {
            type: 'object',
            name: 'items',
            label: 'Items',
            list: true,
            fields: listItemFields,
            ui: { component: ArtworkList },
          },
          {
            type: 'object',
            name: 'groups',
            label: 'Groups',
            list: true,
            ui: { itemProps: (item: any) => ({ label: item?.name }) },
            fields: [
              { type: 'string', name: 'name', label: 'Group name' },
              { type: 'string', name: 'description', label: 'Description', ui: { component: 'textarea' } },
              {
                type: 'object',
                name: 'items',
                label: 'Items',
                list: true,
                fields: listItemFields,
                ui: { component: ArtworkList },
              },
            ],
          },
          { type: 'boolean', name: 'draft', label: 'Draft' },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },

      {
        name: 'projects',
        label: 'Projects',
        path: 'src/content/projects',
        format: 'mdx',
        fields: [
          { type: 'string', name: 'title', label: 'Title', isTitle: true, required: true },
          { type: 'string', name: 'description', label: 'Description', ui: { component: 'textarea' } },
          {
            type: 'string',
            name: 'status',
            label: 'Status',
            options: ['development', 'testing', 'live'],
          },
          { type: 'string', name: 'status_text', label: 'Status text' },
          { type: 'string', name: 'stack', label: 'Stack', list: true },
          { type: 'boolean', name: 'is_featured', label: 'Featured' },
          { type: 'boolean', name: 'draft', label: 'Draft' },
          { type: 'rich-text', name: 'body', label: 'Body', isBody: true },
        ],
      },
    ],
  },
});
