import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import GithubSlugger from 'github-slugger';

/** The hero a new post starts with, until its real one replaces it. */
const PLACEHOLDER = 'plop-templates/placeholder.webp';

/* The folder of a new post. Both actions below need it, thus it is written one
   time: two copies can disagree, and the cover then goes to a folder that the
   post cannot read. */
const POST_FOLDER = 'src/content/blog/{{currentDate}}-{{slug title}}';

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
        path: `${POST_FOLDER}/index.mdx`,
        templateFile: 'plop-templates/blog-post.mdx.hbs',
      },
      // Copied rather than templated: `add` runs the file through Handlebars,
      // which corrupts a binary. The post owns its images, so the placeholder
      // has to land inside the new folder rather than be shared from outside
      // it.
      function copyPlaceholder(answers, config, plop) {
        const folder = plop.renderString(POST_FOLDER, answers);
        copyFileSync(PLACEHOLDER, join(folder, 'cover.webp'));
        return `${folder}/cover.webp`;
      },
    ],
  });

  /* One day for the whole run. The helper renders two times, and a run that
     crosses midnight UTC would otherwise name two different folders. */
  const today = new Date().toISOString().split('T')[0];
  plop.setHelper('currentDate', () => today);

  /* The address of the post, and the name of its folder.

     `github-slugger` and not the `dashCase` of plop: `dashCase` cuts a word at
     each capital in the middle of it, thus "eSIM" becomes "e-sim" and "iPhone"
     becomes "i-phone". This is also the program Astro uses on the name of a
     file, thus a post with a slug and a post without one get the same
     treatment. Each call needs a new `GithubSlugger`, because one instance
     remembers what it gave before and adds "-1" to a repeat. */
  plop.setHelper('slug', (title) => new GithubSlugger().slug(title));
  // plop.setHelper('splitOnComma', (str) => str.split(',').map(s => `${s}`.trim()));
}
