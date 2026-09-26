# IMPLEMENTATION ROADMAP — EDU-SHARE

| Field | Value |
| --- | --- |
| **Status** | Proposed plan — awaiting owner approval before any work begins |
| **Last reviewed** | 2026-09-26 |
| **Owner** | Chirayu Babu Jaysawal |
| **Milestones** | `M0`–`M11` |
| **Related** | [PROJECT-AUDIT.md](./PROJECT-AUDIT.md) · [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) · [ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md) · [UI-UX-DESIGN-SYSTEM.md](./UI-UX-DESIGN-SYSTEM.md) |

> **No milestone below M1 is complete.** M2 has not been approved, M3 has not been
> started, and nothing in this document describes existing software.

---

## 1. Purpose and how to read this plan

This is the phased plan for turning a repository that currently contains
documentation only into a working, demonstrable, deployable platform — built by one
student developer working with AI assistance, on free or near-free services.

Each milestone specifies **objective, prerequisites, scope, deliverables,
acceptance criteria, required tests, manual verification, security considerations,
risks, and completion evidence.** A milestone is *complete* only when its evidence
exists; a milestone is *not* complete because its code was written.

### 1.1 The three kinds of milestone item

| Kind | Meaning | Can it produce code? |
| --- | --- | --- |
| **Research** | Investigate and record a finding or a decision | No |
| **Approval gate** | Requires the owner to decide before the next phase starts | No — blocks |
| **Implementation** | Produces code, tests, or configuration | Yes |

### 1.2 The two rules that govern this plan

1. **Nothing unsafe may be presented as finished.** A stage gate exists at the end
   of every implementation milestone. If authentication, authorisation, database
   integrity, or file storage is incomplete or untested, the milestone does not
   pass and no later milestone may claim production readiness.
2. **Every milestone ends in a demonstrable state.** At the end of any milestone
   the project must build, pass its checks, and be deployable — even if small.

## 2. Milestone map

| ID | Milestone | Type | Status |
| --- | --- | --- | --- |
| **M0** | Repository establishment and inherited-project handover | Documentation | ✅ **Complete** |
| **M1** | Technical audit, product definition, architecture, design system, roadmap | Documentation | 🔄 **In progress — this document** |
| **M2** | Owner review and architecture approval | Approval gate | ⛔ Blocked on owner |
| **M3** | Project foundation and development environment | Implementation | ⬜ Not started |
| **M4** | Design system and application shell | Implementation | ⬜ Not started |
| **M5** | Authentication, accounts and authorisation | Implementation | ⬜ Not started |
| **M6** | Academic taxonomy and catalogue administration | Implementation | ⬜ Not started |
| **M7** | Resource upload, storage and authorised download | Implementation | ⬜ Not started |
| **M8** | Search, discovery, and personal library | Implementation | ⬜ Not started |
| **M9** | Reporting, moderation and content governance | Implementation | ⬜ Not started |
| **M10** | Security review, accessibility audit and performance validation | Verification | ⬜ Not started |
| **M11** | Deployment, documentation and release readiness | Release | ⬜ Not started |

### 2.1 Critical path

```
M0 ✅ ──> M1 🔄 ──(owner)──> M2 ──> M3 ──> M4 ──> M5 ──> M6 ──> M7 ──> M8 ──> M9 ──> M10 ──> M11
                                     │                              ▲
                                     └── M4 (design system) feeds ───┘  every later screen
```

`M3 → M5 → M7` is the hard spine: without a runtime, an identity, and a safe file
path there is no product. `M4` can overlap `M5`; `M6` and `M7` are partly parallel
once `M5` lands; `M9` must follow `M7` because there is nothing to moderate before
resources exist.

### 2.2 What must stay sequential, and what may run in parallel

| Sequential (cannot be reordered) | Parallelisable |
| --- | --- |
| `M3` before everything — no runtime, no work | `M4` design tokens ↔ `M5` auth data model |
| `M5` before `M6`/`M7` — every write needs an identity | `M6` taxonomy UI ↔ `M7` storage plumbing (independent modules) |
| `M7` before `M9` — nothing to moderate yet | `M8` search ↔ `M9` reporting schema |
| `M10` after `M7` — you cannot review a flow that does not exist | Documentation throughout — never a separate phase at the end |

## 3. Documented dependency decisions

These are the sequencing rules that earlier failures make necessary. Each one is
traceable to an audit finding or a requirement.

| # | Rule | Why | Source |
| --- | --- | --- | --- |
| S1 | The database schema is designed and migrated **before** the feature that writes to it | The inherited schema was grown by whichever page wrote to it, producing two representations of the same field | [AUD-009](./PROJECT-AUDIT.md) |
| S2 | Authorisation helpers are written **before** the first protected route | The inherited app authenticated in one place and authorised nowhere | [AUD-002](./PROJECT-AUDIT.md), [AUD-016](./PROJECT-AUDIT.md) |
| S3 | The storage abstraction is written **before** the upload UI | The inherited app wrote files into the web root and served them by path | [AUD-007](./PROJECT-AUDIT.md) |
| S4 | Anti-CSRF handling is part of the form primitive, not added per form later | Adding it later means auditing every form again | [AUD-004](./PROJECT-AUDIT.md) |
| S5 | Design tokens exist before the first screen | Retrofitting tokens across fifteen screens is how products end up inconsistent | [PROJECT-AUDIT.md](./PROJECT-AUDIT.md) §8 |
| S6 | The seed/test dataset is built in `M3`, not improvised per test | Every later integration test depends on a realistic taxonomy | `M6`, `M8` |
## 4. M0 — Repository establishment and inherited-project handover

**Type:** Documentation and source control. **Status: ✅ COMPLETE (verified).**

| Field | Content |
| --- | --- |
| **Objective** | Create an independent, owner-controlled repository and establish verified facts about the inherited application |
| **Prerequisites** | None |
| **Scope** | Source control setup, `.gitignore`, README, handover document, checkpoint |
| **Deliverables** | Independent Git repository at `E:\projects\edu-share-platform` tracking `origin/main`; `.gitignore`; rewritten `README.md`; `docs/PROJECT-HANDOVER.md`; `docs/CONTINUATION-CHECKPOINT.md`; `docs/DEVELOPMENT-STATUS.md` |
| **Acceptance criteria** | Repository is private, not a fork, default branch `main`; local `main` is level with `origin/main`; no inherited source, database dump, or secret is committed; working tree is clean |
| **Evidence** | Commit `200c465` present on `origin/main`; `git status` clean; GitHub reports `PRIVATE`, `isFork: false`, default branch `main` |
| **Security considerations** | The inherited `project.sql` (personal data plus password hashes) is git-ignored. No inherited code is vendored, because it carries no licence |
| **Risks** | The parent directory `E:\projects` is itself a Git repository with zero commits, so a careless `git` invocation targets the wrong repository. Recorded in the checkpoint as a standing hazard |

