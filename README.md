# EDU-SHARE

> **Status: M3 foundation implemented — boots, validates env, health-checked.**
> No product features exist yet (auth, catalogue, resources arrive M5–M7).

EDU-SHARE is an independent, full-stack EdTech platform for academic resource
discovery and sharing — connecting students and teachers across institutions to
exchange notes, question papers, study material, and learning resources.

This repository is **independently maintained by
[Crusty-chirayu](https://github.com/Crusty-chirayu)**. It is **not a fork** of any
other EDU-SHARE implementation, and it contains no third-party source code at
present.

---

## Repository identity

| Item | Value |
| --- | --- |
| Remote | `https://github.com/Crusty-chirayu/Edu-Share.git` |
| Visibility | **Private** |
| Default branch | `main` |
| License | MIT — see [`LICENSE`](./LICENSE) |

---

## Development status

| Area | Status |
| --- | --- |
| Repository & documentation | ✅ Initialized |
| Technical audit of the inherited system | ✅ Complete — [`docs/PROJECT-AUDIT.md`](./docs/PROJECT-AUDIT.md) |
| Product requirements | ✅ Complete — [`docs/PRODUCT-REQUIREMENTS.md`](./docs/PRODUCT-REQUIREMENTS.md) |
| Architecture proposal | ✅ Complete — [`docs/ARCHITECTURE-PROPOSAL.md`](./docs/ARCHITECTURE-PROPOSAL.md) |
| UI/UX design system | ✅ Complete — [`docs/UI-UX-DESIGN-SYSTEM.md`](./docs/UI-UX-DESIGN-SYSTEM.md) |
| Implementation roadmap | ✅ Complete — [`docs/IMPLEMENTATION-ROADMAP.md`](./docs/IMPLEMENTATION-ROADMAP.md) |
| Owner decision brief (costs re-verified 2026-09-26) | ✅ Complete — [`docs/DECISION-BRIEF.md`](./docs/DECISION-BRIEF.md) |
| M2 approval (Option A + Supabase PostgreSQL + Vercel) | ✅ Granted by owner — scope: M3 foundation only |
| M3 foundation (Next.js App Router + strict TS + env validation + migrations + CI) | ✅ Implemented — see Local setup below |
| Tests / CI | ✅ Wired — [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) |
| Deployment | ⬜ Not started (M11) |
| M4+ product modules (design system, auth, catalogue, resources, AI) | ⬜ Not started — out of scope for this task |

**M3 foundation only — no product features yet.** Auth, catalogue, resources,
AI, and all M4+ modules are out of scope for this task.

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

For reference, the *inherited* system used PHP 8, MySQL/MariaDB, Tailwind CSS (via the
CDN play script), and Font Awesome. Those are facts about the inherited code, not a
decision about this project.

---

## Local setup

Prerequisites: Node 20–24, npm 11, Docker Desktop (local Postgres).

```powershell
Set-Location E:\projects\edu-share-platform
Copy-Item .env.example .env
npm ci
docker compose up -d
npm run db:migrate
npm run db:seed
npm run dev
```

App: `http://localhost:3000`. Health: `GET /api/health` (200 with DB, 503
without). Checks: `npm run typecheck`, `npm run lint`, `npm test -- --run`,
`npm run build`. Supabase workflow: [`docs/SUPABASE.md`](./docs/SUPABASE.md).

---

## Documentation

| Document | Purpose |
| --- | --- |
| [`docs/PROJECT-AUDIT.md`](./docs/PROJECT-AUDIT.md) | Severity-ranked audit of the inherited application: 24 findings, data model, security, accessibility, risk register, and the licensing boundary |
| [`docs/PRODUCT-REQUIREMENTS.md`](./docs/PRODUCT-REQUIREMENTS.md) | Personas, roles and permissions, 76 functional and 46 non-functional requirements, MVP scope, the definition of "premium", content policy, and the owner decisions |
| [`docs/ARCHITECTURE-PROPOSAL.md`](./docs/ARCHITECTURE-PROPOSAL.md) | Three candidate architectures, a recommendation with its trade-offs, the full specification, the conceptual database design, and the decision record |
| [`docs/UI-UX-DESIGN-SYSTEM.md`](./docs/UI-UX-DESIGN-SYSTEM.md) | Brand identity, design tokens, 40 components, 15 screen specifications, interaction standards, and the accessibility baseline |
| [`docs/IMPLEMENTATION-ROADMAP.md`](./docs/IMPLEMENTATION-ROADMAP.md) | Milestones `M0`–`M11`, quality gates, CI/CD design, release and rollback procedure, verified cost figures, and the risk register |
| [`docs/DECISION-BRIEF.md`](./docs/DECISION-BRIEF.md) | The short route through the approval gate: each decision's options, trade-offs and costs (every figure re-verified against provider documentation on 2026-09-26), recommended defaults, the questions only the owner can answer, and a copy-pasteable answer block |
| [`docs/PROJECT-HANDOVER.md`](./docs/PROJECT-HANDOVER.md) | The original handover: verified findings on the inherited system, its licensing position, and its security review |
| [`docs/SUPABASE.md`](./docs/SUPABASE.md) | Supabase integration boundary and safe migration workflow (M3) |
| [`docs/CONTINUATION-CHECKPOINT.md`](./docs/CONTINUATION-CHECKPOINT.md) | Where to pick up in the next session, including the safety boundaries |
| [`docs/DEVELOPMENT-STATUS.md`](./docs/DEVELOPMENT-STATUS.md) | Running log of milestones and their verification |

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
