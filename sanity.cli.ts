import { defineCliConfig } from 'sanity/cli';

/**
 * CLI config for `sanity dev` and `sanity deploy`.
 *
 * Separate from `sanity.config.ts` on purpose: that one configures the running
 * studio, this one tells the CLI which project it is operating on. Both read
 * the same environment variables, so there is still one place to change.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? '9f0148tu',
    dataset: process.env.SANITY_STUDIO_DATASET ?? 'production',
  },
  // The studio is deployed by hand, so leave dependency updates to the repo's
  // normal upgrade flow rather than letting the hosted build move them.
  autoUpdates: false,
});
