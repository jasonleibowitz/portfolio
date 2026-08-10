import { fields } from '@keystatic/core';
import { block } from '@keystatic/core/content-components';

export const captionedImage = block({
  label: 'Captioned image',
  schema: {
    src: fields.text({ label: 'Image path' }),
    caption: fields.text({ label: 'Caption' }),
    attribution: fields.object({
      src: fields.text({ label: 'Credit URL' }),
      text: fields.text({ label: 'Credit text' }),
    }),
  },
  NodeView: ({ value }) => (
    <figure>
      <img src={value.src} alt={value.caption} style={{ maxWidth: '100%' }} />
      <figcaption>{value.caption}</figcaption>
    </figure>
  ),
});
