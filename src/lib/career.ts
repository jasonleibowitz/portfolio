/**
 * The employment record, and everything derived from it.
 *
 * Real data, supplied by Jason. Dates are `YYYY-MM` and are the only thing
 * written down, because they sort as plain strings, format on demand, and
 * cannot disagree with a second copy of themselves. Display strings, employer
 * tenure and role overlap are all computed below.
 *
 * The accomplishment bullets are the one part still outstanding. A role with
 * no `bullets` renders as title and dates alone, and the page marks the gap
 * rather than inventing achievements.
 */

/** `YYYY-MM`. An absent `to` means the role is current. */
type Month = `${number}-${number}`;

export type Role = {
  title: string;
  from: Month;
  to?: Month;
  bullets?: string[];
};

export type Employer = {
  company: string;
  /** Most recent first. More than one means a promotion or an added role. */
  roles: Role[];
};

export const CAREER: Employer[] = [
  {
    company: 'Carta',
    roles: [{ title: 'Senior Software Engineer II', from: '2022-11' }],
  },
  {
    company: 'Capsule Pharmacy',
    roles: [
      // Not a promotion out of the IC role -- both ran at once, which is why
      // these dates overlap and the timeline says so rather than looking
      // like a typo.
      { title: 'Technical Lead', from: '2021-07', to: '2022-11' },
      { title: 'Senior Software Engineer', from: '2019-12', to: '2022-11' },
    ],
  },
  {
    company: 'Invitae',
    roles: [
      { title: 'Senior Software Engineer', from: '2018-11', to: '2019-12' },
    ],
  },
  {
    company: 'TodayTix',
    roles: [
      { title: 'Senior Software Engineer', from: '2018-03', to: '2018-11' },
      { title: 'Software Engineer', from: '2017-06', to: '2018-03' },
    ],
  },
  {
    company: 'Reserve',
    roles: [{ title: 'Software Engineer', from: '2016-03', to: '2017-06' }],
  },
  {
    company: 'Tigerspike',
    roles: [
      { title: 'Software Engineer', from: '2015-08', to: '2016-03' },
      { title: 'Associate Software Engineer', from: '2014-10', to: '2015-07' },
    ],
  },
];

/** UTC, for the same reason every other date in this codebase is. */
const MONTH = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  month: 'short',
  year: 'numeric',
});

/** "2022-11" -> "Nov 2022" */
function month(value: Month): string {
  const [year, index] = value.split('-').map(Number);
  return MONTH.format(new Date(Date.UTC(year, index - 1, 1)));
}

/** "Nov 2022 — present" */
export function range(from: Month, to?: Month): string {
  return `${month(from)} — ${to ? month(to) : 'present'}`;
}

/** An employer's tenure: earliest start to latest end, or to present. */
export function tenure({ roles }: Employer): string {
  const from = roles.reduce<Month>(
    (earliest, role) => (role.from < earliest ? role.from : earliest),
    roles[0].from
  );

  // A role still running makes the whole tenure current, whatever the others say.
  if (roles.some((role) => !role.to)) return range(from);

  const to = roles.reduce<Month | undefined>(
    (latest, role) => (!latest || role.to! > latest ? role.to : latest),
    undefined
  );
  return range(from, to);
}

/**
 * Whether a role ran alongside the one after it rather than replacing it.
 * Without this the Capsule dates read as a mistake instead of as someone
 * taking on lead scope while keeping the IC work.
 */
export function isConcurrent(roles: Role[], index: number): boolean {
  const previous = roles[index + 1];
  if (!previous) return false;
  // No end date means the earlier role never stopped, so it must overlap.
  return !previous.to || previous.to > roles[index].from;
}

/**
 * A role's dates as they appear beside its title, separator included, for the
 * employers with more than one role -- a lone role is dated by its employer's
 * tenure instead, so repeating it there would say the same thing twice.
 *
 * The separator is part of the string rather than its own element so it cannot
 * dangle at the end of the title line when the date wraps to the next one.
 * Callers render the result unbreakable: half a date range reads as a date.
 */
export function roleDates(roles: Role[], index: number): string | null {
  if (roles.length < 2) return null;
  const { from, to } = roles[index];
  return `· ${range(from, to)}`;
}

/** September 2014, when the first job started. */
const CAREER_START: Month = '2014-09';

/**
 * Whole years shipping, computed at build time rather than written down, so
 * the homepage and the About page cannot disagree and neither goes stale on an
 * anniversary nobody remembers. A site left unbuilt for a year lags by one;
 * every deploy corrects it.
 */
export function yearsShipping(now: Date = new Date()): number {
  const [year, index] = CAREER_START.split('-').map(Number);
  const years = now.getUTCFullYear() - year;
  return now.getUTCMonth() < index - 1 ? years - 1 : years;
}
