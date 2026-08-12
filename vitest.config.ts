/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

/**
 * `getViteConfig()` and not a plain Vitest config, because it gives a test the
 * same settings a page gets: the path aliases of `tsconfig.json`, and the
 * `astro:` modules. A test that reads content will need both.
 */
export default getViteConfig({
  test: {
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
