# CONTINUATION CHECKPOINT

**Purpose:** a cold-start brief for the next Cline session. Read this first,
then `docs/PROJECT-HANDOVER.md`.

---

## Session identity

| Item        | Value                                                       |
| ----------- | ----------------------------------------------------------- |
| Workspace   | `E:\projects\edu-share-platform`                            |
| Git root    | `E:\projects\edu-share-platform\.git`                       |
| Branch      | `main` (tracks `origin/main`)                               |
| Remote      | `https://github.com/Crusty-chirayu/Edu-Share.git`           |
| Visibility  | Private, not a fork, default branch `main`                  |
| License     | MIT (pre-existing on remote)                                |
| GitHub auth | `gh` CLI authenticated as `Crusty-chirayu` (keyring, https) |

## Inherited reference material — DO NOT EDIT

`E:\projects\Edu-Share` — the original developer's PHP/MySQL app.
**It is not a Git repository and is not connected to anything.** It is read-only
reference material. It is deliberately **not** vendored into this repo because
no license was found in it.

> Its `project.sql` contains real personal data (names, emails, phone numbers,
> addresses) and bcrypt password hashes. Never copy, commit, or paste it.

## Working rules

1. Run all `git` commands from `E:\projects\edu-share-platform`.
   The parent `E:\projects` is a **separate Git repo with zero commits** —
   running git from the inherited folder targets the wrong repository.
2. Never force-push. Never rewrite history. Never modify the original
   developer's repository.
3. Do not add frameworks or dependencies until the architecture is approved.
4. Do not create empty placeholder docs; each doc must hold real content.
5. Never commit secrets, `.env` files, PII, or database dumps.
6. Update this checkpoint at the end of every session that changes anything.

---

## State as of this checkpoint

**M0 — COMPLETE.** Independent repository established and the inherited application
handed over and documented.

**M1 — COMPLETE.** Five planning documents produced, cross-checked and verified:

