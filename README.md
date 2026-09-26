# EDU-SHARE

> **Status: pre-implementation / repository initialization.**
> The platform is under active development. No application code has been written yet.

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
| Architecture approval | ⏸ **Awaiting owner decision (M2)** — answer the block in the decision brief |
| Application implementation | ⬜ Not started (blocked on M2) |
| Tests / CI | ⬜ Not started |
| Deployment | ⬜ Not started |

**No feature described as "planned" in this repository exists yet.**

### Inherited code status

An earlier PHP/MySQL EDU-SHARE implementation by another developer was reviewed
as a reference. It is **deliberately not vendored into this repository** because
no license could be located in the inherited source, which leaves its
redistribution rights unclear. Findings, data-model notes, and security concerns
are recorded in the handover document. The inherited source remains on the
original machine only, unmodified.

---

## Technology stack

**Proposed, not adopted.** No framework, ORM, database driver, or hosting target has
been installed or committed. The recommendation is recorded in
[`docs/ARCHITECTURE-PROPOSAL.md`](./docs/ARCHITECTURE-PROPOSAL.md) and is **awaiting
owner approval**:

> An integrated full-stack TypeScript application (Next.js, App Router) on PostgreSQL,
> with private S3-compatible object storage, behind a single authorisation module.

The proposal also states its own conditions, the trade-offs it accepts, and the
circumstances that would justify revisiting the decision. Nothing is installed until
that document is approved.

For reference, the *inherited* system used PHP 8, MySQL/MariaDB, Tailwind CSS (via the
CDN play script), and Font Awesome. Those are facts about the inherited code, not a
decision about this project.

---

## Local setup

Not yet applicable — the repository currently contains documentation only. Setup
instructions will be added in milestone `M3`, when the application scaffold is created,
and they will be tested from a clean clone before being published.

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
