/** @type {import("prettier").Config} */
export default {
  plugins: ['prettier-plugin-astro'],
  overrides: [
    {
      files: '*.astro',
      options: { parser: 'astro' },
    },
    {
      // A paragraph is one line. A fixed column wrap re-flows the whole
      // paragraph when one word changes, and the diff then hides the change.
      // GitHub and every editor wrap the line for the reader.
      //
      // `printWidth` does not touch prose that is never wrapped. It sets the
      // width that a table aligns to, and 80 makes the tables here collapse to
      // one space for each column.
      //
      // `.md` only, for two reasons. `proseWrap` joins a folded block scalar in
      // YAML. And in `.mdx`, the width decides where a raw HTML block breaks,
      // which decides how MDX parses it: the same tweet renders with the date
      // link inside or outside the attribution paragraph. A prose rule must not
      // change a page.
      files: '*.md',
      options: { proseWrap: 'never', printWidth: 120 },
    },
  ],
  trailingComma: 'es5',
  tabWidth: 2,
  semi: true,
  singleQuote: true,
};
