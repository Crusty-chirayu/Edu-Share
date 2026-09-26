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

**Done**
- Full technical read of the inherited application (all 24 files + SQL dump).
- Verified handover document written: `docs/PROJECT-HANDOVER.md`.
- New independent repository created, connected to `Crusty-chirayu/Edu-Share`,
  branched from the existing remote `main` (no force-push, history preserved).
- `.gitignore` written to exclude secrets, dumps, uploads, and inherited code.
- `README.md` rewritten to describe the new project's actual (pre-implementation) state.
- This checkpoint and `docs/DEVELOPMENT-STATUS.md` created.

**Not started (intentionally)**
- Product requirements, architecture proposal, design system, roadmap.
- Any application code, dependencies, CI, or deployment.

---

## Next task: Milestone 1 — Technical Audit & Architecture Proposal

Documentation only. Do **not** scaffold an application yet.

1. **`docs/PRODUCT-REQUIREMENTS.md`** — real student workflows; personas
   (student, teacher, moderator); must / should / won't-have; the
   University -> Department -> Course -> Subject -> Semester taxonomy, and how
   cross-institution discovery should actually behave; what "premium" means in
   concrete, testable terms.
2. **`docs/ARCHITECTURE-PROPOSAL.md`** — 2–3 viable stacks (for example
   TypeScript end-to-end vs. Next.js frontend + separate API), with trade-offs,
   cost, hosting assumptions, search approach, and file-storage approach.
   **Recommend one and justify it.** Do not start installing it.
3. **`docs/UI-UX-DESIGN-SYSTEM.md`** — design tokens, type scale, colour system,
   component inventory, motion principles, accessibility baseline.
4. **`docs/IMPLEMENTATION-ROADMAP.md`** — phased plan with dependencies.
5. **`docs/PROJECT-AUDIT.md`** — consolidate and prioritise the inherited
   system's defects and risks from the handover into a severity-ranked list.

**Then stop and ask for owner approval before writing any application code.**

---

## Open questions for the owner

1. **Deployment target** — is there a preference (Vercel, Railway, Render,
   self-hosted)? Affects storage and database choices.
2. **Budget** — are managed services (hosted Postgres, S3, Algolia, an LLM API)
   acceptable, or must this run on free tiers / self-hosted?
3. **Scope of "AI-assisted" features** — are they in scope for v1, or later?
4. **Content policy** — open uploads by any signed-up user, or moderated?

## Quick verification commands

```powershell
Set-Location E:\projects\edu-share-platform
git remote -v
git status
gh repo view Crusty-chirayu/Edu-Share --json visibility,isFork,defaultBranchRef
```
