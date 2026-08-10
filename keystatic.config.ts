import { config, fields, collection } from '@keystatic/core';
import { captionedImage } from './keystatic.components';
import { lists } from './keystatic.lists';

export default config({
  storage: { kind: 'local' },
  collections: {
    lists,
    blog: collection({
      label: 'Writing',
      slugField: 'title',
      path: 'src/content/blog/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        pubDate: fields.date({ label: 'Published' }),
        description: fields.text({ label: 'Description' }),
        author: fields.text({
          label: 'Author',
          defaultValue: 'Jason Leibowitz',
        }),
        image: fields.object({
          url: fields.image({
            label: 'Cover image',
            directory: 'public/blog-images',
            publicPath: '/blog-images/',
          }),
          alt: fields.text({ label: 'Alt text' }),
        }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags' }),
        draft: fields.checkbox({ label: 'Draft' }),
        content: fields.mdx({
          label: 'Body',
          components: { CaptionedImage: captionedImage },
        }),
      },
    }),
  },
});
