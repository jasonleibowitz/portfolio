import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';

import { schemaTypes } from './studio/schemas';

/**
 * Sanity Studio for leibowitz.me.
 *
 * Runs at localhost:3333 with `pnpm studio`, and deploys to
 * <project>.sanity.studio with `pnpm studio:deploy`, which is the URL that
 * makes editing work from a phone.
 *
 * The project id is read from the environment rather than committed, so the
 * same config serves a local run and a deployed studio.
 */
export default defineConfig({
  name: 'leibowitz',
  title: 'leibowitz.me',

  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? 'REPLACE_ME',
  dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',

  plugins: [structureTool(), visionTool()],

  schema: { types: schemaTypes },
});
