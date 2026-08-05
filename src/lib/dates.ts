/**
 * Frontmatter dates are plain days -- `2023-05-21` with no time or zone. Zod
 * coerces that to UTC midnight, so formatting it in the build machine's local
 * time renders the day before anywhere west of Greenwich. Everything is
 * formatted in UTC so a date reads as the day it was written.
 */
const DAY = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** "21 May 2023" */
export function formatDay(date: Date): string {
  return DAY.format(date);
}

/** The machine-readable half of a <time> element: "2023-05-21". */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
