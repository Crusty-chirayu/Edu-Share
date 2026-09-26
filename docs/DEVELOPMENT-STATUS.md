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

## M1 — Technical audit & architecture proposal

**Status: NOT STARTED**
**Type:** Documentation only. Owner approval required before any code.

Planned deliverables: `PROJECT-AUDIT.md`, `PRODUCT-REQUIREMENTS.md`,
`ARCHITECTURE-PROPOSAL.md`, `UI-UX-DESIGN-SYSTEM.md`, `IMPLEMENTATION-ROADMAP.md`.

## M2+ — Implementation

**Status: NOT STARTED.** Blocked on M1 approval.