## 5. M1 — Technical audit, product definition, architecture, design system

**Type:** Documentation. **Status: 🔄 IN PROGRESS (this milestone).**

| Field | Content |
| --- | --- |
| **Objective** | Produce the authoritative planning foundation: what is broken, what must be built, how it will be built, how it will look, and in what order |
| **Prerequisites** | M0 |
| **Scope** | Five documents, plus updated checkpoint and status. No code |
| **Deliverables** | [`PROJECT-AUDIT.md`](./PROJECT-AUDIT.md), [`PRODUCT-REQUIREMENTS.md`](./PRODUCT-REQUIREMENTS.md), [`ARCHITECTURE-PROPOSAL.md`](./ARCHITECTURE-PROPOSAL.md), [`UI-UX-DESIGN-SYSTEM.md`](./UI-UX-DESIGN-SYSTEM.md), [`IMPLEMENTATION-ROADMAP.md`](./IMPLEMENTATION-ROADMAP.md) |
| **Acceptance criteria** | Every audit finding is severity-ranked and labelled VERIFIED / REPORTED / INFERRED / UNKNOWN; every requirement has an ID, priority and acceptance criteria; the architecture names one recommendation and its trade-offs; the design system defines tokens; the roadmap has stage gates. No application code, dependency, or secret is introduced |
| **Required automated tests** | None — but the repository is checked for accidental secrets and for the absence of source files |
| **Manual verification** | Cross-document consistency review; relative links resolve; no PII or credential appears anywhere |
| **Security considerations** | The audit must describe risk without reproducing personal data or credentials |
| **Risks** | Scope creep into design work that belongs to M4. Mitigated by keeping this milestone at the level of tokens and specifications rather than components |
| **Completion evidence** | The five documents exist with substantive content, are committed, and the repository build/check state is unchanged (still documentation-only) |
| **Explicit exit condition** | **Stop and request owner approval.** Do not scaffold an application |

## 6. M2 — Owner review and architecture approval

**Type:** Approval gate. **Status: ⛔ BLOCKED on the owner.**

| Field | Content |
| --- | --- |
| **Objective** | Obtain explicit approval of the stack, the MVP scope, the role model, the content policy, and the hosting posture |
| **Prerequisites** | M1 complete |
| **Scope** | Reading the five documents; answering the `D-nnn` decisions in [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) §11 and [ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md) §10 |
| **Deliverables** | A recorded decision for every blocking decision, written into the checkpoint; a single approved stack |
| **Acceptance criteria** | No blocking `D-nnn` decision remains unanswered; the owner has stated which of the three architecture options is approved (or asked for a revision) |
| **Dependencies** | Nothing downstream may start before this gate passes |
| **Risks** | Silence. **Silence is not approval.** If a decision is not answered, the *provisional* assumption recorded in the requirements stands, and the milestone records that it is provisional |
| **Completion evidence** | The owner's answers, recorded in `docs/CONTINUATION-CHECKPOINT.md`, with a date |

> **A prepared decision brief is in [DECISION-BRIEF.md](./DECISION-BRIEF.md)**: the options,
> the trade-offs, the costs re-verified on 2026-09-26, a recommended default for each of the
> twelve decisions, and a copy-pasteable answer block. It exists so that `M2` costs the owner
> one reading rather than five.

### 6.1 Proposed default answers if the owner does not respond

These are the **[ASSUMPTION]** defaults this plan proceeds on. They are chosen to be
cheap to reverse and safe if wrong.

| Decision | Provisional default |
| --- | --- |
| `D-001` Architecture | Option A — integrated full-stack TypeScript |
| `D-002` Database | Managed PostgreSQL with a documented Docker fallback |
| `D-003` AI scope | Out of MVP; designed for later, not built now |
| `D-004` Content policy | Uploads visible immediately, with reporting and a takedown path (post-moderation) |
| `D-005` Hosting | Free tiers, with the app kept portable to a container host |

---

## 7. M3 — Project foundation and development environment

**Type:** Implementation. **Status: ⬜ Not started.**

