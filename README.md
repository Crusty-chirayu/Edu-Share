# EDU-SHARE

> **Status: 2.0 Transformation, M9 Moderation, and M6 Taxonomy Administration Complete & Verified.** The platform features a refined design system (Modern Blue `#2E5BFF`, Host Grotesk typography, pill controls, flat surfaces), full public and authenticated user journeys, comprehensive administrative moderation and taxonomy management, and database-level security with Row Level Security (RLS) across 8 migrations.
> **All 312 database integration tests, unit tests, static analysis, and production build pass.**

EDU-SHARE is an independent, full-stack EdTech platform for academic resource
discovery and sharing — connecting students and teachers across institutions to
exchange notes, question papers, study material, and learning resources.

This repository is **independently maintained by
[Crusty-chirayu](https://github.com/Crusty-chirayu)**. It is **not a fork** of any
other EDU-SHARE implementation, and it contains no third-party source code at
present.

---

## Repository identity

| Item           | Value                                                |
| -------------- | ---------------------------------------------------- |
| Remote         | `https://github.com/Crusty-chirayu/Edu-Share.git`    |
| Visibility     | **Private**                                          |
| Default branch | `main` (active feature branch: `feat/edu-share-2-0`) |
| License        | MIT — see [`LICENSE`](./LICENSE)                     |

---

## Development status

| Area                                                           | Status                                                                                                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repository & documentation                                     | ✅ Initialized & audited — [`docs/PROJECT-AUDIT.md`](./docs/PROJECT-AUDIT.md)                                                                                     |
| Product requirements & architecture                            | ✅ Complete — [`docs/PRODUCT-REQUIREMENTS.md`](./docs/PRODUCT-REQUIREMENTS.md), [`docs/ARCHITECTURE-PROPOSAL.md`](./docs/ARCHITECTURE-PROPOSAL.md)                |
| UI/UX Design System 2.0                                        | ✅ Complete — Modern Blue `#2E5BFF`, Host Grotesk & IBM Plex Mono, pill controls, flat cards, high-contrast dark mode                                             |
| M3 Foundation & Database                                       | ✅ Complete — 8 migrations (`0001`–`0008`) applied, PostgreSQL 16 schema, custom transaction runner                                                               |
| M4–M8 Vertical Slice (browse, upload, manage, saved, accounts) | ✅ Implemented & verified against live PostgreSQL (`src/db/rls.integration.test.ts`, `src/db/resource-service.integration.test.ts`)                               |
| M9 Content Moderation System                                   | ✅ Implemented & verified — Report queue, moderation actions, resolution audit log, admin RLS policies                                                            |
| M6 Taxonomy Administration                                     | ✅ Implemented & verified — Institution and subject lifecycle management, safe deletion guards                                                                    |
| Tests / Verification                                           | ✅ **312 live database tests pass (100%)**, 246 unit tests pass, TypeScript, ESLint, Prettier clean, production build succeeds (36 routes)                        |
| Deployment Readiness                                           | 🔄 Local container & dev environment verified; production deployment requires hosted bucket and production secrets (see [`docs/SUPABASE.md`](./docs/SUPABASE.md)) |

**What exists today:** a complete academic resource platform — landing page with real product showcase and dynamic platform metrics, browse with server-side search and faceted filters, resource detail with academic context and download counting, upload with MIME validation and byte-level storage, owner edit and delete, private bookmarking, account profile management, administrative content moderation (`/admin/moderation`), and university/subject taxonomy management (`/admin/taxonomy`).

### Inherited code status

An earlier PHP/MySQL EDU-SHARE implementation by another developer was reviewed
as a reference. It is **deliberately not vendored into this repository** because
no license could be located in the inherited source, which leaves its
redistribution rights unclear. Findings, data-model notes, and security concerns
are recorded in the handover document. The inherited source remains on the
original machine only, unmodified.

---

## Technology stack

- **Framework:** Next.js 15.5.2 App Router + React 19.1.1
- **Language:** TypeScript 5.9.2 (strict mode)
- **Database:** PostgreSQL 16 + Drizzle ORM + postgres.js driver
- **Security:** PostgreSQL Row Level Security (RLS), security headers, CSRF-hardened mutations, input validation via Zod 3.23.8
- **Typography:** Host Grotesk (`next/font/google`) + IBM Plex Mono
- **Testing:** Vitest 3.2.4 (unit & integration), Playwright 1.55.0 (E2E)
- **Linting & Formatting:** ESLint 9.35.0 (flat config) + Prettier 3.6.2
- **Containerization:** Docker Compose PostgreSQL 16 service (`compose.yaml`)

---

## Local setup

Prerequisites: Node 20–24, npm 11, Docker Desktop (or local PostgreSQL 16 service).

```powershell
Set-Location E:\projects\edu-share-platform
Copy-Item .env.example .env   # git-ignored; defaults target local PostgreSQL
npm ci
npm run db:inspect            # read-only: inspect connection and table state
npm run db:migrate:status     # read-only: prints applied/pending migration status
npm run db:migrate            # applies all pending migrations (0001–0008)
npm run db:seed               # seeds baseline institutions and subjects
npm run dev                   # starts Next.js development server on http://localhost:3000
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
