import { writeFileSync } from 'node:fs';

/**
 * Previews and staging are public and carry `public/resume.pdf`, so nothing
 * should index them. `_headers` is generated rather than committed to
 * `public/`, where a copy would ship to production and suppress the real site.
 */
writeFileSync('dist/_headers', '/*\n  X-Robots-Tag: noindex, nofollow\n');
