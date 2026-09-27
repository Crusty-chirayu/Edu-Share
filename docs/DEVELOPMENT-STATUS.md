# DEVELOPMENT STATUS

Running log of EDU-SHARE milestones. Newest first.

---

## M0 — Onboarding, handover & repository establishment

**Status: COMPLETE**
**Date:** 2026-09-26
**Type:** Documentation and source control only. No application code written.

### Completed
- Inspected the inherited EDU-SHARE application in full: 24 PHP files plus
  `project.sql`. Traced auth, upload, retrieval, favourite, and AJAX flows.
- Documented verified technologies, data model, features, defects, and security
  findings in [`PROJECT-HANDOVER.md`](./PROJECT-HANDOVER.md).
- Verified the GitHub target: `Crusty-chirayu/Edu-Share`, private, not a fork,
  default branch `main`, single "Initial commit" containing only `LICENSE`.
- Created an **independent** workspace at `E:\projects\edu-share-platform` with
  its own `git init`, branching from `origin/main`. Linear history, no
  force-push, no rewriting of remote history.
- Left the inherited project at `E:\projects\Edu-Share` completely untouched.
- Wrote `.gitignore` excluding secrets, database dumps, uploads, build output,
  and any vendored inherited source.
- Rewrote `README.md` to reflect the project's real, pre-implementation state.

### Key decisions
| Decision | Rationale |
| --- | --- |
| Do **not** commit inherited PHP source | No LICENSE found in the inherited project; "no license" means all rights reserved |
| Do **not** commit `project.sql` | Contains real PII and bcrypt password hashes |
| New independent directory rather than reusing `E:\projects\Edu-Share` | That path is not a Git repo, and its parent `E:\projects` is a different zero-commit repo; reusing it risked targeting the wrong repository |
| Branch from the existing remote commit rather than a fresh root commit | Preserves the remote's existing history and avoids any force-push |
| No `.env.example` yet | No architecture or config surface exists to justify one; placeholders without a real consumer would be misleading |

### Findings that drive the roadmap
- The inherited app **cannot run as delivered** — its `require` and redirect
  paths assume a folder layout that this checkout does not have.
- `admin.php` is not valid PHP and contains SQL injection plus broken access control.
- `courses.name` is globally UNIQUE, which contradicts the product's own
  cross-institution premise.
- No admin role, no CSRF protection, no tests, no CI, no config layer.

### Carried into next milestone
- Open questions for the owner are listed in
  [`CONTINUATION-CHECKPOINT.md`](./CONTINUATION-CHECKPOINT.md): deployment
  target, budget for managed services, AI-feature scope, and content policy.

---

## M1 — Technical audit, product definition, architecture, design system & roadmap

**Status: COMPLETE** (documentation only)
**Date:** 2026-09-26
**Type:** Documentation and planning. No application code written; no dependency installed.

### Completed

- **`docs/PROJECT-AUDIT.md`** — a 24-finding, severity-ranked audit of the inherited
  application (2 critical, 6 high, 9 medium, 5 low, 2 informational), with every finding
  labelled VERIFIED / REPORTED / INFERRED / UNKNOWN, plus the positive patterns worth
  retaining and the licensing boundary.
- **`docs/PRODUCT-REQUIREMENTS.md`** — 5 personas, a three-role least-privilege model with
  a 27-row capability matrix, 76 functional requirements with acceptance criteria, 46
  non-functional targets, an explicit MVP boundary, a 13-point definition of "premium", a
  content-policy framework, and 12 owner decisions.
- **`docs/ARCHITECTURE-PROPOSAL.md`** — three candidate architectures compared across 16
  descriptive criteria, one recommendation with its trade-offs and revisit triggers, the
  full specification including cross-cutting concerns, a conceptual database design, five
  architecture decision records, and every provider fact with its source and check date.
- **`docs/UI-UX-DESIGN-SYSTEM.md`** — brand identity and visual principles, semantic design
  tokens for light and dark, typography, motion, 40 components with states and
  accessibility notes, 15 screen specifications, interaction standards, and a WCAG 2.2 AA
  baseline.
