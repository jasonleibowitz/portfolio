import { defineConfig, globalIgnores } from 'eslint/config';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default defineConfig([
  /* `.claude/` is agent state, and `.claude/worktrees/` holds whole checkouts of
     this repo on other branches. Linting one reports another branch's problems
     as this branch's, and nothing in this config could fix them. */
  globalIgnores([
    'dist/',
    '.astro/',
    'node_modules/',
    'plop-templates/',
    '.claude/',
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  astro.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^Props$',
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: { 'jsx-a11y': jsxA11y },
    rules: jsxA11y.configs.recommended.rules,
  },
  {
    // Build-time scripts run in Node, not the browser. The globals are listed
    // by hand rather than pulled from the `globals` package, which is not a
    // direct dependency here and is not worth becoming one for one directory.
    files: ['scripts/**/*.{js,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
      },
    },
  },
]);
