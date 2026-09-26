# CONTINUATION CHECKPOINT

**Purpose:** a cold-start brief for the next Cline session. Read this first,
then `docs/PROJECT-HANDOVER.md`.

---

## Session identity

| Item | Value |
| --- | --- |
| Workspace | `E:\projects\edu-share-platform` |
| Git root | `E:\projects\edu-share-platform\.git` |
| Branch | `main` (tracks `origin/main`) |
| Remote | `https://github.com/Crusty-chirayu/Edu-Share.git` |
| Visibility | Private, not a fork, default branch `main` |
| License | MIT (pre-existing on remote) |
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

| Document | Content |
| --- | --- |
| `docs/PROJECT-AUDIT.md` | 24 severity-ranked findings (2 critical, 6 high, 9 medium, 5 low, 2 informational), each labelled VERIFIED / REPORTED / INFERRED / UNKNOWN; architecture and data-model analysis; full security, accessibility, performance, observability and testability review; positive patterns worth keeping; risk register; licensing boundary; audit limitations |
| `docs/PRODUCT-REQUIREMENTS.md` | Vision, 5 personas, 3-role least-privilege model with a capability matrix, MVP boundary, 76 functional + 46 non-functional requirements, a 13-point definition of "premium", a content-policy framework, 12 owner decisions |
| `docs/ARCHITECTURE-PROPOSAL.md` | 3 candidate architectures compared across 16 criteria, one recommendation with trade-offs and revisit triggers, full specification, conceptual database design, 5 architecture decision records, all provider facts cited with their check date |
| `docs/UI-UX-DESIGN-SYSTEM.md` | Brand identity, design tokens for light and dark, typography, motion, 40 components, 15 screen specifications, interaction standards, WCAG 2.2 AA baseline |
| `docs/IMPLEMENTATION-ROADMAP.md` | Milestones `M0`–`M11` with objective/scope/deliverables/acceptance/tests/risks/evidence each; 13 quality gates; CI/CD design; release checklist and rollback; verified free-tier cost figures; 15-item risk register; 12 stage gates |

**M2 — AWAITING OWNER.** Still open. What this session added is a **prepared decision
brief**, [`DECISION-BRIEF.md`](./DECISION-BRIEF.md): every provider fact the blocking
decisions depend on was re-verified from the providers' own documentation on 2026-09-26,
and the brief carries the real options, the trade-offs, the verified costs, the recommended
defaults, the questions only the owner can answer, a copy-pasteable answer block and an
exact preview of `M3`.

> **No approval was given in this session, so no code was written.** The brief exists
> precisely so that the gate can be passed in one reading rather than five.

**M3 and later — NOT STARTED.** Nothing has been installed, scaffolded or deployed.

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
  is compared against literals. It *is* still invalid PHP and still contains the
  privilege-escalation flaw.
- Prepared statements are used **broadly** — 42 call sites, including all dynamic filter
  construction — not merely "in certain read paths".

---

## Next task: Milestone 2 — obtain owner approval

**`M1` is finished and `M2` is prepared. The next action is still not code.** It is to answer
the block in [`DECISION-BRIEF.md`](./DECISION-BRIEF.md) §11 — the same checklist as
`docs/PRODUCT-REQUIREMENTS.md` §11.3, extended with the commercial questions that `D-005`
turns on.

**Blocking decisions** (nothing downstream may start without these):

| ID | Question |
| --- | --- |
| `D-001` | Which architecture — Option A (integrated TypeScript), B (decoupled API) or C (BaaS-led)? |
| `D-002` | Which managed database, and is a paid tier ever acceptable? |
| `D-005` | Where does it run, given that the main free hosting plan is documented as **non-commercial and personal use only**? |

**Non-blocking but recorded:** `D-003` AI scope, `D-004` content policy, `D-006` moderator
deletion power, `D-007` malware handling, `D-008` resource retention after account
closure, `D-009` personal data collected, `D-010` log retention, `D-011` contributor
licence grant, `D-012` takedown response window.

### Constraints verified in the `M2` session (2026-09-26)

| Fact | Consequence for the next session |
| --- | --- |
| **Cloudflare Workers free plan: 100,000 requests/day and 10 ms CPU per invocation** | Below the 10–20 ms that Cloudflare's own documentation attributes to server rendering, so it is **not** a target for this architecture. Do not propose it as a hosting answer |
| **Railway free plan:** $1/month after the trial; 1 vCPU, 0.5 GB RAM, 1 replica; **cron jobs are trial-only** | A viable cheap container host, but scheduled work must be triggered by an external scheduler |
| **Fly.io:** no free tier, credit card required, egress to India $0.12/GB | Eliminated as a free option |
| **GitHub Actions** on a private repository: 2,000 minutes and 500 MB per month; a budget can **stop** usage | CI cost is bounded. Set the budget when the workflow is created, not after the first overage |
| **Better Auth** authentication library: **MIT** | The candidate library's licence is resolved |
| **Vercel Hobby:** *"non-commercial, personal use only"*, cannot purchase extra usage, and limits pause for up to 30 days | The reason `D-005` blocks, and why the interpretation is the owner's judgement rather than mine |

> **Until the owner approves the architecture: do not scaffold an application, do not
> install dependencies, do not create migrations, and do not write application code.**
> After approval, the next milestone is `M3` — project foundation and development
> environment — as specified in `docs/IMPLEMENTATION-ROADMAP.md` §7.

### Inherited-project follow-ups for the owner (not code)

1. Ask the original author to **rotate the credentials** whose hashes sit in the
   inherited database dump, since those people's passwords are still in use.
2. Ask whether the inherited application was ever deployed publicly, and to whom the
   personal data in the dump belonged — this determines whether there is a disclosure
   obligation.
3. If reuse of the inherited code is ever wanted, obtain **written permission** first and
   record it in a third-party notices file.


## Quick verification commands

```powershell
Set-Location E:\projects\edu-share-platform
git remote -v
git status
gh repo view Crusty-chirayu/Edu-Share --json visibility,isFork,defaultBranchRef
```
