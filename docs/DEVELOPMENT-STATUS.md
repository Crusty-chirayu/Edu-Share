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

**Status: AWAITING OWNER.** No implementation work may begin until this gate passes.
Silence is not approval: unanswered decisions keep their recorded provisional defaults.

## M3+ — Implementation

**Status: NOT STARTED.** Blocked on M2. Nothing in the roadmap below `M1` is complete.