- **`docs/IMPLEMENTATION-ROADMAP.md`** — milestones `M0`–`M11` each with objective, scope,
  deliverables, acceptance criteria, tests, risks and completion evidence; 13 quality
  gates; a CI/CD design; a release checklist and rollback plan; verified free-tier cost
  figures; a 15-item risk register; and 12 stage gates.

### Key findings that drive the plan

- **AUD-001 (critical):** `teacher_profile.php` serves files **before any authentication
  check** and builds a path from unsanitised input — an unauthenticated arbitrary file
  read. This is why no route in the replacement lets a request parameter reach a storage
  or filesystem path.
- **AUD-002 (critical):** registration lets a user select the role that authorises
  destructive platform-wide actions. This is why a role is never accepted from client
  input in the replacement.
- **AUD-010 (architectural):** `courses.name` is globally UNIQUE, forbidding the product's
  own cross-institution premise. This is why every uniqueness constraint is scoped to its
  parent in the proposed schema.
- **AUD-023 (legal):** the inherited source carries no licence, so it cannot be reused.
  The platform is written from scratch regardless of the technical findings.
- **Corrections to the earlier handover:** `admin.php` is **not** SQL-injectable (its
  identifiers are `intval()`-cast), and prepared statements are used broadly — 42 call
  sites. Both corrections are recorded so the audit is not read as a list of
  exaggerations.

### Verification actually performed

| Check | Result |
| --- | --- |
| All five documents exist with substantive content | ✅ |
| Relative links resolve from their own directory | ✅ |
| Markdown tables well-formed (header/separator consistency) | ✅ |
| Secret, credential and personal-data pattern scan | ✅ no matches |
| Application source, manifests or lockfiles introduced | ✅ none present |
| Change set is documentation-only | ✅ confirmed against `git status` |

### Carried into the next milestone

**M2 — owner approval.** Twelve decisions are listed in
[`PRODUCT-REQUIREMENTS.md`](./PRODUCT-REQUIREMENTS.md) §11, of which `D-001` (stack),
`D-002` (database) and `D-005` (hosting) block implementation. A copy-pasteable checklist
is provided in §11.3.

## M2 — Owner review and architecture approval

**Status: AWAITING OWNER — decision brief prepared.**
**Date:** 2026-09-26
**Type:** Research and documentation only. No application code written; no dependency
installed; no account created, no service subscribed to, nothing deployed.

### Completed this session

- **Re-verified every provider fact the blocking decisions depend on**, from the providers'
  own documentation, on 2026-09-26: Vercel (Hobby and Pro), Neon, Supabase, Cloudflare R2
  and Workers, Railway, Render, Fly.io, Resend, GitHub Actions, and the licence of the
  candidate authentication library.
- **Wrote [`DECISION-BRIEF.md`](./DECISION-BRIEF.md)** — the document this gate needs:
  each decision's real options, its trade-offs, its cost implications, a recommended
  default, the questions only the owner can answer, a copy-pasteable answer block, and an
  exact preview of what `M3` will do on approval.
- **Closed two gaps the `M1` documents had explicitly flagged as unverified:**
  - Cloudflare Workers free-plan limits — now verified as **100,000 requests/day and 10 ms
    of CPU per invocation**. The CPU ceiling matters: it is below the 10–20 ms that
    Cloudflare's own documentation attributes to server-side rendering and authentication,
    so the Workers free plan is **not** a viable target for this architecture.
  - The licence of the candidate authentication library — **Better Auth is MIT**.
- **Recorded four facts that arrived after the proposal was written** (none changes a
  recommendation): Vercel Pro is $20/month; Cloudflare Workers Paid is $5/month; a private
  GitHub repository includes 2,000 Actions minutes per month, with a budget able to stop
  usage rather than bill it; Fly.io has **no** free tier and requires a card on file.
- **Recorded one operational constraint found during verification:** Railway's free plan
  includes cron jobs **during the trial only**. Scheduled work (retention purge, orphan
  reconciliation) will be designed as a callable command triggered by an external
  scheduler, not as an assumed platform feature. Added to the roadmap's resource-constraint
  register.
