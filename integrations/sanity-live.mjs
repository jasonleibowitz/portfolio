import process from 'node:process';

import { addLogoProxy } from './logo-proxy.mjs';

/**
 * Refreshes the content layer when a document changes in Sanity.
 *
 * Without this, a loader runs once when the dev server starts and its result
 * sits in `.astro/data-store.json` until something restarts the server. Editing
 * in the studio changed nothing on the page, which made the two feel like
 * unrelated programs.
 *
 * Deliberately not Astro's live content collections, which solve the same
 * problem the other way: they run the loader per request, which requires an
 * adapter and turns a static site into a server-rendered one. That is a large
 * change to fix a development annoyance.
 *
 * `astro:server:setup` only fires under `astro dev`, so none of this exists in
 * a build.
 */
export default function sanityLive() {
  return {
    name: 'sanity-live',
    hooks: {
      'astro:server:setup': async ({ server, refreshContent, logger }) => {
        addLogoProxy(server, logger);

        if (process.env.CONTENT_SOURCE !== 'sanity') return;

        const projectId = process.env.SANITY_PROJECT_ID;
        if (!projectId) {
          logger.warn('SANITY_PROJECT_ID is not set, so live refresh is off');
          return;
        }

        const { createClient } = await import('@sanity/client');
        const client = createClient({
          projectId,
          dataset: process.env.SANITY_DATASET ?? 'production',
          apiVersion: '2025-08-15',
          useCdn: false,
          token: process.env.SANITY_READ_TOKEN,
        });

        /*
         * One save can produce several mutation events, and a refresh re-reads
         * every collection. Waiting a moment turns a burst into one refresh,
         * which is both faster and quieter in the log.
         */
        let pending;
        const scheduleRefresh = (id) => {
          clearTimeout(pending);
          pending = setTimeout(async () => {
            logger.info(`content changed in Sanity (${id}), refreshing`);
            try {
              await refreshContent({ loaders: ['sanity'] });
            } catch (error) {
              logger.error(`refresh failed: ${error.message}`);
            }
          }, 400);
        };

        // `visibility: 'query'` waits until a mutation is readable, so the
        // refresh does not fetch the state from just before the edit.
        const subscription = client
          .listen('*[_type in ["post", "list", "project", "tag"]]', {}, {
            visibility: 'query',
            includeResult: false,
          })
          .subscribe({
            next: (event) => {
              if (event.type === 'mutation') scheduleRefresh(event.documentId);
            },
            error: (error) =>
              logger.warn(`lost the Sanity connection: ${error.message}`),
          });

        logger.info('watching Sanity for content changes');

        process.once('SIGINT', () => subscription.unsubscribe());
        process.once('SIGTERM', () => subscription.unsubscribe());
      },
    },
  };
}
