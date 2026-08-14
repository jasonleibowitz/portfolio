# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary, co-equal:** engineering hiring managers and technical recruiters, and peer engineers.

Jason is **actively looking**. The hiring-manager visit is short, skeptical, and usually arrives cold from a LinkedIn profile, a GitHub link, or a résumé attachment — they are answering "is this person the level they claim, and did they actually build the things?" before deciding whether to spend a reply on it. The peer-engineer visit is longer and arrives sideways, from a post or a repo; they read for craft and technical substance, and they are the ones who notice whether the site itself is well made.

The two audiences pull in the same direction here — both are convinced by specifics and shipped work rather than adjectives — but when they conflict, the hiring manager's scan wins on the entry surfaces and the peer's depth wins inside a case study or post.

**Secondary:** readers who land on a single post from search with no idea who Jason is, and people evaluating whether to install one of the apps. Neither drives layout decisions.

## Product Purpose

A personal site at leibowitz.me that gets Jason contacted about senior/staff IC and engineering-leadership roles, and that stays a durable, permanent home for everything he makes.

Success, in the order it was confirmed:

1. Someone with a role worth hearing about makes contact — email, or a résumé download that turns into one.
2. The writing gets read.
3. It remains one permanent URL that holds the work, indefinitely, with no funnel obligations.

Target roles: **staff/senior full-stack IC** and **engineering leadership** (tech lead, EM, staff+ with people scope). The site should make the wrong roles screen themselves out.

### The two-phase requirement

The site is being rebuilt during an active search, but **it must survive being hired without a redesign.** Both phases are first-class:

|  | **Searching** (now) | **Employed** (after) |
| --- | --- | --- |
| Goal | Land interviews | Stay reachable; keep good inbound arriving |
| Posture | Available, responsive | Not looking, still worth contacting |
| What changes | An availability signal and the emphasis on contact CTAs | Same, dialed down |
| What does not change | Structure, navigation, hierarchy, projects, writing, case studies, the résumé, the visual world |  |

The second phase is **not** a dormant state. Even employed, the site's job is to work as an advertisement and a resource so recruiters and companies still reach out — the difference is tone and urgency, not function. A design that only makes sense while job hunting has failed the requirement.

**Mechanically, this means the phase difference must be a small, swappable piece of content or configuration — an availability line, a CTA label, at most a single block — never a structural or visual change.** Nothing load-bearing may depend on being mid-search. Concretely: no "Open to work" banner welded into the hero, no layout that collapses when the availability block is removed, no copy in the bio or About page that expires the day he signs an offer.

## Positioning

Four claims were confirmed as true and non-copyable, and they are meant to be read as one spine rather than four separate pitches: **Jason takes products the whole distance — alone when he has to, and with a team that is better for having worked with him.**

- **Ships whole products solo.** Two iOS apps in TestFlight — Winnie the Poo Tracker and Reel Watch — backend, client, design, and release, all his. Not side projects; shipped products.
- **Consumer polish inside hard domains.** Broadway ticket lotteries (TodayTix), real-time pharmacy delivery tracking (Capsule), genetic testing (Invitae), and financial software used by thousands of businesses (Carta) — consumer-grade experience built under healthcare and fintech constraints.
- **AI-native, visibly.** Claude Code, Codex, and agentic workflows are how the work actually gets done now, not a line added to a skills list.
- **Makes other engineers better.** Mentoring, strengthening teams, and the multiplier work that outlasts any one shipped feature.

These are durable — they stay true in both phases, which is part of why the spine can carry the site after a hire. The pitch is who Jason is, not that he is available.

**Open tension for future work:** all four were selected. A surface that asserts four things asserts none. Each surface should carry one of them as its lead and let the others show up as evidence — which one leads is a per-surface decision, not a product-level one.

## Operating Context

- Visitors mostly arrive from elsewhere — LinkedIn, GitHub, a résumé, a shared post — rather than by typing the domain. Entry can be any page, not just `/`.
- The hiring-manager evaluation is a scan measured in seconds, often on a phone, frequently alongside a stack of other candidates. The résumé PDF is a real part of that workflow and is expected to exist.
- The peer-engineer path runs deeper: a post, its footnotes and code, then usually the projects or the repo.
- Post-hire, the inbound does not stop — recruiters keep finding the site, and that traffic is wanted. It simply arrives against a higher bar for what would make Jason move.
- A decade of inbound links point at `/blog/*` URLs. Those visitors are search readers arriving at a single old post.
- Jason is employed while looking, so nothing on the site should read as an announcement of a search.

## Capabilities and Constraints

Confirmed and load-bearing:

- Static site: Astro 7, MDX content, Tailwind 4, TypeScript. **Zero JS islands** — no framework runtime, only small hand-written vanilla modules. Node >= 24, pnpm.
- Three content collections: `blog` (`/writing`), `lists` (`/lists`), `projects` (`/projects`, with a case study per entry). Five posts spanning 2014–2023, two lists, three projects.
- `/writing` is canonical; `/blog/*` must keep redirecting to it. The decade of inbound links is a permanent constraint, not a migration step.
- Deploy target is **Cloudflare Workers Static Assets**, not Cloudflare Pages. Pages was the original decision and was replaced. **leibowitz.me is the production site**, served by the `portfolio` Worker as a custom domain on a Cloudflare-hosted zone, with a per-PR preview URL per pull request. The apex is canonical and `www` 301s to it. Cloudflare issues the certificate, which ended the HTTPS failure caused by the old `jasonleibowitz.github.io` apex record.
- Five gates: `build`, `check`, `lint`, `format:check` and `test`. **`test` is Vitest and covers pure functions only**, deliberately: `slugify()` and `refuseDuplicateAddresses()` each decide an address, and a wrong address is a wrong page. Anything that reads the filesystem, renders a component or draws a card has no test. **None of the five renders a page**, so layout, motion and anything client-side is verified in a browser or not at all.
- The writing archive is **evidence, not a publication**. It demonstrates that Jason thinks and writes clearly; there is no committed cadence and no obligation to headline it. Presented, not promoted.
- **Search-phase state must be isolated.** Availability wording and contact emphasis live in one editable place (a config value or a single content field), so flipping phases is an edit, not a project. See the two-phase requirement above.