- Corrected and extended the source tables in
  [`ARCHITECTURE-PROPOSAL.md`](./ARCHITECTURE-PROPOSAL.md) §11 and
  [`IMPLEMENTATION-ROADMAP.md`](./IMPLEMENTATION-ROADMAP.md) §19 so the two documents agree
  with the verified figures.

### Verification actually performed

| Check | Result |
| --- | --- |
| Every figure in the brief traceable to a provider URL and a check date | ✅ §4 and §13 of the brief |
| Figures differ from the `M1` documents | ✅ recorded explicitly as eight deltas, not silently corrected |
| Change set is documentation-only | ✅ `git status` shows only `.md` files |
| Secret, credential and personal-data pattern scan | ✅ no matches |
| Application source, manifest or lockfile introduced | ✅ none present |
| No resource created, subscribed to, or deployed | ✅ nothing outside the repository was touched |

### Deliberately not done

No scaffold, no dependency, no migration, no database, no storage bucket, no email account,
no CI workflow, no deploy. `M3` remains blocked on `D-001`, `D-002` and `D-005`.

### What is required to proceed

**The answer block in [`DECISION-BRIEF.md`](./DECISION-BRIEF.md) §11.** The minimum set that
unblocks `M3` is `D-001` (architecture), `D-002b` (whether a paid database tier is ever
acceptable), `D-005a` (is the use personal and non-commercial), `D-005b` (is up to $5/month
acceptable if the free terms forbid it), plus the four confirmations at the end of the
block. Every other decision already carries a provisional default that can be changed at
the milestone which uses it.

## M3 — Project foundation and development environment

**Status: IMPLEMENTED 2026-09-26 (verification below; live DB run blocked, see §M3-blockers).**
**Type:** Implementation. No product features — scaffold, tooling, env, migrations, CI only.
**Authorization:** owner approved M2 (Option A: Next.js App Router + TypeScript + Supabase
PostgreSQL + Vercel, free-tier limits) with scope restricted to M3. M4/M5 NOT started.

### Delivered

- Next.js 15.5.2 App Router + React 19.1.1 + strict TS 5.9.2 (`src/app/`: `layout`, `page`,
  `error` client boundary, `not-found`, `api/health`; `src/middleware.ts` security headers).
- Env fail-fast validation (`src/lib/env.ts`, Zod) + `.env.example` placeholders-only;
  `.env` git-ignored and verified ignored (`git check-ignore`).
- DB layer: `postgres` + Drizzle schema (`src/db/`), reversible migration 0001
  (`schema_migrations` journal + `health_probes`), `db:migrate` / `:down` / `:status`,
  `db:seed` (one probe row, no product data), `compose.yaml` (Postgres 16-alpine).
- Supabase boundary: lazy `@supabase/supabase-js` client (`src/lib/supabase.ts`),
  optional env keys, workflow doc `docs/SUPABASE.md`. No project created, no keys invented.
- Auth boundary only: middleware headers now; sessions/roles arrive in M5. No registration,
  roles, courses, or AI code.
- Quality: ESLint flat (Next core-web-vitals + strict TS), Prettier, Vitest unit/integration,
  Playwright e2e smoke (`e2e/smoke.spec.ts`), CI (`.github/workflows/ci.yml`: install,
  typecheck, lint, format, tests, migrate up/status/seed/down/status/up, build).
- Docs: README local-setup + stack updated; `docs/SUPABASE.md` added.

### Verification actually performed (this machine, 2026-09-26)

