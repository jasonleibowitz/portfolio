import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

import { documentActions } from './studio/preview';
import { schemaTypes } from './studio/schemas';

/**
 * Sanity Studio for leibowitz.me.
 *
 * Served by the site at /admin, so it starts with `pnpm dev` and deploys with
 * the site. `astro.config.mjs` mounts it and owns `basePath`.
 *
 * This file is bundled into the browser, so it reads `import.meta.env` and the
 * values carry the `PUBLIC_` prefix that Astro requires to expose them. A
 * `process.env` read here compiles to `{}` and silently yields undefined.
 */
export default defineConfig({
  name: 'leibowitz',
  title: 'leibowitz.me',

  projectId: import.meta.env.PUBLIC_SANITY_PROJECT_ID,
  dataset: import.meta.env.PUBLIC_SANITY_DATASET ?? 'production',

  plugins: [structureTool(), visionTool()],

  schema: { types: schemaTypes },

  document: { actions: documentActions },
});
