# EDU-SHARE

> **Status: M3 foundation complete; an M4–M8 vertical slice is built and partially
> verified.** The application ships a real product surface — browse, detail, upload,
> manage, saved, accounts — and the security boundaries are enforced in code.
> **No milestone stage gate below `SG-3` is demonstrated**, because no PostgreSQL or
> Docker was reachable in the session that built this: migrations `0002`/`0003` have
> never been applied and no RLS policy has ever executed. See
> [`docs/IMPLEMENTATION-ROADMAP.md`](./docs/IMPLEMENTATION-ROADMAP.md) §22 for
> exactly what is verified and what is not.

EDU-SHARE is an independent, full-stack EdTech platform for academic resource
discovery and sharing — connecting students and teachers across institutions to
exchange notes, question papers, study material, and learning resources.

This repository is **independently maintained by
[Crusty-chirayu](https://github.com/Crusty-chirayu)**. It is **not a fork** of any
other EDU-SHARE implementation, and it contains no third-party source code at
present.

---

## Repository identity

| Item           | Value                                             |
| -------------- | ------------------------------------------------- |
| Remote         | `https://github.com/Crusty-chirayu/Edu-Share.git` |
| Visibility     | **Private**                                       |
| Default branch | `main`                                            |
| License        | MIT — see [`LICENSE`](./LICENSE)                  |

---

## Development status

| Area                                                                           | Status                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository & documentation                                                     | ✅ Initialized                                                                                                                                                                                                                                        |
| Technical audit of the inherited system                                        | ✅ Complete — [`docs/PROJECT-AUDIT.md`](./docs/PROJECT-AUDIT.md)                                                                                                                                                                                      |
| Product requirements                                                           | ✅ Complete — [`docs/PRODUCT-REQUIREMENTS.md`](./docs/PRODUCT-REQUIREMENTS.md)                                                                                                                                                                        |
| Architecture proposal                                                          | ✅ Complete — [`docs/ARCHITECTURE-PROPOSAL.md`](./docs/ARCHITECTURE-PROPOSAL.md)                                                                                                                                                                      |
| UI/UX design system                                                            | ✅ Complete — [`docs/UI-UX-DESIGN-SYSTEM.md`](./docs/UI-UX-DESIGN-SYSTEM.md)                                                                                                                                                                          |
| Implementation roadmap                                                         | ✅ Complete — [`docs/IMPLEMENTATION-ROADMAP.md`](./docs/IMPLEMENTATION-ROADMAP.md)                                                                                                                                                                    |
| Owner decision brief                                                           | ✅ Complete — [`docs/DECISION-BRIEF.md`](./docs/DECISION-BRIEF.md)                                                                                                                                                                                    |
| M2 approval (Option A + Supabase + Vercel)                                     | ✅ Granted — scope: M3 foundation only                                                                                                                                                                                                                |
| M3 foundation code                                                             | ✅ Implemented (see [`docs/DEVELOPMENT-STATUS.md`](./docs/DEVELOPMENT-STATUS.md) §M3)                                                                                                                                                                 |
| M3 hosted DB verification (`uqcmcurhohbdnxzpdpei`)                             | ⏳ In progress — run [`docs/SUPABASE.md`](./docs/SUPABASE.md) §6, paste outputs                                                                                                                                                                       |
| M4–M8 vertical slice (tokens, shell, sessions, storage, browse, upload, saved) | 🔄 Implemented; **unverified against a database** — see [roadmap §22](./docs/IMPLEMENTATION-ROADMAP.md#22-m4m8-vertical-slice--implementation-log-and-verification-status)                                                                            |
| Tests / CI                                                                     | ✅ Wired — [`.github/workflows/ci.yml`](./.github/workflows/ci.yml), disposable Postgres service, no Supabase secrets. 247 unit + integration tests and 33 browser tests, both green locally; the Postgres integration suites skip without a database |
| Deployment                                                                     | ⬜ Not started (M11)                                                                                                                                                                                                                                  |

**What exists today:** a working library — browse with server-side search and
filters, resource detail, upload with server-side type/size/content validation,
owner-only edit and delete, a private saved list, and email/password accounts with
a local development identity adapter. **What is _not_ proven:** the database has
never run these migrations, so no RLS policy has executed and no file has been
stored.

### Inherited code status

An earlier PHP/MySQL EDU-SHARE implementation by another developer was reviewed
as a reference. It is **deliberately not vendored into this repository** because
no license could be located in the inherited source, which leaves its
redistribution rights unclear. Findings, data-model notes, and security concerns
are recorded in the handover document. The inherited source remains on the
original machine only, unmodified.

---

## Technology stack (M3 — adopted)

Next.js 15.5.2 App Router + React 19.1.1 + strict TypeScript 5.9.2, Zod env
validation, PostgreSQL 16 (local Docker; Supabase path in
[`docs/SUPABASE.md`](./docs/SUPABASE.md)), Drizzle ORM + postgres.js,
Vitest + Playwright, ESLint flat + Prettier, GitHub Actions CI.
Exact versions are pinned in `package.json` with a committed lockfile.
Full specification and trade-offs: [`docs/ARCHITECTURE-PROPOSAL.md`](./docs/ARCHITECTURE-PROPOSAL.md).

For reference, the _inherited_ system used PHP 8, MySQL/MariaDB, Tailwind CSS (via the
CDN play script), and Font Awesome. Those are facts about the inherited code, not a
decision about this project.

---

## Local setup

Prerequisites: Node 20–24, npm 11. Docker Desktop only for the local-Postgres
fallback — the primary path is hosted Supabase (see
[`docs/SUPABASE.md`](./docs/SUPABASE.md) §3 and §6).

```powershell
Set-Location E:\projects\edu-share-platform
Copy-Item .env.example .env   # git-ignored; defaults already target local Docker
npm ci
npm run db:inspect            # read-only: identity + foundation-table state
npm run db:migrate:status     # read-only: prints `migration 0003: applied|pending`
npm run db:migrate            # guarded write: applies 0001 + 0002 + 0003
npm run db:seed               # bounded probe write (5 rows max), after `up`
npm run dev
```

App: `http://localhost:3000`. Health: `GET /api/health` (200 with DB, 503
without). Checks, in the same order CI runs them: `npm run typecheck`,
`npm run lint`, `npm run format`, `npm test`, `npm run build`, then
`npm run test:e2e`. Full M3 runbook (including the local Postgres `up`/`down`
cycle): [`docs/M3-VERIFICATION.md`](./docs/M3-VERIFICATION.md). Supabase workflow:
[`docs/SUPABASE.md`](./docs/SUPABASE.md).

### Testing: unit-only vs full local integration

Vitest does **not** load `.env` on its own, so the database suites never rely
on an implicit ambient environment. The single source of truth is
`vitest.setup.ts`, which runs in every worker **before** any test module is
imported (import-time `process.env["DATABASE_URL"]` capture is what broke
before):

- Unit-only (default): `npm test` — database suites stay skipped, no database
  connection is opened.
- Full local integration: `npm run test:db` (equivalently
  `$env:RUN_DB_TESTS = '1'; npx vitest run` on PowerShell) — requires the
  loopback PostgreSQL from `compose.yaml`
  (`postgres:16-alpine`, `127.0.0.1:5432`, database `edushare`). The setup
  resolves `DATABASE_URL` with an explicitly exported value winning over the
  `.env` fallback, then refuses anything missing, malformed, or non-loopback
  before any socket opens. A non-empty `DIRECT_URL` must prove itself too,
  because it takes precedence in `getEffectiveDatabaseUrl()`.

Validator and regression coverage live in
`src/db/test-database-url.ts` / `src/db/test-database-url.test.ts`.

Browser tests run through **`npm run test:e2e`**, not `npx playwright test`. The
script temporarily moves `.env` aside so the test server cannot reach a hosted
Supabase project, and always restores it — without that, a run would perform a
real hosted Auth exchange. It also refuses to start if port 3000 is already busy.
Leave the port free, and see `docs/SG3-VERIFICATION.md` §12 for why the wrapper is
necessary.

### Running the product without Supabase

Uploads need somewhere to put files, and accounts need an identity. Both have a
development answer, and both are **hard-blocked when `NODE_ENV=production`** — the
environment validator refuses to boot rather than serving silently-wrong traffic.

```dotenv
# .env — development only
EDU_SHARE_DEV_AUTH=1        # sign in with any name + email, no password, no account
EDU_SHARE_LOCAL_STORAGE=1   # files are written under .local/storage (git-ignored)
```

With `SUPABASE_STORAGE_BUCKET` set instead, files go to a private Supabase bucket and
are delivered as 60-second signed URLs. No service-role key is used anywhere: every
Supabase call is made as the signed-in user with the public anon key.

The UI labels the development identity on every screen where it is active, and says
that sessions do not survive a dev-server restart.

### Seeding sample data (development only)

For local visual QA and browser testing with sample subjects and resources:

```bash
npx tsx scripts/seed-sample.ts
```

This script is strictly development-only, uses synthetic UUIDs with an RFC 2606 reserved domain (`elena@university.invalid`), contains no real credentials, and is never executed during build, start, or production runtime.

---

## Documentation

| Document                                                               | Purpose                                                                                                                                                                                                                                                            |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`docs/PROJECT-AUDIT.md`](./docs/PROJECT-AUDIT.md)                     | Severity-ranked audit of the inherited application: 24 findings, data model, security, accessibility, risk register, and the licensing boundary                                                                                                                    |
| [`docs/PRODUCT-REQUIREMENTS.md`](./docs/PRODUCT-REQUIREMENTS.md)       | Personas, roles and permissions, 76 functional and 46 non-functional requirements, MVP scope, the definition of "premium", content policy, and the owner decisions                                                                                                 |
| [`docs/ARCHITECTURE-PROPOSAL.md`](./docs/ARCHITECTURE-PROPOSAL.md)     | Three candidate architectures, a recommendation with its trade-offs, the full specification, the conceptual database design, and the decision record                                                                                                               |
| [`docs/UI-UX-DESIGN-SYSTEM.md`](./docs/UI-UX-DESIGN-SYSTEM.md)         | Brand identity, design tokens, 40 components, 15 screen specifications, interaction standards, and the accessibility baseline                                                                                                                                      |
| [`docs/IMPLEMENTATION-ROADMAP.md`](./docs/IMPLEMENTATION-ROADMAP.md)   | Milestones `M0`–`M11`, quality gates, CI/CD design, release and rollback procedure, verified cost figures, and the risk register                                                                                                                                   |
| [`docs/DECISION-BRIEF.md`](./docs/DECISION-BRIEF.md)                   | The short route through the approval gate: each decision's options, trade-offs and costs (every figure re-verified against provider documentation on 2026-09-26), recommended defaults, the questions only the owner can answer, and a copy-pasteable answer block |
| [`docs/PROJECT-HANDOVER.md`](./docs/PROJECT-HANDOVER.md)               | The original handover: verified findings on the inherited system, its licensing position, and its security review                                                                                                                                                  |
| [`docs/SUPABASE.md`](./docs/SUPABASE.md)                               | Supabase integration boundary and safe migration workflow (M3)                                                                                                                                                                                                     |
| [`docs/M3-VERIFICATION.md`](./docs/M3-VERIFICATION.md)                 | Owner-run verification runbook for the M3 migration safety work: commands, expected results, and the known formatting-gate issue                                                                                                                                   |
| [`docs/CONTINUATION-CHECKPOINT.md`](./docs/CONTINUATION-CHECKPOINT.md) | Where to pick up in the next session, including the safety boundaries                                                                                                                                                                                              |
| [`docs/DEVELOPMENT-STATUS.md`](./docs/DEVELOPMENT-STATUS.md)           | Running log of milestones and their verification                                                                                                                                                                                                                   |

**Read these in order:** the audit establishes what is broken, the requirements establish
what is needed, the architecture establishes how it will be built, the design system
establishes how it will look, and the roadmap establishes in what order — with an explicit
approval gate between the planning and the building.

**If you are only here to unblock the build**, read
[`docs/DECISION-BRIEF.md`](./docs/DECISION-BRIEF.md) instead: it is the route through all
five documents, and it ends in the answer block that `M3` is waiting on.

---

## Contributing

Development is AI-assisted and owner-driven. See
[`docs/CONTINUATION-CHECKPOINT.md`](./docs/CONTINUATION-CHECKPOINT.md) before
starting work, and update the checkpoint when finishing.