| Check (exact command) | Result |
| --- | --- |
| `npx tsc --noEmit` | ✅ pass, exit 0 |
| `npx eslint .` | ✅ pass, exit 0 (after fixing `no-html-link-for-pages`, `no-console`) |
| `npx prettier --check <scoped paths>` | ✅ pass (docs excluded; pre-existing docs use other wrapping) |
| `npx vitest run` | ✅ 3 files passed, 7 tests passed, 1 skipped (`db.integration` needs live DB) |
| `npm run build` | ✅ pass (added `"use client"` to `error.tsx`; routes `/`, `/_not-found`, `/api/health`) |
| `dev` on :3100 + `GET /api/health` | ✅ `/` 200; `/api/health` 503 `{"status":"degraded","db":"down"}` (correct: no DB here) |
| `npm run db:migrate:status` | ⚠️ fails closed as designed: `connect ECONNREFUSED 127.0.0.1:5432` (no Postgres here) |
| `docker compose up -d` | ❌ Docker Desktop daemon not running (`npipe/...dockerDesktopLinuxEngine` missing) |
| `npx playwright test` | ⏭️ not run locally (no DB + browsers uninstalled); spec present for CI |

### M3-blockers (recorded, not fabricated)

1. Hosted verification pending owner-run outputs (§6 sequence in
   `docs/SUPABASE.md`): `db:inspect` → `status` → `migrate` → `status` →
   `inspect` → `seed` → `inspect` against `uqcmcurhohbdnxzpdpei`. The code is
   **uncommitted** in the working tree; three consecutive sessions could not
   execute any command (VS Code terminal integration fails before running with
   "The terminal's shell process has exited"), so nothing was executed
   first-hand here and no checks have passed yet.
2. Local Docker path unverified on this machine (daemon was down in the prior
   session); hosted Supabase is now the primary path, Docker the fallback.
3. Playwright e2e not run locally (no DB + browsers uninstalled); spec present
   for CI, which uses its own disposable Postgres service (no Supabase secrets).

### M3 acceptance vs roadmap §7 (updated 2026-09-27)

| Criterion | State |
| --- | --- |
| Fresh clone → running app via docs alone | ✅ app boots + health degrades cleanly; hosted DB path is primary (docs/SUPABASE.md §6), Docker fallback documented |
| Production build succeeds | ✅ `npm run build` green (prior session; re-verify after these edits) |
| Migration applies AND reverses | ⏳ code complete (idempotent `up`, guarded writes, reversal on disposable DBs in CI); `down` is now **loopback-only in code** (a ref-matched hosted target is refused before any connection opens, with no env bypass) and the journal row is deleted after a successful `down`; hosted `up` pending owner-run output — `down` NEVER on hosted |
| Hosted rollback impossible from the CLI | ⏳ enforced in `migrateDown()` ahead of `withClient()`; asserted offline by `src/db/migrate.test.ts` (stubbed driver, zero connection attempts on refusal); owner-run proof is §6 of [`M3-VERIFICATION.md`](./M3-VERIFICATION.md) |
| Format gate (`npm run format`, CI step "Format check") | ⚠️ most likely RED at HEAD, independent of this session: `.prettierignore` lists config/build artifacts only (`.prettierrc.json`, `eslint.config.mjs`, `next-env.d.ts`, `.next`, `out`, `coverage`, `playwright-report`, `test-results`) and no `*.md` pattern, while the tables in `README.md`/`docs/*.md` are not in Prettier's aligned form. Remedy is one `npx prettier --write .`. Inferred from the file contents and Prettier's documented table alignment — **not executed** (shell unavailable); see [`M3-VERIFICATION.md`](./M3-VERIFICATION.md) §3 |
| CI fails on type/lint/test errors | ✅ workflow wired on disposable Postgres (no Supabase secrets); re-verify green after this change |
| `.env` ignored, no secrets committed | ✅ verified (only `.env.example` tracked; new code prints hostnames only) |
| Clear error on missing env | ✅ asserted in tests; CLI errors now on `console.error` + exit 1 even when `LOG_LEVEL=warn` |
| Status/inspect always print | ✅ fixed 2026-09-27: stdout `migration 0001: applied|pending`, `db:inspect` identity lines; root cause was `logger.info` filtered by `LOG_LEVEL=warn` |
| No phantom `drizzle/` dir | ✅ by design: custom runner in `src/db/migrations.ts`; `drizzle.config.ts` is future codegen config only |

