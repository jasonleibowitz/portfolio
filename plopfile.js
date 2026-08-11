import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

/** The hero a new post starts with, until its real one replaces it. */
const PLACEHOLDER = 'plop-templates/placeholder.webp';

export default function (plop) {
  plop.setGenerator('blog-post', {
    description: 'New blog post',
    prompts: [
      {
        type: 'input',
        name: 'title',
        message: 'Blog post title',
      },
      {
        type: 'input',
        name: 'description',
        message: 'Provide a short description of this post',
      },
      {
        type: 'input',
        name: 'tags',
        message: 'Provide a comma separated list of tags for this post',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/content/blog/{{currentDate}}-{{dashCase title}}/index.mdx',
        templateFile: 'plop-templates/blog-post.mdx.hbs',
      },
      // Copied rather than templated: `add` runs the file through Handlebars,
      // which corrupts a binary. The post owns its images, so the placeholder
      // has to land inside the new folder rather than be shared from outside
      // it.
      function copyPlaceholder(answers, config, plop) {
        const folder = plop.renderString(
          'src/content/blog/{{currentDate}}-{{dashCase title}}',
          answers
        );
        copyFileSync(PLACEHOLDER, join(folder, 'cover.webp'));
        return `${folder}/cover.webp`;
      },
    ],
  });

  plop.setHelper('currentDate', () => new Date().toISOString().split('T')[0]);
  // plop.setHelper('splitOnComma', (str) => str.split(',').map(s => `${s}`.trim()));
}
