import process from 'node:process';

import { defineCliConfig } from 'sanity/cli';

// The CLI is a plain Node program and reads no .env of its own, so the project
// id has to be put on `process.env` first. Same one file the site reads.
try {
  process.loadEnvFile();
} catch {
  /* no .env; the commands below will say what is missing */
}

/**
 * Config for the `sanity` CLI: `sanity login`, and the dataset import that
 * scripts/sanity-import.mjs writes for.
 *
 * The studio itself is not here. It runs as a route on the site and is
 * configured by `sanity.config.ts` plus `studioBasePath` in `astro.config.mjs`,
 * so there is no `sanity dev` and no `sanity deploy`.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.PUBLIC_SANITY_DATASET ?? 'production',
  },
});
