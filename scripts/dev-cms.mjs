#!/usr/bin/env node
/**
 * Runs the site and the studio together, both reading Sanity.
 *
 *   pnpm dev:cms
 *
 * The site at :4321 renders from Sanity rather than the .mdx files, and shows
 * unpublished work, so an edit in the studio can be seen before anyone else
 * sees it. That is three environment variables, which is the reason this
 * exists rather than a line in package.json:
 *
 *   CONTENT_SOURCE=sanity      read from Sanity instead of src/content
 *   SANITY_PERSPECTIVE=drafts  include unpublished edits
 *   SHOW_DRAFTS=true           include entries flagged `draft`
 *
 * `pnpm dev` still reads the .mdx files, unchanged.
 */
import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Node reads .env natively from 20.6, so the project id and token do not have
// to be exported by hand. Same approach as scripts/list-artwork.mjs.
try {
  process.loadEnvFile(join(ROOT, '.env'));
} catch {
  /* no .env yet; the checks below say what is missing */
}

if (!process.env.SANITY_PROJECT_ID) {
  console.error(
    'SANITY_PROJECT_ID is not set. Copy .env.example to .env and fill it in.'
  );
  process.exit(1);
}

const env = {
  ...process.env,
  CONTENT_SOURCE: 'sanity',
  SANITY_PERSPECTIVE: 'drafts',
  SHOW_DRAFTS: 'true',
};

const run = (args, options = {}) =>
  spawnSync('pnpm', ['exec', ...args], {
    cwd: ROOT,
    env,
    stdio: 'inherit',
    ...options,
  });

/*
 * `astro dev` daemonises and returns, so it is started first and the studio
 * then holds the terminal. Stopping any previous one matters: the daemon
 * refuses to start a second server and keeps serving the old one, which would
 * quietly ignore the environment set above.
 */
run(['astro', 'dev', 'stop'], { stdio: 'ignore' });
run(['astro', 'dev']);

console.log('\n  site    http://localhost:4321');
console.log('  studio  http://localhost:3333\n');

const studio = spawn('pnpm', ['exec', 'sanity', 'dev', '--port', '3333'], {
  cwd: ROOT,
  env,
  stdio: 'inherit',
});

// Ctrl-C stops the studio in the foreground, but the site is a daemon and
// would otherwise stay running and confuse the next `pnpm dev`.
const stopAll = () => {
  studio.kill('SIGINT');
  run(['astro', 'dev', 'stop'], { stdio: 'ignore' });
  process.exit(0);
};

process.on('SIGINT', stopAll);
process.on('SIGTERM', stopAll);
studio.on('exit', stopAll);
