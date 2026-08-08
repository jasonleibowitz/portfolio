/**
 * The employment record, and everything derived from it.
 *
 * Real data, supplied by Jason. Dates are `YYYY-MM` and are the only thing
 * written down, because they sort as plain strings, format on demand, and
 * cannot disagree with a second copy of themselves. Display strings and
 * employer tenure are computed below.
 *
 * Accomplishment bullets are deliberately absent: the resume is where a
 * recruiter reads what a role achieved, so the page stays a shape rather than
 * a second copy of it. `bullets` is kept because the timeline still renders
 * it, not because a role is waiting for one.
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
    // Carta's ladder calls this Senior Software Engineer II. The numeral is an
    // internal rung that means nothing outside the company, so the site uses
    // the same normalized title the resume headline does.
    roles: [{ title: 'Senior Software Engineer', from: '2022-11' }],
  },
  {
    company: 'Capsule Pharmacy',
    roles: [
      // Not a promotion out of the IC role -- both ran at once, so these
      // dates overlap on purpose.
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

/** "Nov 2022 – present" */
export function range(from: Month, to?: Month): string {
  return `${month(from)} – ${to ? month(to) : 'present'}`;
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

/**
 * The current role, as the homepage states it: "Title at Company".
 *
 * Derived rather than written down, because the two disagreed once already --
 * the homepage claimed a title the timeline right below it contradicted, and
 * the resume is one click from both. `CAREER` is most recent first, and so are
 * an employer's roles, so the current role is the first of the first.
 */
export function currentRole(): string {
  const [{ company, roles }] = CAREER;
  return `${roles[0].title} at ${company}`;
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
