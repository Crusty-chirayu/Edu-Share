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
| Technical audit of inherited system | ✅ Documented ([`docs/PROJECT-HANDOVER.md`](./docs/PROJECT-HANDOVER.md)) |
| Product requirements | ⬜ Not started |
| Architecture approval | ⬜ Not started |
| Application implementation | ⬜ Not started |
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

**Not yet decided.** No framework, ORM, or hosting target has been selected. A
stack proposal is expected as part of the technical audit and architecture
milestone, and will be recorded in `docs/ARCHITECTURE-PROPOSAL.md` once approved.

For reference, the *inherited* system used PHP 8, MySQL/MariaDB, Tailwind CSS
(via CDN), and Font Awesome. Those are facts about the inherited code, not a
decision about this project.

---

## Local setup

Not yet applicable — the repository currently contains documentation only. Setup
instructions will be added when the application scaffold is created.

---

## Documentation

| Document | Purpose |
| --- | --- |
| [`docs/PROJECT-HANDOVER.md`](./docs/PROJECT-HANDOVER.md) | Verified findings on the inherited system, licensing, and security review |
| [`docs/CONTINUATION-CHECKPOINT.md`](./docs/CONTINUATION-CHECKPOINT.md) | Where to pick up in the next session |
| [`docs/DEVELOPMENT-STATUS.md`](./docs/DEVELOPMENT-STATUS.md) | Running log of milestones |

Additional documents (`PRODUCT-REQUIREMENTS.md`, `ARCHITECTURE-PROPOSAL.md`,
`PROJECT-AUDIT.md`, `UI-UX-DESIGN-SYSTEM.md`, `IMPLEMENTATION-ROADMAP.md`) will be
created as those phases are actually performed — not as empty placeholders.

---

## Contributing

Development is AI-assisted and owner-driven. See
[`docs/CONTINUATION-CHECKPOINT.md`](./docs/CONTINUATION-CHECKPOINT.md) before
starting work, and update the checkpoint when finishing.