| Document                         | Content                                                                                                                                                                                                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/PROJECT-AUDIT.md`          | 24 severity-ranked findings (2 critical, 6 high, 9 medium, 5 low, 2 informational), each labelled VERIFIED / REPORTED / INFERRED / UNKNOWN; architecture and data-model analysis; full security, accessibility, performance, observability and testability review; positive patterns worth keeping; risk register; licensing boundary; audit limitations |
| `docs/PRODUCT-REQUIREMENTS.md`   | Vision, 5 personas, 3-role least-privilege model with a capability matrix, MVP boundary, 76 functional + 46 non-functional requirements, a 13-point definition of "premium", a content-policy framework, 12 owner decisions                                                                                                                              |
| `docs/ARCHITECTURE-PROPOSAL.md`  | 3 candidate architectures compared across 16 criteria, one recommendation with trade-offs and revisit triggers, full specification, conceptual database design, 5 architecture decision records, all provider facts cited with their check date                                                                                                          |
| `docs/UI-UX-DESIGN-SYSTEM.md`    | Brand identity, design tokens for light and dark, typography, motion, 40 components, 15 screen specifications, interaction standards, WCAG 2.2 AA baseline                                                                                                                                                                                               |
| `docs/IMPLEMENTATION-ROADMAP.md` | Milestones `M0`–`M11` with objective/scope/deliverables/acceptance/tests/risks/evidence each; 13 quality gates; CI/CD design; release checklist and rollback; verified free-tier cost figures; 15-item risk register; 12 stage gates                                                                                                                     |

**M2 — APPROVED by owner (scope: M3 foundation only).** Option A: Next.js App
Router + TypeScript + Supabase PostgreSQL + Vercel (free-tier limits apply).
This task implements M3 only; M4/M5 product work is out of scope.

**M3 — FOUNDATION IMPLEMENTED 2026-09-26; VERIFIED BY EXECUTION 2026-09-28.** Scaffold,
strict TS, env
validation, `.env.example`, Supabase boundary + `docs/SUPABASE.md`, reversible
migration 0001, seed, health endpoint, middleware headers, Vitest + Playwright
smoke, CI workflow. 2026-09-27 fixes: silent-`status` root cause (logger level
filter → stdout), write-target guard (`src/db/guard.ts`), `prepare: false` for
Supabase pooler, idempotent `up`, read-only `db:inspect`, bounded seed.
`drizzle/` absence is by design (custom runner; config is future codegen only).
Details: [`DEVELOPMENT-STATUS.md`](./DEVELOPMENT-STATUS.md) §M3.

**M4–M8 VERTICAL SLICE — BUILT AND EXECUTED 2026-09-28.** A disposable
PostgreSQL 16.15 (`postgres:16-alpine`, `compose.yaml`, loopback) now exists and the
whole backend has been **run**, not reviewed: migrations `0001`–`0004` apply / re-apply
idempotently / reverse to zero tables / re-apply; 28 RLS cases pass on a genuinely
restricted role; 16 resource-service cases and 15 route cases pass, writing and deleting
real objects; **226 tests** are stable across repeated runs and all five static gates are
green. Evidence: [`SG3-VERIFICATION.md`](./SG3-VERIFICATION.md).

### The three findings that matter most

1. **AUD-001 (critical)** — `teacher_profile.php` serves files before any authentication
   check and builds the path from unsanitised input: an **unauthenticated arbitrary file
   read**. The replacement has no route where a request parameter can reach a storage or
   filesystem path.
2. **AUD-002 (critical)** — registration lets the user pick the role that authorises
   destructive platform-wide actions. In the replacement, **a role is never accepted from
   client input**.
3. **AUD-023 (legal)** — the inherited source has no licence, so it **cannot be reused**.
   The platform is written from scratch regardless of the technical findings.

### Corrections to the previous session's findings

Recorded so the audit is not misread:

- `admin.php` is **not** SQL-injectable. Its identifiers are `intval()`-cast and the type
  is compared against literals. It _is_ still invalid PHP and still contains the
  privilege-escalation flaw.
- Prepared statements are used **broadly** — 42 call sites, including all dynamic filter
  construction — not merely "in certain read paths".

---

## Next task — hosted Supabase, then `SG-4`

**Everything below the line has been executed on this machine (2026-09-28).** The
earlier note that consecutive sessions could not run commands is superseded: the shell
works, a disposable PostgreSQL 16.15 runs from `compose.yaml`, and every gate below has
produced real output. Do not re-derive it — read
[`SG3-VERIFICATION.md`](./SG3-VERIFICATION.md) §11 and re-run it if you need to.

Local state at this checkpoint:

| Check                                             | Result                                                                              |
| ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run db:migrate` / repeat / `:down` / re-`up` | apply ×4 → skip ×4 → reverse to **0 tables** → apply ×4                             |
| Executed suites                                   | 28 RLS + 16 resource-service + 15 route + 1 connectivity = **60 DB cases**          |
| Full suite                                        | **247 passed, 19 files** (`RUN_DB_TESTS=1`)                                         |
| `tsc` / `eslint` / `prettier` / `next build`      | 0 / 0 errors 0 warnings / clean / green                                             |
| `npm run test:e2e`                                | **33 passed, 0 failed, 0 skipped** — Google Chrome via `PLAYWRIGHT_BROWSER_CHANNEL` |
| Residue after a full browser run                  | 0 rows, 0 storage objects — enforced by `e2e/global-setup.ts`                       |

Twelve findings have come out of running things; all are recorded in
[`SG3-VERIFICATION.md`](./SG3-VERIFICATION.md) §9 and §12. **D1** a
privilege-escalation gap on `profiles.role` (closed by migration `0004`). **D2** DB
suites racing a suite that renames the live `resources` table (fixed by serialising
DB files in `vitest.config.ts`). **D3** raw control bytes inside a regex literal in
`safeDisplayName()` (fixed; it was also the only `eslint` warning). **D5** a stale
E2E assertion that failed against a correctly rendered home page. **D6** is
_environment_, not product: Playwright's pinned Chromium build downloads fine but
cannot be extracted on this host, so the browser gate runs against the installed
Chrome through the opt-in `PLAYWRIGHT_BROWSER_CHANNEL` override — unset by default,
so CI still uses the pinned build.

**D7, D8, D9 and D11 are product defects** found by the expanded browser suite and
now fixed with regression tests: an origin check that rejected every legitimate
state-changing request (`assertSameOrigin`), a post-sign-in redirect that ignored
the `next` deep link, a development session store that every hot reload wiped, and
a stale middleware comment plus a missing header baseline. **D10** was a harness
cleanup bug whose residue broke the DB integration suites. **D12** is a safety
hazard in how the tests reach `.env` — and it carries an incident, below.