**Placeholder policy — a product rule, not a styling one.** Copy Jason has not written yet **opens with the word "Placeholder", and that is the whole signal.** Nothing in the design marks it: the frontmatter field, the component and the dotted underline that once did are all deleted, and rebuilding any of them needs a better argument than they had. **Nothing in that set may be invented or filled in on his behalf**, and no page-level note should list which paragraphs are unfinished, because the paragraphs already say so and a summary can only go stale.

All three case-study bodies are written, so nothing on the site currently carries the marker.

One thing is provisional without saying so: the two `Started` dates on the app projects render as fact. Correcting them before launch is a thing Jason remembers rather than a thing the page shows.

## Brand Commitments

- Name: Jason Leibowitz. Domain: **leibowitz.me** — canonical and permanent.
- The **JL monogram** is bespoke and is the identity mark; `public/favicon.svg` is a hand-synced copy of it.
- Contact: jason@leibowitz.me. Socials: GitHub, LinkedIn, X, Instagram, plus an RSS feed — all real and in `src/lib/site.ts`.
- Voice, as established in the real About bio and hero copy: first person, plain, specific, lightly dry. Concrete over adjectival ("Broadway ticket lotteries," not "high-impact consumer platforms"). Self-aware without being self-deprecating. Dad jokes are admitted to, not performed.
- The nav order Home · About · Projects · Writing · Lists is settled.

## Evidence on Hand

Real:

- Five published posts, 2014–2023, each a folder with its own images beside it, so deleting a post deletes its images and renaming one carries them. All five are `draft: false`.
- Two lists — favorite movies, podcasts — in `src/content/lists/`.
- Three projects in `src/content/projects/`: Winnie the Poo Tracker (TestFlight beta, Expo/RN + Supabase), Reel Watch (TestFlight beta, Expo/RN + Django Ninja/Supabase/Turborepo), and this site.
- **The full employment record** — six employers, nine roles, October 2014 to present, in `src/lib/career.ts`: Carta (Senior Software Engineer II), Capsule Pharmacy (Senior Software Engineer, plus Technical Lead held **concurrently** from Jul 2021), Invitae, TodayTix, Reserve, and Tigerspike. Dates are stored once as `YYYY-MM` and every display string, tenure span and overlap marker is derived from them.
- The full About bio — four paragraphs, real, written by Jason.
- The stack inventory on `/about`, including the AI row.
- Photography: five portraits and an about photo in `src/images/`.
- **`public/resume.pdf`** — the real résumé, in place and downloadable. Its text has never been extracted into the repo (subsetted font, no encoding map), so it is an authority the site cannot read; anything taken from it is transcribed by Jason, not parsed.
- **"Beyond the CV" numbers:** 15 countries, 50 podcasts, 2 apps in TestFlight, and years shipping — the last derived at build time from the earliest month in the employment record, so it cannot go stale or contradict the homepage.
- **App pitches**, in Jason's own words and marked for later sharpening: "Bowel movement tracker for IBS/IBD patients" and "Better movie recommendations."
- **Real screenshots** for all three projects, light and dark. The CSS-drawn device frame is the fallback for a project that has none.
- **All three case-study bodies**, written: the problem, what it does, how it's built, and what he'd do differently.

**Absent — must not be fabricated:**

- No testimonials, references, metrics, press, or third-party validation of any kind exist. None may be invented.

**Accomplishment bullets under Experience are not a gap.** The timeline renders company, title and dates by design, because the résumé is where a recruiter reads what a role achieved. A role showing title and dates alone is finished.

## Product Principles

1. **Specifics carry the pitch.** Named companies, real stacks, shipped artifacts. Every adjective is a place where a fact should have been.
2. **The site is the work sample.** For the peer engineer, how it is built is evidence — so craft, performance, and the zero-JS constraint are part of the argument, not overhead.
3. **A visible gap beats an invented fact.** Placeholder copy says so in its own first word and stays unwritten until Jason writes it. This protects the one thing the site is selling.
4. **Build for the hired version too.** Anything that only makes sense during a job search is a liability. The search shows up as one adjustable signal, not as the site's premise.
5. **Every page is a landing page.** Visitors arrive sideways from a link, so no surface may assume the homepage was read first.
6. **Permanence is a feature.** Old URLs keep working. A decade of inbound links is an asset, and breaking them costs more than any redesign gains.

## Accessibility & Inclusion

No external standard was mandated. Jason states in his own bio that he builds software that is "elegant, intuitive, accessible, and maintainable" — so accessibility is a **personal brand commitment being demonstrated**, and a failure here is a credibility failure with the peer-engineer audience, not just a defect.

The hiring-manager scan happens on a phone as often as not, which makes touch targets, mobile layout integrity, and load performance product concerns rather than polish.