### Code changes in this session (2026-09-27, uncommitted until verified)

- `src/db/guard.ts` (+ `guard.test.ts`): write-target assertion — loopback or
  Supabase ref match; credential-redacting helpers.
  **Hardened later the same day (second session, shell still unavailable):**
  `matchesSupabaseRef()` now enforces *exact* hostname `db.<ref>.supabase.co`
  or `*.pooler.supabase.com` + exactly `postgres.<ref>` decoded user (substring
  matching removed — `db.<ref>.supabase.co.evil.example.com` refused);
  `isLoopbackHost()` accepts `[::1]` as WHATWG URLs report it (exported);
  `redactDatabaseUrl()` rebuilds from parsed URL components (raw `@` in
  password can no longer leak; unparseable input never echoed). Tests grew to
  28 (deceptive hostname/user, IPv6, percent-encoding, fail-closed, redaction)
  with `afterEach` env restoration.
- `src/db/migrate.ts`: idempotent multi-migration `up` (per-version skip),
  guarded `up`/`down`, stdout status lines, `prepare: false` (Supabase pooler);
  `describeWriteTarget()` cannot throw (nested fallback).
  **Hardened further in the latest session (shell still unavailable):**
  `migrateDown()` enforces a second, independent barrier — rollback is
  loopback-only via `isLoopbackHost(target.host)` after `assertWriteTarget()` and
  throws *before* `withClient()` opens anything, so the ref-matched hosted target
  that `up` must accept can never be rolled back from the CLI, and there is
  deliberately no environment-variable bypass. After a successful `down` the
  migration's `schema_migrations` row is deleted behind a
  `to_regclass('public.schema_migrations')` truthy check, so `status` cannot
  report a reverted migration as applied (for `0001` the `down` drops the journal
  itself, so the check correctly skips the delete — latent safety for later
  migrations).
- `src/db/migrate.test.ts` (**new**): stubs the `postgres` driver so "no
  connection was attempted" is observable — the hosted-refusal cases assert an
  empty `connectCalls`, proving the barrier precedes the driver. Covers hosted
  refusal, unconfigured-project refusal, `up` still reaching a hosted target,
  loopback `down` reaching the driver, and `describeWriteTarget()`.
- `src/db/guard.test.ts`: negative cases added (missing `DATABASE_URL`,
  percent-encoded host, trailing-dot host) plus `matchesSupabaseRef` edges.
- `src/db/migrations.test.ts`: invariant test (unique + strictly sorted versions,
  unique names).
- `docs/M3-VERIFICATION.md` (**new**): the ordered owner-run runbook — CI-order
  checks, the local `compose.yaml` `up`/`down`/`status` cycle, the hosted refusal
  proof, and the git review/commit steps. `docs/SUPABASE.md` §3/§4/§7 updated to
  match (the hosted-rollback ban is now enforced in code, not just convention).
- `scripts/migrate.ts`: stdout output + `console.error` failures (fixes silent
  `status` under `LOG_LEVEL=warn`).
- `scripts/inspect-db.ts` (`npm run db:inspect`): read-only identity + table +
  journal + probe-count reporter (no secrets).
- `scripts/seed.ts`: guarded, bounded (insert 1 + prune to 5 newest probe rows).
- `src/db/client.ts`, `src/db/db.integration.test.ts`: effective URL +
  `prepare: false`; integration test honours the configured Supabase ref.
- `src/lib/env.ts`: `__setTestEnv` helper for env-mutating tests.
- `package.json`: `db:inspect` script. `docs/SUPABASE.md` §1–§6 rewritten for
  the hosted path + exact 7-command verification sequence.

### Deliberately not done (roadmap boundary)

No M4 tokens/components/shell, no M5 auth/sessions/roles, no M6 taxonomy, no M7
upload/storage, no M8–M11. No deploy, no paid service, no production migration.

## M4+ — Product implementation

**Status: NOT STARTED.** M3 foundation only. Next is M4 per roadmap §8 (tokens,
primitives, shell, `/design` route) — do not start in this task.