> ### ⚠ Owner action required — the local `.env` was overwritten
>
> An ad-hoc diagnostic command replaced `.env` with a local-only stub while
> investigating D12. `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
> were **lost**. Nothing was leaked, logged, or committed, no other key was
> affected, and the file is restored to a valid local-only state — but those two
> values must be re-entered from the Supabase dashboard. Full record:
> [`SG3-VERIFICATION.md`](./SG3-VERIFICATION.md) §13.
>
> `npm run test:e2e` now runs through `scripts/run-e2e.ts`, which renames `.env`
> aside for the duration of a run and always restores it, so this cannot recur.

Ordered next actions:

0. **Vitest DB-environment fix — VERIFIED 2026-09-30 (final acceptance gate).**
   Root cause: Vitest never loads `.env`, so with `RUN_DB_TESTS=1` but no
   exported `DATABASE_URL` the suites captured `""` at import time and failed
   with bare `Invalid URL` plus cascading `undefined.end` in teardown. Fix in
   the working tree (uncommitted): `vitest.setup.ts` (`setupFiles`, runs
   before imports in every worker — explicit shell export wins, `.env`
   loopback DSN is the fallback, anything missing/malformed/non-loopback
   fails closed), `src/db/test-database-url.ts` + `test-database-url.test.ts`
   (15 regression tests), guarded `afterAll` teardowns, `npm run test:db`,
   README testing section. Verified this session: `npm run test:db` →
   **21 files / 275 tests passed, 0 failed** (all DB suites executed);
   `tsc` / `eslint` / `prettier` / `npm run test:e2e` (33/33) /
   `npm run build` all green; DB + storage residue 0; `.env` unchanged. Full
   record: `docs/SG3-VERIFICATION.md` §14. Remaining owner action: re-enter
   the two Supabase values in `.env` (§13); commit the working tree with an
   explicit path list.

1. **Re-enter the two Supabase values in `.env`** (see the box above). Until then,
   hosted Auth and hosted Storage remain unconfigured locally by design.
2. Commit the working tree — 96 files (33 modified, 63 new). Nine of the new files
   belong to this session: `e2e/helpers.ts`, `e2e/public-journeys.spec.ts`,
   `e2e/auth-journey.spec.ts`, `e2e/resource-lifecycle.spec.ts`,
   `e2e/global-setup.ts`, `scripts/run-e2e.ts`, `src/lib/api.test.ts`,
   `src/lib/auth/destination.ts`, `src/lib/auth/destination.test.ts`. Files this
   session modified: `playwright.config.ts`, `next.config.ts`, `src/middleware.ts`,
   `package.json`, `e2e/smoke.spec.ts`, `README.md`, `.github/workflows/ci.yml`,
   `docs/SG3-VERIFICATION.md`, `docs/DEVELOPMENT-STATUS.md`, this file. Also edited
   inside files the previous session created: `src/lib/api.ts`,
   `src/components/auth-form.tsx`, `src/lib/auth/development.ts`. Use an explicit
   path list, never `git add .`; always `git --no-pager`.
3. Note that the `e2e` job added to `.github/workflows/ci.yml` has **not** been
   observed on a GitHub runner — every command in it was verified locally, but the
   runner environment was not. Watch the first run before relying on it.
4. Owner applies `0001`–`0004` to the hosted project (`docs/SUPABASE.md`), where
   `anon`/`authenticated` exist and `0003`'s grant branch actually fires. **Never**
   `db:migrate:down` against hosted — the code refuses it and there is no bypass.
5. Close the hosted half of `SG-7`: set `SUPABASE_STORAGE_BUCKET` and prove the
   60-second signed-URL path against a real bucket.
6. `SG-4`: the `/design` route and the no-hardcoded-colour lint rule. `SG-6`:
   duplicate programme names per institution. `SG-8`: typo-tolerant search tests.

### Constraints verified in the `M2` session (2026-09-26)

| Fact                                                                                                                     | Consequence for the next session                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Cloudflare Workers free plan: 100,000 requests/day and 10 ms CPU per invocation**                                      | Below the 10–20 ms that Cloudflare's own documentation attributes to server rendering, so it is **not** a target for this architecture. Do not propose it as a hosting answer |
| **Railway free plan:** $1/month after the trial; 1 vCPU, 0.5 GB RAM, 1 replica; **cron jobs are trial-only**             | A viable cheap container host, but scheduled work must be triggered by an external scheduler                                                                                  |
| **Fly.io:** no free tier, credit card required, egress to India $0.12/GB                                                 | Eliminated as a free option                                                                                                                                                   |
| **GitHub Actions** on a private repository: 2,000 minutes and 500 MB per month; a budget can **stop** usage              | CI cost is bounded. Set the budget when the workflow is created, not after the first overage                                                                                  |
| **Better Auth** authentication library: **MIT**                                                                          | The candidate library's licence is resolved                                                                                                                                   |
| **Vercel Hobby:** _"non-commercial, personal use only"_, cannot purchase extra usage, and limits pause for up to 30 days | The reason `D-005` blocks, and why the interpretation is the owner's judgement rather than mine                                                                               |

> **M2 approved — M3 authorized. M4+ product work is NOT authorized in this task.**
> After M3, the next milestone is `M4` — in a separate task.

### Inherited-project follow-ups for the owner (not code)

1. Ask the original author to **rotate the credentials** whose hashes sit in the
   inherited database dump, since those people's passwords are still in use.
2. Ask whether the inherited application was ever deployed publicly, and to whom the
   personal data in the dump belonged — this determines whether there is a disclosure
   obligation.
3. If reuse of the inherited code is ever wanted, obtain **written permission** first and
   record it in a third-party notices file.

## Current product state — 2026-09-30 (later session, supersedes nothing above)

Everything recorded above remains the milestone history. This block states where the
code actually stands now, for a session that starts cold.

| Item                  | State                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Milestone             | `SG-3` accepted (`docs/SG3-VERIFICATION.md` §14). Product-surface phase 1 delivered, not yet committed                                                   |
| Working tree          | **Dirty and uncommitted.** Nothing has been committed or pushed by these sessions; `git --no-pager status -sb` is the source of truth                    |
| Unit + integration    | `npm run test:db` → **288 tests / 22 files**, 0 failed, 0 skipped. Requires local PostgreSQL (`docker compose up -d db`)                                 |
| Browser suite         | `npm run test:e2e` → **33 tests / 4 spec files**. Starts its own dev server; leave port 3000 free                                                        |
| Browser engine        | Playwright's own Chromium build went missing from the local cache mid-session; the documented escape hatch is `$env:PLAYWRIGHT_BROWSER_CHANNEL='chrome'` |
| Types / lint / format | `npx tsc --noEmit`, `npx eslint .`, `npx prettier --check .` all clean                                                                                   |
| Build                 | `npm run build` → 23 routes emitted                                                                                                                      |
| Open owner action     | §13 of `docs/SG3-VERIFICATION.md`: the two Supabase values still need re-entering in `.env`                                                              |

### What the last session added (UI/UX phase 1)

- Content surface: `/about`, `/help`, `/terms`, `/privacy`, `/acceptable-use`, plus
  `src/components/policy-shell.tsx` and `requirePolicy()` in `src/lib/site.ts`.
- Landing page rebuild, footer link groups with creator attribution, `site-header` account
  block and monogram.
- Loading skeletons for `/browse` and `/saved`; rewritten `not-found`, `error` and a new
  `global-error`.
- **`src/app/manage/loading.tsx` was created and then deliberately deleted.** A route-level
  `loading.tsx` wraps `/manage/[id]` too, and its `notFound()` then arrived as a 200. Do not
  reintroduce it; see `docs/UI-UX-DESIGN-SYSTEM.md` §19.4.1.

### Suggested next steps, in order

1. Commit the working tree in reviewable chunks (the tree has been dirty across sessions).
2. UI/UX phase 2: `browse` page and `resource-card` against the design system §12.
3. The `SG-4` items still open: the `/design` route and a no-hardcoded-colour lint rule.

## Quick verification commands

```powershell
Set-Location E:\projects\edu-share-platform
git remote -v
git --no-pager status -sb   # --no-pager: an interactive pager wedged the shell before
gh repo view Crusty-chirayu/Edu-Share --json visibility,isFork,defaultBranchRef
```