| Field | Content |
| --- | --- |
| **Objective** | A repository that builds, runs, type-checks, lints, tests, and migrates a database, with **no product features yet** |
| **Prerequisites** | `M2` approved; `D-001`, `D-002` answered |
| **Scope** | Application scaffold; strict TypeScript; lint and format configuration; environment-variable schema with fail-fast validation; database connection; migration tool with a first reversible migration; local PostgreSQL via container; seed script; test runners (unit, integration, end-to-end) wired but nearly empty; CI workflow on pull request; structured logger; error boundary; health endpoint |
| **Deliverables** | A running application; the scripts `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `test:e2e`, `db:migrate`, `db:seed`; a committed `.env.example` containing **placeholder names only**; a recorded ADR for the stack; README local-setup steps that actually work; a green CI workflow |
| **Acceptance criteria** | A fresh clone reaches a running app connected to a migrated database by following documented steps alone; the production build succeeds; a migration can be applied and **reversed**; CI fails on a type error, a lint error, or a failing test; `.env` is git-ignored and no secret is committed; the app starts with a clear error message when a required variable is missing |
| **Required automated tests** | Boot smoke test; database-connectivity test; migration up-then-down test against a disposable database |
| **Manual verification** | Perform the documented setup on a clean checkout. Deliberately break a required environment variable and confirm the failure is explicit, not a stack trace |
| **Security considerations** | Environment validation fails closed; no default or fallback credentials; production builds disable debug output and stack traces; a dependency-audit step runs in CI; the database port is not exposed publicly in development beyond `localhost` |
| **Risks** | Tooling churn — mitigated by pinning exact versions and committing the lockfile. Container runtime unavailable on the developer's machine — mitigated by a documented managed-database fallback for local development |
| **Completion evidence** | CI run log; the exact dependency versions recorded in the README; a screenshot of the running app and a successful migration output |

**Stage gate M3.** No feature work may begin until a fresh clone builds and tests
from documentation alone, and the migration reverses cleanly.

## 8. M4 — Design system and application shell

**Type:** Implementation. **Status: ⬜ Not started.**

| Field | Content |
| --- | --- |
| **Objective** | Turn [UI-UX-DESIGN-SYSTEM.md](./UI-UX-DESIGN-SYSTEM.md) from a proposal into implemented tokens and primitives, and build the shell so later screens are **assembled, not invented** |
| **Prerequisites** | `M3` |
| **Scope** | Design tokens (colour, space, type, radius, shadow, motion) as CSS custom properties in light and dark; base primitives — Button, Link, Field/Label/Error, Input, Textarea, Select, Combobox, Checkbox/Radio, Card, ResourceRow, IndexTabs, Badge, Dialog, Sheet, Toast, Skeleton, EmptyState, Pagination, Avatar, FileType icon; the application shell (top bar, primary nav, mobile tab bar, index tabs, footer); the form primitive wired once for request forgery protection; a `/design` reference route rendering every primitive in every state |
| **Deliverables** | A token file; the primitive set; shell layouts; the `/design` reference route; a documented primitive catalogue with states and accessibility notes; a visual baseline for regression comparison |
| **Acceptance criteria** | Zero hardcoded colour values outside the token file, enforced by lint; every primitive renders its default, hover, focus, active, disabled, loading, error and empty states where applicable; light and dark themes both complete; every interactive primitive is reachable and operable by keyboard alone; text contrast meets the §6.6 targets; `prefers-reduced-motion` is honoured; the inaccessible patterns from AUD-021 are absent |
| **Required automated tests** | Component render tests per primitive state; the lint check for hardcoded colour; an automated accessibility scan of the `/design` route; a visual-regression baseline |
| **Manual verification** | A keyboard-only pass through the design route; a screen-reader pass over the combobox and the dialog; a greyscale check that category meaning survives without colour |
| **Security considerations** | The form primitive is the **only** place request-forgery handling lives, so it cannot be forgotten per form (rule `S4`); no inline event handlers; no `dangerouslySetInnerHTML`; user-supplied strings are escaped by default |
| **Risks** | Building primitives against invented content produces a generic look. **Mitigation:** build `ResourceRow` and the listing surface first, against the seeded taxonomy from `M3`, and let real content drive the visual decisions |
| **Completion evidence** | Screenshot of the `/design` route in both themes; the accessibility scan report; the lint output showing the colour rule is active |

**Stage gate M4.** No product screen may be built until the tokens and primitives
exist, because a screen built before them is a screen that will be rebuilt.

## 9. M5 — Authentication, accounts and authorisation

**Type:** Implementation. **Status: ⬜ Not started.** Depends on `M3`, `M4`.

| Field | Content |
| --- | --- |
| **Objective** | An identity system that **cannot be self-elevated**, and an authorisation layer that is checked in one place. This is the milestone in which AUD-002 and AUD-015 are closed |
| **Prerequisites** | `M3` (runtime, migrations), `M4` (form and input primitives) |
| **Scope** | Registration; email verification (or a documented decision to defer it, with the consequence recorded); sign-in; sign-out; DB-backed sessions with rotation and both idle and absolute expiry; password reset by single-use emailed token; password policy (minimum length 12, no composition rules, optional breached-password check); rate limiting and lockout with backoff; deliberately generic error messaging; request-forgery protection on every mutation; `requireUser` / `requireRole` helpers and a single `can()` policy module; audit logging of authentication events; profile view and edit; account deactivation and purge |
| **Deliverables** | Auth routes; session store; policy module; profile screens; audit-event writes; rate limiter; the auth test suite |
| **Acceptance criteria** | No request can obtain `moderator` or `admin`; an unverified account cannot publish; sign-out invalidates the server-side session immediately, not at expiry; cookies are `HttpOnly`, `Secure`, and `SameSite`; failed sign-ins return an identical response for unknown email and wrong password; repeated failures trigger backoff; every mutating route rejects a missing, expired, or foreign request token; reset tokens are single-use, hashed at rest, and expire within 30 minutes; passwords are never logged or returned |
| **Required automated tests** | **Authorisation matrix** (every role × every protected route, allow **and** deny); session fixation; session-expiry; request-forgery rejection; lockout and backoff; reset-token reuse; a hashing test asserting the stored value is not the password and that the cost parameter is set |
| **Manual verification** | Register and sign in on both a phone and a desktop; attempt privilege escalation by tampering with request payloads and confirm failure; sign out in one tab and confirm another tab is signed out; attempt a reset-token reuse |
| **Security considerations** | No client-side-only checks; roles are never read from request input; every privileged action is audit-logged; the session cookie configuration is recorded as evidence rather than assumed; password-reset responses do not reveal whether an address exists |
| **Risks** | Email deliverability on free tiers. **Mitigation:** verification can be disabled behind a documented flag, and the security trade-off is written down — never silently skipped |
| **Completion evidence** | Authorisation-matrix test output; screenshots or recordings of each flow; the recorded cookie attributes; the audit log showing a sign-in event |

**Stage gate M5.** Authentication and the authorisation matrix must both pass before
any `M6` or `M7` work is presented as progress. A feature built on an unverified
identity system is a feature that will be rebuilt.

## 10. M6 — Academic taxonomy and catalogue administration

**Type:** Implementation. **Status: ⬜ Not started.** Depends on `M5`.

| Field | Content |
| --- | --- |
| **Objective** | A curated, institution-scoped taxonomy that makes AUD-009 and AUD-010 impossible by construction |
| **Prerequisites** | `M5` (admin role exists and is enforced) |
| **Scope** | Institutions, departments, programmes, semesters, subjects, and the category vocabulary; admin CRUD; typeahead search before creating anything; rename and merge; a user-submitted "add my institution" request flow with moderation; slug generation with uniqueness scoped to the parent; soft deletion that is blocked while resources reference the record; a starter seed catalogue |
| **Deliverables** | Catalogue schema and migrations; admin screens; typeahead endpoints; the taxonomy test suite; the seed catalogue |
| **Acceptance criteria** | **Two institutions may each hold a programme with the same name** — the direct regression test for AUD-010; duplicate subject names within one programme and semester are rejected; a programme referenced by a resource cannot be deleted; taxonomy mutations are admin-only, rejected for moderators and users; every mutation is audit-logged; the browse tree renders from a bounded number of queries (asserted, not assumed); all rendered names are escaped |
| **Required automated tests** | Unique-constraint tests at each scope; foreign-key `RESTRICT` deletion tests; integration test creating identically named programmes at two institutions; authorisation tests for every taxonomy mutation; slug-collision tests; a query-count assertion for the browse tree |
| **Manual verification** | Build one institution, department, programme, semester, and subject by hand; attempt every illegal duplicate; attempt to delete an in-use programme and confirm a clear, non-technical refusal |
| **Security considerations** | Mass-assignment prevention on every create and update; admin-only writes enforced server-side; audit trail on rename and delete, because taxonomy changes affect existing resources |
| **Risks** | Taxonomy sprawl from near-duplicate entries. **Mitigation:** the create flow forces a typeahead search first and reports "did you mean" candidates before allowing a new record |
| **Completion evidence** | Test output including the cross-institution duplicate assertion; screenshot of the admin catalogue; the audit log for a rename |

## 11. M7 — Resource upload, storage and authorised download

**Type:** Implementation. **Status: ⬜ Not started.** Depends on `M5`, `M6`.

| Field | Content |
| --- | --- |
| **Objective** | Files stored privately, validated on the server, and served only to a user who is authorised to receive them. **This is the milestone in which AUD-001, AUD-007 and AUD-008 are closed** |
| **Prerequisites** | `M5` (identity, policy module), `M6` (a subject to file a resource under) |
| **Scope** | Two-phase upload (initiate → upload directly to the private bucket with a short-lived, single-key credential → complete); a storage interface with at least one real implementation and one in-memory implementation for tests; size limits per file and per user; validation of declared type, sniffed type, extension against an allow-list, and a blocking of executable formats; randomised storage keys; a stored content hash; a resource record with a `pending → active` lifecycle; a scheduled job that removes abandoned uploads; an authorised download route that streams or redirects, with `Content-Disposition: attachment`; delete and replace flows for the owner; download counters; access logging |
| **Deliverables** | Storage interface plus implementations; upload endpoints; validation module with its own test matrix; download route; the quarantined-upload cleanup job; the resource detail and upload screens' data contracts |
| **Acceptance criteria** | A stored object fetched directly from the bucket URL **without** authorisation is refused — asserted by test; another user's private resource returns **not found**, not forbidden; a `.php` file renamed to `.pdf` is rejected and its object removed; a 30 MB upload is rejected before any object is stored; a filename containing `../` is stored as metadata but **never** used to construct a storage key or a filesystem path; an abandoned upload is removed by the scheduled job within its window; every download writes an access-log entry naming the actor, the resource and the time; no user-supplied string reaches a filesystem path |
| **Required automated tests** | Upload validation matrix (extension × declared MIME × sniffed bytes × size); download authorisation matrix (guest/user/owner/moderator/admin × public/institution/private/hidden); signed-credential expiry; orphan-cleanup; the 404-instead-of-403 behaviour; per-user quota; a path-traversal test using adversarial filenames; a full create-download-delete lifecycle test |
| **Manual verification** | Copy a stored object's URL out of the bucket and try to open it unauthenticated; upload a file whose extension lies about its contents; interrupt an upload and confirm the abandoned object is later removed; open a PDF inline and confirm the download response always sets `attachment` |
| **Security considerations** | **A short-lived signed URL is not authorisation.** Authorisation is decided *before* any credential is issued, and the credential is scoped to one key for a minimal lifetime. Byte streams are never served from a public directory; there is no code path in which a request parameter becomes part of a storage path; hidden and private resources are indistinguishable from non-existent ones to unauthorised callers |
| **Risks** | **Malware scanning is not available on free tiers.** Compensating controls, all mandatory: a document-only allow-list, forced `attachment` disposition, `application/octet-stream` for any format that can execute, no inline rendering of HTML or SVG, and a user-visible caution on the download screen. Documented as its own decision (`D-007`) rather than quietly omitted. Also: free-tier storage and egress ceilings — mitigate with a per-user quota and a stored byte count per resource |
| **Completion evidence** | The unauthenticated-access test output; the authorisation-matrix output; a log of an expired credential being refused; the cleanup job's log; the recorded per-file and per-user limits |

**Stage gate M7.** If the unauthenticated-access test or the download authorisation
matrix does not pass, the milestone has not been reached, and no later milestone may
describe files as securely stored.

## 12. M8 — Search, discovery and the personal library

**Type:** Implementation. **Status: ⬜ Not started.** Depends on `M7`.

| Field | Content |
| --- | --- |
| **Objective** | A student finds the right resource without knowing its exact name, and keeps what they find. This delivers PR-01's core loop and PR-03's library |
| **Prerequisites** | `M7` (resources must exist to be found) |
| **Scope** | Browse journeys (institution → programme → semester → subject); ranked full-text search over title, description, subject and institution; trigram fallback for misspellings; filters for institution, programme, semester, subject, category and format; sorting by relevance, recency and downloads; keyset pagination; save and unsave; the personal library with its own filters and sort; public contributor profiles; and empty, loading and error states for every one of these surfaces |
| **Deliverables** | Browse routes; the ranked search route; a filter contract shared between browse and search; save endpoints; the library screen; the contributor profile screen; search test fixtures |
| **Acceptance criteria** | A misspelled subject query still returns that subject's resources, or the interface states clearly that it cannot; every listing filters by visibility **in the query**, so a private or hidden resource never appears; the same query returns a stable order with no duplicates and no skipped rows across pages **while new resources are inserted**; a signed-out visitor can browse and search; saving takes one action and survives a reload; a brand-new account sees a correct empty library; no listing issues a query per row (asserted by query count) |
| **Required automated tests** | Ranking sanity — a title match outranks a description match; typo tolerance; filter-combination correctness; keyset-pagination stability under concurrent inserts; visibility-leak tests across browse, search, library **and** profile; save idempotency; a query-count assertion for browse and library |
| **Manual verification** | Search a subject name misspelled deliberately; apply three filters at once and confirm the count matches the rows; page to the end of a result set and back; save an item, sign out, sign in, and confirm it persists |
| **Security considerations** | Visibility filtering happens in the query, never after fetching; search terms are parameterised and never concatenated; result counts must not reveal the existence of hidden or private resources |
| **Risks** | **Unbounded result pages** waste bandwidth and free-tier egress — mitigated by keyset pagination with a hard page cap. **Relevance that degenerates into "newest first"** undermines the product — mitigated by the ranking test above |
| **Completion evidence** | Query-count output; visibility-leak test results; the pagination-stability output; screenshots of an empty library and a populated one |

## 13. M9 — Reporting, moderation and content governance

**Type:** Implementation. **Status: ⬜ Not started.** Depends on `M7`, `M8`.

| Field | Content |
| --- | --- |
| **Objective** | Make the platform defensible: a user can report, a moderator can act quickly and reversibly, and every action is recorded |
| **Prerequisites** | `M7` (resources exist), `M8` (surfaces that must react to hiding) |
| **Scope** | Report submission with a controlled reason and optional detail; a moderator queue with context; hide and restore; resolve and dismiss with a required reason; permanent deletion (admin only); user restriction and reinstatement; the audit log and its viewer; the policy pages (acceptable use, copyright and takedown, privacy); a documented takedown runbook that can be executed by hand within a stated window; notification emails for moderation outcomes |
| **Deliverables** | `reports`, `moderation_actions` and `audit_events` tables with migrations; the report endpoint; moderation screens; the audit viewer; three policy pages; the takedown runbook committed to `docs/` |
| **Acceptance criteria** | A report requires a reason from the controlled list; the reported contributor is **never** shown who reported them, or that they were reported at all; hiding takes one action and the resource immediately disappears from browse, search, the library and the contributor profile — asserted by test; restoring reverses it fully; permanent deletion is refused for a moderator and permitted for an admin — asserted by test; every moderation action records actor, target, reason and timestamp; the same user cannot inflate the queue by reporting the same resource repeatedly; the policy pages are reachable **without authentication** and are linked from the resource detail and upload screens |
| **Required automated tests** | Authorisation matrix for every moderation action; hide-then-verify-absence across all four surfaces; restore reversal; duplicate-report handling; audit-record completeness; guest reachability of the policy pages |
| **Manual verification** | Report a resource from one account, act on it as a moderator, and confirm the reporter's identity is not disclosed to the contributor; restore it and confirm it reappears; attempt a permanent delete as a moderator and confirm refusal; confirm the audit view shows both actions |
| **Security considerations** | Reporter anonymity is a **data-protection requirement, not a preference**; destructive moderation is admin-scoped; the audit trail is append-only from the application's perspective; the runbook states the response window the owner commits to |
| **Risks** | **A moderation queue nobody reads is worse than no queue**, because users believe reports are handled. Mitigation: the owner is a named recipient of a notification for every new report, and the runbook states a response window. Also: a takedown request arriving by email has no route into the product — mitigated by the runbook, which is written **before** it is first needed |
| **Completion evidence** | The four-surface absence test output; audit records for a hide and a restore; the policy page URLs; the takedown runbook in `docs/` |

**Stage gate M9.** Moderation may not be described as available until reporter
anonymity, hide-then-absence and the audit record are all demonstrated.

## 14. M10 — Security review, accessibility audit and performance validation

**Type:** Verification. **Status: ⬜ Not started.** Depends on `M9`.

| Field | Content |
| --- | --- |
| **Objective** | Attack the finished system on purpose, and prove the accessibility and performance claims instead of asserting them |
| **Prerequisites** | `M9`, and every stage gate `M3`–`M9` passed |
| **Scope** | A structured self-review against the audit findings; a manual authorisation sweep of every route; upload and download security testing; dependency auditing; configured security headers; a keyboard and screen-reader pass on every screen; contrast verification with a tool; a Lighthouse run on the primary journeys; a load sanity check at a stated scale; a review of logging and of what personal data is retained |
| **Deliverables** | `docs/SECURITY-REVIEW.md` with findings and resolutions; an accessibility audit report; a performance report; the defects found, fixed |
| **Acceptance criteria** | Every audit defect class (AUD-001 … AUD-008) is demonstrated absent by a specific check; no route is reachable without its authorisation check, verified by iterating the **actual** route list rather than a remembered one; security headers are present and configured; no outstanding high-severity dependency advisory, or one is documented with a compensating rationale; every screen is operable by keyboard; automated accessibility checks report no critical or serious issue on the primary journeys; the performance targets in [UI-UX-DESIGN-SYSTEM.md](./UI-UX-DESIGN-SYSTEM.md) §10.3 are measured and recorded, and every miss is written down with its cause |
| **Required automated tests** | The whole suite from `M3`–`M9` green in CI; an automated accessibility scan in CI on the primary journeys; a dependency-audit step that fails on a high-severity advisory |
| **Manual verification** | Attempt every protected route as a guest, as a different signed-in user, and as a moderator, recording the outcome for each; attempt to fetch a stored object directly; complete three journeys using only the keyboard; read one full journey with a screen reader |
| **Security considerations** | This milestone exists because the earlier ones were built by the same person who audits them. The review is therefore structured as a **route-by-route checklist against the policy matrix**, not as an open-ended exploratory pass |
| **Risks** | Self-review bias — mitigated by the route-by-route checklist. An accessibility claim made without tooling is worthless — mitigated by requiring tool output as evidence. Performance measured only on the developer's machine misleads — mitigated by a throttled profile with the conditions recorded |
| **Completion evidence** | The three reports, each naming what was checked, how, and the result; CI logs; the measured performance figures with their conditions |

**Stage gate M10.** No release may be called production-ready while any critical or
high-severity finding from this milestone is open. A known issue is acceptable only
where it is written down, assigned, and shown not to expose user data.

## 15. M11 — Deployment, documentation and release readiness

**Type:** Release. **Status: ⬜ Not started.** Depends on `M10`.

| Field | Content |
| --- | --- |
| **Objective** | Put the platform in front of real users, with a documented way to operate it, recover it, and take content down safely |
| **Prerequisites** | `M10` passed |
| **Scope** | A production environment with its own credentials; a custom domain; migrations applied to production in a rehearsed way; **a backup taken and restored once, for real**; quota monitoring and alerting; a documented rollback procedure; the operator runbook (deploy, roll back, restore, respond to a takedown, grant a moderator); a demonstration script; policy pages reviewed against the built system's actual behaviour; a seeded starter catalogue |
| **Deliverables** | A live production deployment; `docs/OPERATIONS.md` (runbook including the takedown procedure); `docs/DEMO.md` (a 10-minute demonstration script); a README with real local-setup and deployment instructions; a completed release checklist stored in the repository |
| **Acceptance criteria** | A deployment is reproducible from the repository alone; migrations apply cleanly to a database that is **not** empty; a restore from backup has actually been performed and its result verified; a moderator can be granted in production by an administrator; storage and database usage are visible to the operator; a rollback to the previous release is rehearsed; the demo script runs end to end on a clean account, on a phone, without a developer's help |
| **Required automated tests** | A post-deployment smoke test covering sign in, browse, search, upload, download and report — run against production after every release |
| **Manual verification** | Execute the demo script on a real phone on mobile data; execute one rollback; execute one restore; grant a moderator and confirm the new privileges |
| **Security considerations** | Production credentials exist only in the platform's environment configuration, never in the repository; debug output is off; the first administrator account is created by a **documented one-time, non-public procedure**, never by a self-registration path; the deployment records the exact commit that is live |
| **Risks** | **Cost surprise from exceeding a free tier** — mitigated by monitoring configured *before* launch, plus the quota work in `M7`. **Backups that have never been restored are not backups** — mitigated by making the restore a required acceptance criterion rather than a recommendation. **Launching with no moderation capacity** — mitigated by deciding the response window in advance and writing it into the runbook |
| **Completion evidence** | The production URL with its deployed commit recorded; the restore log; the rollback log; the completed release checklist; the passed smoke test; the demo completed without developer intervention |

**Stage gate M11.** The project may be described as released only when the
post-deployment smoke test has passed **and** a restore has been performed.

---

## 16. Testing and quality strategy

### 16.1 The gates, and when each becomes relevant

A gate is only useful if it blocks something. "Relevant from" states the first
milestone in which failing this gate must stop work.

| # | Gate | Relevant from | Blocks what |
| --- | --- | --- | --- |
| G1 | Type checks pass with no suppression comments | `M3` | Any merge |
| G2 | Lint passes, including the no-hardcoded-colour and no-`any` rules | `M3` / `M4` | Any merge |
| G3 | Build succeeds for production | `M3` | Any deploy |
| G4 | Unit tests pass | `M3` | Any merge |
| G5 | Integration tests pass against a real database | `M3` | Any merge |
| G6 | Migrations apply **and** reverse | `M3` | Any deploy |
| G7 | **Authorisation matrix** passes for every role × every protected route | `M5` | Any route being added. This is the gate that replaces AUD-002 |
| G8 | Upload-validation and download-authorisation matrices pass | `M7` | Any release. This is the gate that replaces AUD-001/007/008 |
| G9 | Database-integrity tests pass (scoped uniqueness, `RESTRICT` deletion) | `M6` | Any taxonomy change |
| G10 | End-to-end tests cover the five primary journeys | `M8` | Any release |
| G11 | Accessibility checks pass on the primary journeys | `M4`, enforced from `M10` | Any release |
| G12 | Dependency audit shows no unresolved high-severity advisory | `M10` | Any release |
| G13 | Post-deployment smoke test passes | `M11` | Any release being announced |

**Gate G7 deserves emphasis.** It is the only gate that can be written once and then
protects every future route automatically, because the test iterates the actual route
list rather than a remembered one.

### 16.2 The test layering

| Layer | What it tests | Written with | Runs |
| --- | --- | --- | --- |
| **Unit** | Pure logic: validation schemas, slug generation, ranking assembly, policy decisions in isolation | The project's unit runner | On every save, and in CI |
| **Integration** | Real database, real migrations, real queries: uniqueness scopes, `RESTRICT` deletion, keyset pagination, save idempotency, quota accounting | The unit runner + a disposable PostgreSQL container | In CI on every push |
| **Authorisation** | The full role × route matrix, allow **and** deny, with a private resource returning not-found | The unit runner + a seeded fixture | In CI, and mandatory before any route merges |
| **Storage security** | The upload-validation matrix, the download-authorisation matrix, signed-credential expiry, path-traversal filenames, orphan cleanup | The unit runner + an in-memory `ObjectStore` | In CI |
| **End-to-end** | The five primary journeys in a real browser, on a mobile viewport: browse-to-download as a guest, register-to-verify, upload-to-published, save-to-library, report-to-takedown | A browser automation runner | In CI nightly, and before release |
| **Accessibility** | Automated scan of the design reference route and each primary journey | An automated accessibility checker | In CI |
| **Performance** | The targets in [UI-UX-DESIGN-SYSTEM.md](./UI-UX-DESIGN-SYSTEM.md) §10.3, on a throttled profile | Lighthouse | In `M10`, then before each release |
| **Smoke** | Sign in, browse, search, upload, download, report — against the deployed environment | A short script | After every deploy |

### 16.3 What is deliberately not tested, and why

| Not tested | Reason |
| --- | --- |
| Third-party service internals (the managed database, the object store) | They are not our code; we test our integration with them through the storage interface's real implementation, exercised manually |
| Exhaustive visual regression across every screen | High maintenance for a solo developer; the baseline covers primitives, and `M10` catches the rest by hand |
| Load testing beyond a sanity check | There is no traffic to model honestly; publishing invented load numbers would be worse than having none |
| Every browser version | The supported list is stated, and the two engines that cover it are tested |

### 16.4 Coverage policy

Coverage percentage is **not** a gate, because a number can be met by testing trivial
code. The gates are the behavioural ones above: the authorisation matrix, the upload
validation matrix, the download authorisation matrix, and the five end-to-end
journeys. Coverage is reported for information only, with one exception — **the policy
module and the validation schemas are required to be exhaustively tested**, because
they are the two places where a gap becomes a security hole.

---

## 17. CI/CD approach

### 17.1 The pipeline, as designed (not built)

| Stage | Runs | Blocks the pull request when |
| --- | --- | --- |
| **Install** | Dependency install from the committed lockfile | The lockfile does not match the manifest |
| **Static** | Type check, lint, format check | Any error, or any type-suppression comment |
| **Database** | Start a disposable PostgreSQL, apply all migrations, apply them in reverse, apply again | A migration fails forward or backward (gate `G6`) |
| **Test** | Unit, integration, authorisation matrix, storage-security matrices | Any failure (gates `G4`, `G5`, `G7`, `G8`, `G9`) |
| **Build** | Production build | The build fails (gate `G3`) |
| **Accessibility** | Automated scan of the design route and primary journeys | A critical or serious issue appears (gate `G11`) |
| **Audit** | Dependency advisory check | A high-severity advisory is unresolved (gate `G12`) |
| **Preview** | Deploy a preview environment per pull request | Deployment fails |

**Design decisions worth stating.**

- **The migration reversal runs on every pull request**, not only at release time.
  Rollback is a capability that has to be exercised to remain real.
- **End-to-end tests run nightly rather than per-pull-request**, because they are the
  slowest suite and their failures are rarely caused by the change under review. They
  still block a release.
- **No secrets are required by the test suite.** Integration tests run against a
  containerised database with throwaway credentials, so a contributor never needs
  production credentials to run the tests.
- **The pipeline never deploys from a developer's machine.** Production deploys happen
  from a tagged commit in the main branch.

### 17.2 Branch and release workflow

| Step | Rule |
| --- | --- |
| Work | A short-lived branch per change, with a descriptive name |
| Merge | Only through a pull request with the pipeline green |
| Main | Always deployable; if main is ever broken, restoring it takes priority over any feature |
| Release | A version tag on a commit whose pipeline is green, then a deploy of that tag |
| Record | The deployed commit is recorded in the release checklist, so "what is live" is never a guess |

**Pinned versions everywhere.** Framework, runtime, database engine and every
dependency are pinned, and the lockfile is committed. For a project that will be
revisited after exam periods, an unpinned dependency is a future outage.

---

## 18. Release checklist and rollback

### 18.1 The release checklist

Every item must be answered before a release is announced. An unanswered item is a
"no".

| # | Check | Evidence |
| --- | --- | --- |
| 1 | All gates `G1`–`G13` green on the tagged commit | Pipeline log |
| 2 | Migrations applied to production, forward and reversible | Migration log |
| 3 | **Backup taken immediately before the release, and a restore verified at least once in this project** | Restore log |
| 4 | The previous release artefact is retained and can be redeployed | Retention confirmed |
| 5 | Post-deployment smoke test passed against production | Smoke-test output |
| 6 | Storage and database usage are within their free-tier allowances, with headroom | Quota screenshots |
| 7 | No open critical or high-severity finding from `M10` | Security review document |
| 8 | Policy pages match the built system's actual behaviour | Policy pages reviewed |
| 9 | The demo script completes on a phone without developer help | Demo performed |
| 10 | The deployed commit is recorded | Checklist entry |
| 11 | The release notes state what changed and what is still not built | Release notes |

### 18.2 Rollback

| Scenario | Action | Time target |
| --- | --- | --- |
| Bad front-end or server change, database unchanged | Redeploy the previous release | Under 10 minutes |
| A migration was applied and is wrong | Apply the migration's reverse, then redeploy the previous release | Under 30 minutes |
| Data corruption | Restore the pre-release backup and accept the loss of data created since | Under 60 minutes, with the data loss stated to affected users |
| A resource must be removed immediately | Hide it through the moderation interface — **no deploy required** | Under 5 minutes |
| The platform is being abused | Restrict the abusive accounts, then disable registration if needed, before considering a full shutdown | Under 15 minutes |

**The rule for rollback:** prefer the smallest action that stops the harm. Hiding one
resource, restricting one account, and disabling one feature are all preferable to
rolling back a release, and all three must be possible without a deploy.

### 18.3 What is explicitly out of scope for v1

Stated so that no later reader mistakes omission for oversight:

No uptime commitment, no disaster-recovery commitment, no penetration-test
certification, no data-processing agreement, no support commitment, and no compliance
certification of any kind. The platform is a student project operating in public, and
the honest position is that its guarantees are the ones written here and no others.

---

## 19. Cost and service limits

> Figures below were verified from official documentation on **2026-09-26**. Prices,
> free tiers and plan terms change without notice. **Re-check every figure before
> relying on it**, and treat a free tier as an allowance rather than an entitlement.

### 19.1 The services the MVP needs, and their documented free tiers

| Service | What it provides | Documented free allowance | Paid entry point |
| --- | --- | --- | --- |
| **Application hosting** | Runs the application | Vercel Hobby: 100 GB fast data transfer, 1 M function invocations, 4 CPU-hours active CPU, 360 GB-hours provisioned memory — **restricted to non-commercial, personal use** | Vercel Pro, or a container host |
| **Container hosting (alternative)** | Runs the same application as a long-lived server | Railway: 30-day trial with $5 credit, then $1/month. Render: $0 workspace with free instances carrying documented limitations | Railway Hobby $5/month; Render instances from $7/month |
| **Managed PostgreSQL** | The relational database | Neon: 100 compute-hours per project per month, **0.5 GB storage per project**, scale-to-zero after 5 minutes idle. Supabase: 500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly active users, **pauses after 1 week of inactivity** | Neon usage-based from $0.106/CU-hour; Supabase Pro from $25/month |
| **Object storage** | Stores uploaded documents | Cloudflare R2: **10 GB-month storage**, 1 M Class A and 10 M Class B operations per month, **egress free** | $0.015/GB-month plus operation charges |
| **Transactional email** | Verification, reset, moderation notices | Resend: 3,000 emails per month, 100 per day, 3 domains | $20/month |
| **Continuous integration** | Type check, lint, tests, migrations, build | GitHub Actions on a **private** repository: 2,000 minutes and 500 MB of storage per month on GitHub Free; a budget can be set to **stop usage** rather than bill it beyond that | Linux 2-core at $0.006/minute beyond the allowance |

### 19.2 The constraint that bites first

**Database storage is the smallest allowance on the list — 0.5 GB on Neon's free tier.**

This is workable **only** because uploaded documents live in object storage and the
database holds metadata alone. That split is not a preference in this project; it is
what makes the free tier viable. Its consequences:

| Consequence | Action |
| --- | --- |
| Every row must justify itself | No denormalised copies of data (design rule `R2`), no cache tables, no stored duplicates |
| Access and audit logs grow without bound | They need their own retention policy, decided at `M7` and recorded as `D-010` rather than assumed |
| Full-text vectors consume storage | Acceptable at MVP corpus size; the trigram index is the tighter constraint and is added deliberately |
| Growth must be visible | A storage figure forms part of the operator view (`NFR-SCA-04`) |

### 19.3 Resource constraints to watch, ranked by risk

| # | Constraint | Risk | Mitigation |
| --- | --- | --- | --- |
| 1 | Database storage (0.5 GB free tier) | **Highest** — reached silently | Monitor it; metadata-only storage; a log retention policy; the storage layer is portable, so a provider change is configuration |
| 2 | Object storage and operations (10 GB, 1 M writes) | Medium | A per-user upload quota (`M7`); a document corpus is small in bytes; the signed-URL flow avoids listing operations |
| 3 | Email volume (100 per day) | Medium | Transactional only (`FR-NOT-06`); a per-recipient daily ceiling; verification and reset are the only frequent messages |
| 4 | Serverless invocation limits and CPU-hours | Medium | Pages are server-rendered but cheap; no polling; no per-row queries (`NFR-PERF-05`) |
| 5 | Egress | **Low for storage** (object-storage egress is free), medium for hosting | Keep documents on the object store rather than through the hosting platform's bandwidth |
| 6 | Inactivity pausing on a free tier | Medium | Relevant only if that provider is chosen; `D-002` records the choice |
| 7 | AI inference | **Not applicable in v1** | AI is out of MVP scope (`ADR-005`); if introduced it gets its own cost ceiling |
| 8 | External search service | Not applicable in v1 | No external search engine (`ADR-004`) |
| 9 | Scheduled jobs on the chosen host | Medium | Railway's free plan includes cron jobs **during the trial only**, and scheduled invocations consume a hosting allowance on any free plan. Mitigation: the job is a **callable command triggered externally** — a scheduled GitHub Actions workflow (2,000 included minutes/month) or a Cloudflare Cron Trigger — rather than a platform feature assumed to exist |

### 19.4 A cost-conscious operating approach

1. **Start entirely on free tiers, with nothing paid enabled.** No service is
   subscribed to during development, and nothing in `M3`–`M10` requires a paid plan.
2. **Choose components so a provider change is a configuration change** — standard SQL
   over a standard connection string, standard object storage over standard credentials.
3. **Measure before optimising.** The operator view shows storage, database size and
   email volume, so a limit is seen approaching rather than after it is crossed.
4. **Set a spending ceiling before enabling anything paid.** If a paid tier is ever
   enabled, a spending limit and an alert are configured in the same session.
5. **Decide the retention policy deliberately.** Logs are the fastest-growing table;
   their retention is a decision (`D-010`), not a default.
6. **Resolve the hosting plan question before launch.** The free hosting plan is
   documented as non-commercial and personal use only. If the platform is ever
   monetised, or if the owner judges that a public student platform exceeds "personal
   use", that is `D-005` and it requires a paid plan or a container host — decided
   **before** launch, not discovered after.

### 19.5 What this project must not do

| Not done | Why |
| --- | --- |
| Assume a free tier is unlimited or permanent | Every figure above is documented as subject to change |
| Build a feature that requires a paid service to function | It would make the platform depend on a cost the owner has not agreed to |
| Publish invented cost or performance figures | Nothing here is a measurement; the tables above are citations with sources |
| Create any paid resource or subscription to "test" something | Nothing outside free tiers is to be enabled without the owner's explicit decision |

---

## 20. Consolidated risk register

Risks are rated by **likelihood × impact**, stated in words rather than a score. Each
has an owner decision or a mitigation, and none is left unaddressed.

| ID | Risk | Likelihood | Impact | Mitigation / owner |
| --- | --- | --- | --- | --- |
| R-01 | **The project never ships** because it is sequenced behind coursework | High | High | Milestones end in a demonstrable state; scope is guarded (§6.1 of the requirements); `M3`–`M7` is the shortest path to something real |
| R-02 | **Scope creep** — features added without removing any | High | High | The scope guard rule, requiring a recorded trade for every addition |
| R-03 | **A security hole of the AUD-001 class reappears** in new code | Medium | Critical | One policy module; no request parameter ever reaches a storage path; gates `G7` and `G8` |
| R-04 | **Free-tier limit silently exceeded** (database storage is the tightest) | Medium | High | Monitoring before launch; metadata-only database; retention policy `D-010` |
| R-05 | **Hosting plan terms do not permit the use case** | Medium | High | Resolved as `D-005` before launch; the application must also run on a container host |
| R-06 | **Malware in an uploaded document harms a user**, and no scanning is available on free tiers | Low | High | Compensating controls in `M7`; recorded as `D-007`, never omitted |
| R-07 | **A copyright complaint arrives and there is no process** | Medium | High | The takedown runbook in `M9`, executable without a deploy; a stated response window |
| R-08 | **The moderation queue is never read**, so reports are effectively ignored | Medium | Medium | Notifications to a named recipient; a response window in the runbook; a bounded queue |
| R-09 | **Library or framework churn** breaks the build months later | Medium | Medium | Pinned versions and a committed lockfile; CI runs on every change |
| R-10 | **Data loss** from a database or storage incident | Low | Critical | Backups enabled **and a restore rehearsed** (`NFR-BAK-02`); rollback rehearsed |
| R-11 | **Untested behaviour on a real phone** because development happens on a laptop | Medium | Medium | The demo script is executed on a phone on mobile data at `M11`; the performance budget is measured on a throttled profile |
| R-12 | **Accessibility claimed but not delivered**, because it is treated as a late audit | Medium | Medium | Tokens and components carry accessibility from `M4`; the automated scan is a CI gate, not a manual step |
| R-13 | **The single developer is unavailable** for an extended period | Medium | Medium | Documentation is the deliverable of every milestone, not a phase; the runbook assumes a returning operator with no memory of the code |
| R-14 | **Search quality is poor** and students cannot find anything | Medium | High | Ranking is tested (`M8`); typo tolerance is required; `ADR-004` states the condition for revisiting |
| R-15 | **A contributor's personal data appears inside an uploaded document** | Medium | High | A policy position (`POL-05`), a reporting reason, and a takedown path; data minimisation elsewhere so the exposure is bounded |

## 21. Stage gates summary

| Gate | Statement | Milestone |
| --- | --- | --- |
| **SG-0** | The repository is independent, private, and contains no inherited code, dump, or secret | `M0` ✅ |
| **SG-1** | Documentation exists and is internally consistent, with no code introduced | `M1` |
| **SG-2** | The owner has approved the architecture, the MVP scope, the role model, the policy posture and the hosting route | `M2` |
| **SG-3** | A clean clone builds, tests and migrates from documentation alone, and the migration reverses | `M3` |
| **SG-4** | Tokens and primitives exist, with no hardcoded values and light/dark parity | `M4` |
| **SG-5** | **The authorisation matrix passes for every route**, and a user cannot obtain a role by any request | `M5` |
| **SG-6** | Two institutions can hold identically named programmes, and referenced taxonomy cannot be deleted | `M6` |
| **SG-7** | **No stored object is reachable without authorisation**, and the upload-validation matrix passes | `M7` |
| **SG-8** | Search finds a misspelled subject, and no listing leaks a hidden or private resource | `M8` |
| **SG-9** | Hiding removes a resource from all four surfaces, reporter anonymity holds, and every moderation action is recorded | `M9` |
| **SG-10** | Every audit defect class is demonstrated absent, accessibility is verified with tooling, and performance targets are measured | `M10` |
| **SG-11** | The post-deployment smoke test passes **and a restore has been performed** | `M11` |

**How to use this table.** A milestone is finished when its gate is demonstrated, not
when its code is written. If a gate fails, the work returns to that milestone regardless
of how much later work has already been done.

---

*End of roadmap. This plan is a proposal. No milestone below `M1` is complete, and no
part of the described system exists yet.*













