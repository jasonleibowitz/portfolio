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
        path: 'src/content/blog/{{currentDate}}-{{dashCase title}}.mdx',
        templateFile: 'plop-templates/blog-post.mdx.hbs',
      },
    ],
  });

  plop.setHelper('currentDate', () => new Date().toISOString().split('T')[0]);
  // plop.setHelper('splitOnComma', (str) => str.split(',').map(s => `${s}`.trim()));
}
