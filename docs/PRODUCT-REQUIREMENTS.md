# PRODUCT REQUIREMENTS — EDU-SHARE

| Field                 | Value                                                                                                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Status**            | Proposed — awaiting owner approval                                                                                                                                                                              |
| **Last reviewed**     | 2026-09-26                                                                                                                                                                                                      |
| **Owner**             | Chirayu Babu Jaysawal                                                                                                                                                                                           |
| **Identifier scheme** | `FR-*` functional requirements · `NFR-*` non-functional requirements · `PR-*` personas · `POL-*` policy positions · `D-*` owner decisions                                                                       |
| **Related**           | [PROJECT-AUDIT.md](./PROJECT-AUDIT.md) · [ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md) · [UI-UX-DESIGN-SYSTEM.md](./UI-UX-DESIGN-SYSTEM.md) · [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) |

---

## 1. Purpose, scope and how to read this document

This document defines **what** EDU-SHARE must do, and for whom. It deliberately says
nothing about _how_ the software is built — that is
[ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md).

It exists because the inherited application conflated the two. Its database was
shaped by whichever page happened to write to it, its roles were shaped by a
dropdown, and its most important constraint — a globally unique course name —
quietly forbade the product's own premise. Defining requirements first is how that
is prevented from happening twice.

**Reading rules.**

- `Priority` is one of **MUST** (MVP cannot ship without it), **SHOULD** (expected in
  MVP; may slip only by an explicit recorded decision), **COULD** (a post-MVP
  candidate), **WON'T** (explicitly out of scope, listed so it is not re-litigated).
- **Acceptance criteria** are written so that each one can be turned directly into a
  test.
- **[ASSUMPTION]** marks a provisional stand-in for an owner decision. It is safe to
  change and it is _not_ an approved position.
- **[TARGET]** marks a proposed objective. Nothing in this document is a measured
  result.
- Requirement IDs are stable. A withdrawn requirement is marked
  `WITHDRAWN — replaced by X`, never silently deleted.

### 1.1 The inherited application as a source of requirements

The inherited app is used here for **requirements discovery only**. It is unlicensed
(see [PROJECT-AUDIT.md](./PROJECT-AUDIT.md) §12) and no part of its code will be
reused. What is carried forward is product judgement:

| Carried forward from the inherited app                                   | Verdict                                                                                 |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| The taxonomy _Institution → Department → Programme → Subject → Semester_ | **Keep** — a genuinely correct domain model                                             |
| The navigation model _Home → Library → Saved → Dashboard → Upload_       | **Keep as input** — it maps onto real student tasks                                     |
| Cross-institution discovery as the differentiator                        | **Keep, and actually build it** — it was the stated premise and the least realised part |
| Uploading several files under one logical "material"                     | **Keep** — the concept survives as a resource with attachments                          |
| "Favourite" for both materials and institutions                          | **Simplify** — MVP keeps resources only; institution following is post-MVP              |
| Self-declared teacher role                                               | **Reject** — replaced by administrator-granted roles                                    |
| Free-text institution and department creation at signup                  | **Reject** — replaced by a curated catalogue plus a request path                        |
| `LIKE '%term%'` search with no ranking or pagination                     | **Reject** — replaced by ranked full-text search                                        |
| Serving files from a web-reachable directory                             | **Reject** — replaced by private storage and an authorised download route               |

---

## 2. Product vision and positioning

### 2.1 Vision statement

> **EDU-SHARE is where a student goes at 11 p.m. before an exam and finds the actual
> notes, the actual previous-year paper, and the actual lab manual for the exact
> subject they are sitting — from their own institution or any other — and knows the
> material is real, current, and safe to open.**

### 2.2 The problem being solved

Academic material exists in abundance and is almost impossible to find. It is
scattered across messaging groups, personal drives, and photocopied handouts. It is
institution-bound: a student at one college cannot see that a better set of notes
for the same syllabus exists two kilometres away. Nothing is labelled, nothing is
versioned, and nothing is trustworthy by default.

### 2.3 Positioning

| EDU-SHARE is                                     | EDU-SHARE is not                              |
| ------------------------------------------------ | --------------------------------------------- |
| A structured, subject-addressed academic library | A general file-sharing service or cloud drive |
| Cross-institution by design                      | A single college's internal portal            |
| Curated by its users, with a moderation path     | An unmoderated dump                           |
| A study tool built around the semester           | A social network or a chat product            |
| Free for students to use                         | A marketplace for buying and selling notes    |

### 2.4 Success signals for v1 **[TARGET]**

These are the signals the first release is judged against. They are targets, not
commitments, and none has been measured.

| Signal                                                                                                | Target                                                          |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Time from landing page to downloading a relevant file for a named subject                             | Under 60 seconds, without instruction                           |
| Resources carrying complete structural metadata (institution, programme, semester, subject, category) | 100 % — enforced at upload, not by convention                   |
| Discoverability with no query typed at all                                                            | Yes — browse-first; search is an accelerator, not the only door |
| User-reachable states that are designed (loading, empty, error, success)                              | 100 % of MVP surfaces                                           |
| Audit defect classes (AUD-001 … AUD-008) present in v1                                                | 0                                                               |

---

## 3. Canonical terminology

These terms are used identically in every EDU-SHARE document and in the interface.
One vocabulary is what keeps the requirements, the database schema, and the UI
aligned.

| Term              | Definition                                                                           | Notes                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Institution**   | A university, college, or school that awards qualifications                          | Replaces the inherited "university"                                                                                                                    |
| **Campus**        | A physical site of an institution                                                    | **Post-MVP.** The inherited `branches` table (one seed row) is dropped; a flat institution is enough for v1                                            |
| **Department**    | An academic unit within an institution (e.g. Computer Engineering)                   | Scoped to an institution                                                                                                                               |
| **Programme**     | A degree or diploma a student is enrolled in (e.g. B.E. Computer Engineering)        | Scoped to an institution. Written `programme` in prose, `program` in code. The inherited `courses` table is renamed so "course" never means two things |
| **Semester**      | A numbered study period (1–8)                                                        | A small reference table, not free text                                                                                                                 |
| **Subject**       | A taught unit within a programme and semester (e.g. Operating Systems)               | Scoped to programme **and** semester. This is the unit a resource is addressed to                                                                      |
| **Resource**      | One logical academic item contributed by a user, with metadata and at least one file | Replaces the inherited "material"                                                                                                                      |
| **File**          | A single stored document belonging to a resource                                     | MVP stores one file per resource; the model permits more                                                                                               |
| **Category**      | The academic _type_ of a resource                                                    | A controlled vocabulary, never free text                                                                                                               |
| **Contributor**   | A user who has published at least one resource                                       | An activity, not a role                                                                                                                                |
| **Saved item**    | A resource a user has bookmarked                                                     | Replaces "favourite"                                                                                                                                   |
| **Report**        | A user's claim that a resource breaches policy                                       | Never visible to the reported user                                                                                                                     |
| **Moderator**     | A user granted power to act on reports                                               | Granted, never self-selected                                                                                                                           |
| **Administrator** | A user who manages roles, taxonomy, and policy                                       | Typically the owner; deliberately few                                                                                                                  |
| **Visibility**    | Who may see a resource: `public`, `institution`, or `private`                        | The inherited app had no such concept                                                                                                                  |

---

## 4. User personas

Five personas carry the requirements. Each one ends with an explicit failure
condition, because a persona that cannot fail is not useful.

### PR-01 — The exam-week seeker _(the primary persona)_

| Attribute     | Detail                                                                                                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Who**       | A 2nd–4th year undergraduate: "Aditi, third-year Computer Engineering"                                                                                                                                 |
| **Context**   | 11 p.m., phone, on mobile data, an exam in nine hours, one specific subject                                                                                                                            |
| **Goal**      | Find the previous-year paper and good lecture notes for _that subject_, now                                                                                                                            |
| **Behaviour** | Will not create an account to _see_ whether the site is useful. Judges the product in about eight seconds. Abandons a slow page rather than waiting                                                    |
| **Needs**     | Browse and preview without signing in; subject-addressed pages; a search that tolerates a misspelling; small pages on a slow connection; files that open in the browser instead of starting a download |
| **Fails if**  | A login wall appears before any content; the only action is "Download"; the page is heavy; the subject cannot be identified in one glance                                                              |

**PR-01 defines what "good" means for this product.** If the seeker cannot get a
file quickly, nothing else matters.

### PR-02 — The contributor

| Attribute     | Detail                                                                                                                                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who**       | "Rohit, final-year student", with an organised folder of notes and question papers he has already typed or scanned                                                                                                        |
| **Goal**      | Share that material, get credited, and not spend an evening doing data entry                                                                                                                                              |
| **Behaviour** | Contributes once if it is easy, and never again if it is not. Cares about attribution and about being able to fix or remove his own upload                                                                                |
| **Needs**     | Metadata entry in under three minutes; the taxonomy prefilled from his own profile; clear confirmation of what was published and where; the ability to edit, replace, or delete his own resource; visible acknowledgement |
| **Fails if**  | The form asks for information he does not know; a failure is reported as a blank screen or a raw error; he cannot remove his own work; anyone can re-publish it as theirs                                                 |

### PR-03 — The organiser

| Attribute    | Detail                                                                                                                                                           |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who**      | "Meera", who collects material across several semesters and institutions                                                                                         |
| **Goal**     | Keep a personal library that is still usable in six months                                                                                                       |
| **Needs**    | Save a resource in one action; a library grouped by subject with sort and filter; indication of what she has already used; the ability to unsave without hunting |
| **Fails if** | Saved items land in one flat undated list; saving requires leaving the page; there is no way to see why something was saved                                      |

### PR-04 — The moderator

| Attribute    | Detail                                                                                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Who**      | A trusted senior student or a teacher, **granted** moderation rights by an administrator. Never self-selected (this is the direct answer to AUD-002)                                                                                                   |
| **Goal**     | Act on a small queue of reports quickly and defensibly                                                                                                                                                                                                 |
| **Needs**    | A report queue with enough context to decide without hunting (the resource, the reporter's reason, the contributor's history); one-action takedown **with a required reason**; the ability to reverse a decision; an audit trail of every action taken |
| **Fails if** | The queue has no reason field; a mistake cannot be undone; there is no record of who did what                                                                                                                                                          |

### PR-05 — The operator (the owner)

| Attribute    | Detail                                                                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Who**      | Chirayu — the developer and the person legally responsible for the content                                                                                                                                                      |
| **Goal**     | Keep the platform healthy, within free-tier limits, and defensible against a copyright complaint                                                                                                                                |
| **Needs**    | Manage the taxonomy without touching the database; grant and revoke roles; see counts (users, resources, storage consumed); act on a takedown quickly and prove when it was done; a backup that has actually been restored once |
| **Fails if** | Taxonomy changes require SQL by hand; a takedown cannot be evidenced; the free-tier quota is discovered only when it is exceeded                                                                                                |

### 4.1 Deliberate non-personas for v1

Listed so they are not accidentally designed for:

| Non-persona                            | Why excluded                                                                                        |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Institution IT administrators          | No SSO, no institutional provisioning, no campus network integration in v1                          |
| Paying institutions                    | No billing, no contracts, no per-seat licensing in v1                                               |
| Advertisers and recruiters             | Explicitly out of product scope; the platform is not an audience to be sold                         |
| Alumni, parents, or the general public | The taxonomy requires knowing your own programme; there is no "curious visitor" journey to optimise |

---

## 5. Roles, permissions and the least-privilege model

### 5.1 The roles

The MVP needs **three** roles and no more. The inherited application's distinction
between "student" and "teacher" is **not** an authorisation boundary and is not
carried forward as one — it was the mechanism of AUD-002.

| Role        | Who holds it                                 | How it is obtained                                                                 |
| ----------- | -------------------------------------------- | ---------------------------------------------------------------------------------- |
| `user`      | Every registered account                     | **Automatically, at registration. This is the only role registration can produce** |
| `moderator` | A trusted contributor or teacher             | Granted by an administrator. Revocable                                             |
| `admin`     | The owner, plus at most one or two delegates | Granted by an existing administrator                                               |

Two orthogonal account states sit alongside the role:

| State            | Values                                | Effect                                                                                                                  |
| ---------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Verification** | `unverified`, `verified`              | Only verified accounts may publish. Unverified accounts may browse, save and report                                     |
| **Standing**     | `active`, `restricted`, `deactivated` | `restricted` blocks publishing and reporting pending review; `deactivated` is a user-initiated or admin-initiated close |

### 5.2 The non-negotiable rule

> **A role is never accepted from client input at any endpoint, for any reason.**
> Registration creates a `user`. Elevation happens only through an administrator
> action, and every elevation and revocation is written to the audit log.

This single rule is the direct architectural answer to AUD-002, and it is enforced by
test rather than by convention (see `M5` in
[IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md)).

### 5.3 Capability matrix

`Y` = allowed · `—` = denied · `own` = allowed only for the acting user's own records.

| Capability                                    | Guest | User                | Moderator          | Admin |
| --------------------------------------------- | ----- | ------------------- | ------------------ | ----- |
| Browse taxonomy and public listings           | Y     | Y                   | Y                  | Y     |
| Search                                        | Y     | Y                   | Y                  | Y     |
| Open / preview a public resource              | Y     | Y                   | Y                  | Y     |
| Download a public resource                    | Y     | Y                   | Y                  | Y     |
| View an `institution`-visibility resource     | —     | Y (own institution) | Y                  | Y     |
| View a `private` resource                     | —     | own                 | policy-review only | Y     |
| Register an account                           | Y     | —                   | —                  | —     |
| Sign in / sign out                            | Y     | Y                   | Y                  | Y     |
| Edit own profile                              | —     | Y                   | Y                  | Y     |
| Save / unsave a resource                      | —     | Y                   | Y                  | Y     |
| View own library and upload history           | —     | Y                   | Y                  | Y     |
| Publish a resource                            | —     | Y                   | Y                  | Y     |
| Edit own resource metadata                    | —     | own                 | Y                  | Y     |
| Replace or delete own resource                | —     | own                 | Y                  | Y     |
| Submit a report                               | —     | Y                   | Y                  | Y     |
| Add a missing institution (request)           | Y     | Y                   | Y                  | Y     |
| View the report queue                         | —     | —                   | Y                  | Y     |
| Hide (unpublish) a resource                   | —     | —                   | Y                  | Y     |
| Restore a hidden resource                     | —     | —                   | Y                  | Y     |
| Resolve or dismiss a report                   | —     | —                   | Y                  | Y     |
| Permanently delete a resource                 | —     | —                   | —                  | Y     |
| Restrict or reinstate a user                  | —     | —                   | —                  | Y     |
| Grant / revoke `moderator`                    | —     | —                   | —                  | Y     |
| Manage the taxonomy (institutions … subjects) | —     | —                   | —                  | Y     |
| Manage the category vocabulary                | —     | —                   | —                  | Y     |
| Read the audit log                            | —     | own events          | —                  | Y     |
| View platform metrics and quota usage         | —     | —                   | —                  | Y     |

### 5.4 Why a moderator cannot permanently delete

Least privilege, applied deliberately: hiding is reversible and is therefore given to
moderators, while permanent deletion destroys a user's contribution and is given only
to administrators. A moderator acting in error costs a restore; an administrator
acting in error costs data, and that asymmetry is the reason for the split.
Reversibility, not seniority, decides who gets which power. See decision `D-006`.

### 5.5 Enforced anti-patterns

Each of these is explicitly forbidden, and each is forbidden because the inherited
application did it.

| Anti-pattern                                                                                                                | Why it is forbidden                                                        |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Reading a role from a request body, form field, or dropdown                                                                 | AUD-002 — this is exactly how privilege was escalated                      |
| Hiding an action in the interface and calling it authorisation                                                              | The interface is not a security boundary                                   |
| Treating "teacher" (or any profile attribute) as a permission                                                               | A self-reported attribute is not a credential                              |
| Checking authorisation in the page or component that renders the control instead of in the handler that performs the action | The check must sit where the state changes                                 |
| Deny-by-default inversion — an allow-list that grows per feature                                                            | Every route calls `can()` explicitly; a route with no check fails its test |
| Returning "forbidden" for a private resource                                                                                | Private resources return **not found**, so existence is not disclosed      |

---

## 6. MVP scope boundary

Scope is the most expensive kind of decision on a solo project, so it is stated once,
in one place, and everything else in this document is subordinated to it.

### 6.1 The scope guard rule

> **Nothing enters the MVP without either removing something of comparable size or a
> recorded owner decision stating what is deferred in exchange.**

An MVP that grows by accretion does not ship. This rule exists so that "just one more
feature" is visible as a trade rather than as a free addition.

### 6.2 In the MVP

| Area              | Included                                                                            | Priority                                               |
| ----------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Accounts          | Register, sign in, sign out, verify email, reset password, edit profile, deactivate | MUST                                                   |
| Roles             | `user`, `moderator`, `admin`, with administrator-granted elevation only             | MUST                                                   |
| Taxonomy          | Institutions, departments, programmes, semesters, subjects, categories; browsable   | MUST                                                   |
| Taxonomy admin    | Create, rename, merge, deactivate; a request-a-missing-institution flow             | MUST                                                   |
| Upload            | Single-file resource upload with complete required metadata                         | MUST                                                   |
| Storage           | Private object storage, server-validated, authorised downloads                      | MUST                                                   |
| Discovery         | Institution → programme → semester → subject browsing                               | MUST                                                   |
| Search            | Ranked full-text search with structured filters                                     | MUST                                                   |
| Resource detail   | Metadata, preview or open, download, report, save                                   | MUST                                                   |
| Library           | Save/unsave; personal library with filters and sort                                 | MUST                                                   |
| Contributions     | Upload history; edit, replace and delete own resource                               | MUST                                                   |
| Reporting         | Report a resource with a controlled reason and optional detail                      | MUST                                                   |
| Moderation        | Queue, hide, restore, resolve, dismiss, audit trail                                 | MUST (may drop to SHOULD only if `M9` must be trimmed) |
| Profiles          | Public contributor profile showing published resources                              | SHOULD                                                 |
| Notifications     | Transactional email only: verification, reset, moderation outcome                   | SHOULD                                                 |
| Accessibility     | WCAG 2.2 AA as the design and implementation standard                               | MUST                                                   |
| Responsive design | Full mobile and desktop support                                                     | MUST                                                   |

### 6.3 Post-MVP candidates

Ordered by expected value. **None is promised.**

| Feature                                               | Why it is deferred                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Following an institution, and a personalised feed     | Valuable, but not needed to prove the core loop. The inherited app's half-built version is not a reason to finish it |
| Tags and free-form topics                             | Category plus subject already address discovery; tags need moderation to stay useful                                 |
| Multiple files per resource                           | The schema allows it; the interface does not need it until contributors ask                                          |
| Resource versioning and "this is out of date" signals | Needs real usage data to design honestly                                                                             |
| Ratings, upvotes, comments                            | Invite gaming and require moderation capacity the project does not have                                              |
| Full-text extraction **inside** documents             | High value, real cost; the clearest post-MVP upgrade                                                                 |
| Offline reading or an installable web app             | Valuable for PR-01; deferred until the web loop is proven                                                            |
| Contributor reputation and badges                     | Needs a trustworthy base of activity first                                                                           |
| Institution branding or customisation                 | Matters only when an institution is a customer — a non-persona in v1                                                 |
| Bulk upload                                           | Optimises a contributor pattern that does not exist yet                                                              |

### 6.4 Deliberately not built

| Not built                                         | Reason                                                                |
| ------------------------------------------------- | --------------------------------------------------------------------- |
| Chat, direct messages, comments on resources      | A different product with a heavy moderation surface                   |
| Video or audio hosting                            | Storage and bandwidth costs are incompatible with the budget          |
| A marketplace, payments, or paid notes            | Changes the legal posture and the moderation obligation               |
| A public API for third parties                    | No demonstrated consumer; an API is a contract and a maintenance cost |
| Anything that requires a paid service to function | The budget does not exist                                             |
| Native mobile applications                        | The responsive web app serves PR-01's context first                   |
| Any AI feature in v1                              | See §6.5                                                              |

### 6.5 The AI question (`D-003`)

**Recommendation: no AI feature in the MVP.** Not because AI is uninteresting, but
because no problem in the core loop is solved better by a model than by a good
taxonomy, and because the risk profile is poor for a first release.

| AI feature                                     | Verdict                                     | Reason                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auto-suggest the subject from an uploaded file | **Post-MVP — strong candidate**             | Directly reduces the metadata burden that costs PR-02 the most time                                                                                   |
| Extract and index text from inside documents   | **Post-MVP — strong candidate**             | Materially improves search; needs a text-extraction pipeline before any model                                                                         |
| Summarise a resource                           | **Post-MVP — weak candidate**               | Users want the file, not a summary of it                                                                                                              |
| Auto-moderate for policy violations            | **Won't, in v1**                            | A false accusation damages a contributor and the platform's credibility; automated judgement without an appeal path is worse than a small human queue |
| A chat assistant over the library              | **Won't, before the corpus is substantial** | It answers questions the search box already answers                                                                                                   |

**If AI is ever added**, the architectural constraint is fixed now: model calls live
behind a server-side module with its own rate limit and cost ceiling, and every
suggestion requires a human to confirm it. No model output is ever written to the
database unconfirmed.

---

## 7. Functional requirements

Each requirement has a stable ID, a priority, testable acceptance criteria, and its
dependencies. "Depends on" refers to other requirement IDs unless it names a milestone.

### 7.1 Accounts and authentication (`FR-ACC`)

| ID        | Requirement                                                | Priority | Acceptance criteria                                                                                                                                                  | Depends on |
| --------- | ---------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-ACC-01 | A visitor can register with email and password             | MUST     | The account is created with role `user`; supplying any role value in the request has no effect on the stored role                                                    | —          |
| FR-ACC-02 | Registration rejects an address that is already registered | MUST     | A second registration with the same address is refused with a message that does not confirm whether the account exists                                               | FR-ACC-01  |
| FR-ACC-03 | Password rules are enforced at registration                | MUST     | Minimum 12 characters; no composition requirement; a password that is too short is refused with a specific message; no password appears in any log                   | FR-ACC-01  |
| FR-ACC-04 | Passwords are stored irreversibly                          | MUST     | The stored value is never the plaintext; the algorithm and cost parameters are recorded in the repository                                                            | FR-ACC-01  |
| FR-ACC-05 | A registered user can sign in                              | MUST     | A correct credential creates a session and rotates the session identifier; an incorrect one does not                                                                 | FR-ACC-04  |
| FR-ACC-06 | Sign-in does not reveal whether an address exists          | MUST     | An unknown address and a wrong password produce the same response body, status and comparable timing                                                                 | FR-ACC-05  |
| FR-ACC-07 | Repeated failed sign-ins are throttled                     | MUST     | After a configured number of failures the attempt is delayed or refused, and the throttle clears after a configured period                                           | FR-ACC-05  |
| FR-ACC-08 | A user can sign out, and the session ends immediately      | MUST     | After sign-out, the previous session cannot be reused, including in another tab or after a page refresh                                                              | FR-ACC-05  |
| FR-ACC-09 | Sessions expire                                            | MUST     | An idle session and an over-long session both end; the values are configured, not hardcoded, and are asserted by test                                                | FR-ACC-05  |
| FR-ACC-10 | A user can request a password reset by email               | MUST     | The response is identical whether or not the address exists; the link is single-use and expires; the token is stored hashed                                          | FR-ACC-05  |
| FR-ACC-11 | Email verification gates publishing                        | MUST     | An unverified account can browse, save and report, but publishing is refused with a clear explanation and a resend option                                            | FR-ACC-01  |
| FR-ACC-12 | A user can change their password                           | SHOULD   | Changing the password requires the current password and invalidates other sessions                                                                                   | FR-ACC-05  |
| FR-ACC-13 | A user can deactivate their account                        | SHOULD   | Deactivation ends all sessions and removes the account from public listings; authored resources are either retained with attribution or removed according to `D-008` | FR-ACC-01  |
| FR-ACC-14 | Registration is protected against automated abuse          | SHOULD   | A rate limit applies per address and per client, and the form includes a mechanism that a trivial script cannot complete — without adding an accessibility barrier   | FR-ACC-01  |

### 7.2 Profile (`FR-PRO`)

| ID        | Requirement                                               | Priority | Acceptance criteria                                                                                     | Depends on |
| --------- | --------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | ---------- |
| FR-PRO-01 | A user has a profile with a display name                  | MUST     | The name is editable and appears on every resource the user publishes                                   | FR-ACC-01  |
| FR-PRO-02 | A user can link their institution, programme and semester | MUST     | The values are chosen from the curated taxonomy, never typed freely (this is the direct answer to DB-7) | FR-TAX-01  |
| FR-PRO-03 | A profile is publicly viewable                            | SHOULD   | Shows the display name and published resources only; never the email address, and never contact details | FR-PRO-01  |
| FR-PRO-04 | A user chooses their own default resource visibility      | SHOULD   | The choice is stored and prefills the upload form; the effective value is still validated server-side   | FR-RES-04  |
| FR-PRO-05 | A user can delete their account                           | SHOULD   | Confirmation is explicit; the effect on authored resources is stated before confirming                  | FR-ACC-13  |

---

### 7.3 Taxonomy (`FR-TAX`)

| ID        | Requirement                                                               | Priority | Acceptance criteria                                                                                                                     | Depends on |
| --------- | ------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-TAX-01 | The taxonomy is Institution → Department → Programme → Semester → Subject | MUST     | Each level is addressable by URL; a subject is always reached through its programme and semester                                        | —          |
| FR-TAX-02 | **The same programme name can exist at two institutions**                 | MUST     | Creating "Computer Engineering" at a second institution succeeds and returns a distinct record — the direct regression test for AUD-010 | FR-TAX-01  |
| FR-TAX-03 | Subject names are unique within a programme and semester                  | MUST     | A duplicate is refused with a clear message; the same subject name is allowed in a different semester                                   | FR-TAX-01  |
| FR-TAX-04 | Every level has a human-readable, stable URL slug                         | SHOULD   | Slugs are unique within their parent; renaming does not break existing links                                                            | FR-TAX-01  |
| FR-TAX-05 | A visitor can browse the whole taxonomy without signing in                | MUST     | Institution, programme, semester and subject pages all render for a signed-out visitor                                                  | FR-TAX-01  |
| FR-TAX-06 | Counts are shown per level                                                | SHOULD   | A subject shows how many resources it holds, and the count matches the filtered listing                                                 | FR-TAX-01  |
| FR-TAX-07 | An administrator can create, rename and merge taxonomy records            | MUST     | Each action is performed in the interface without SQL; a merge reparents the affected resources and is recorded in the audit log        | FR-TAX-02  |
| FR-TAX-08 | A referenced taxonomy record cannot be deleted                            | MUST     | Attempting to delete a programme that has resources produces a refusal naming the dependency, not a database error                      | FR-TAX-07  |
| FR-TAX-09 | A user can request a missing institution                                  | SHOULD   | The request is stored with its requester and is actionable by a moderator or administrator; the requester is notified of the outcome    | FR-TAX-07  |
| FR-TAX-10 | Creating a taxonomy record requires searching first                       | SHOULD   | The create form shows near matches before allowing a new record to be saved                                                             | FR-TAX-07  |

### 7.4 Resources and upload (`FR-RES`)

| ID        | Requirement                                          | Priority | Acceptance criteria                                                                                                                                               | Depends on           |
| --------- | ---------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| FR-RES-01 | A verified user can publish a resource with one file | MUST     | The resource is created only with a title, a category and a complete taxonomy path; publishing without any of these is refused                                    | FR-ACC-11, FR-TAX-01 |
| FR-RES-02 | Only an allow-list of document formats is accepted   | MUST     | PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX and TXT are accepted; anything else is refused **and any object already staged for it is removed**                           | FR-RES-01            |
| FR-RES-03 | File validation uses server-side inspection          | MUST     | A file whose real content type contradicts its extension is refused; validation reads the stored object back and never trusts the client's report of size or type | FR-RES-01            |
| FR-RES-04 | A contributor chooses resource visibility            | MUST     | `public`, `institution` or `private`; the effective value is enforced server-side on every read path                                                              | FR-RES-01            |
| FR-RES-05 | Upload limits are stated before the upload starts    | MUST     | Per-file and per-user limits are visible on the upload screen; exceeding a limit is refused before transfer where possible and after transfer otherwise           | FR-RES-01            |
| FR-RES-06 | Storage keys are server-generated                    | MUST     | A user-supplied filename never becomes a storage or filesystem path; the original name is retained as metadata only                                               | FR-RES-03            |
| FR-RES-07 | A completed upload is confirmed by the server        | MUST     | The success state appears only after the object has been inspected and the record promoted to active                                                              | FR-RES-03            |
| FR-RES-08 | An abandoned upload is cleaned up                    | SHOULD   | A staged object with no completed record is removed automatically within a documented window                                                                      | FR-RES-07            |
| FR-RES-09 | A contributor can edit their own resource's metadata | MUST     | Edits are audited; the file can be replaced without losing the resource's identity, its saves, or its links                                                       | FR-RES-01            |
| FR-RES-10 | A contributor can delete their own resource          | MUST     | Deletion removes it from every listing, and the stored object is removed according to the retention rule in `D-008`                                               | FR-RES-09            |
| FR-RES-11 | Downloading requires authorisation                   | MUST     | Each download is authorised against visibility and relationship; an unauthorised request for a private resource returns **not found**; every download is logged   | FR-RES-04            |
| FR-RES-12 | Every accepted file is hashed                        | SHOULD   | A content hash is stored, so an exact duplicate can be detected and reported to the contributor before publishing                                                 | FR-RES-03            |
| FR-RES-13 | A resource records a download count                  | SHOULD   | The count increments per download, is visible on the detail screen, and is not inflatable by refreshing                                                           | FR-RES-11            |
| FR-RES-14 | The original filename and format are shown           | MUST     | The detail screen shows the format as text beside any icon                                                                                                        | FR-RES-01            |

---

### 7.5 Discovery and search (`FR-DIS`)

| ID        | Requirement                                                     | Priority | Acceptance criteria                                                                                                                                    | Depends on           |
| --------- | --------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------- |
| FR-DIS-01 | A visitor can search by free text without signing in            | MUST     | Results render for a signed-out visitor; the query survives a page reload and is shareable as a URL                                                    | FR-TAX-05            |
| FR-DIS-02 | Search covers title, description, subject and institution names | MUST     | A term found only in the description still returns the resource, ranked below a title match                                                            | FR-DIS-01            |
| FR-DIS-03 | Search tolerates a misspelling                                  | SHOULD   | A one- or two-character error in a subject name still returns that subject's resources, or states clearly that it could not                            | FR-DIS-01            |
| FR-DIS-04 | Results can be filtered                                         | MUST     | Filters cover institution, programme, semester, subject, category and format; multiple filters combine as AND; the result count matches the rows shown | FR-DIS-01            |
| FR-DIS-05 | Results can be sorted                                           | MUST     | By relevance, newest and most downloaded; the chosen sort is reflected in the URL                                                                      | FR-DIS-01            |
| FR-DIS-06 | Results are paginated without duplicates or gaps                | MUST     | Paging forward and back through a result set while new resources are inserted returns every eligible row exactly once                                  | FR-DIS-01            |
| FR-DIS-07 | Results respect visibility                                      | MUST     | No hidden or private resource appears in any result, under any filter combination                                                                      | FR-RES-04, FR-MOD-03 |
| FR-DIS-08 | A broad listing exists separate from search                     | SHOULD   | A browsing surface exists for the taxonomy path, so a user who does not know what to type can still get somewhere                                      | FR-TAX-05            |
| FR-DIS-09 | The result list shows what matters at a glance                  | MUST     | Each result shows title, category, taxonomy path, contributor, format and size without needing to open it                                              | FR-RES-14            |
| FR-DIS-10 | A search performed before signing in is not lost on signing in  | COULD    | Signing in returns the user to the same result set                                                                                                     | FR-ACC-05            |

### 7.6 Personal library (`FR-LIB`)

| ID        | Requirement                                        | Priority | Acceptance criteria                                                                                                                       | Depends on |
| --------- | -------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-LIB-01 | A signed-in user can save a resource in one action | MUST     | The action does not require leaving the current page; the state is visible immediately; a failed request rolls the state back and says so | FR-ACC-05  |
| FR-LIB-02 | Saving is idempotent                               | MUST     | Saving twice results in one saved item, and unsaving twice results in none                                                                | FR-LIB-01  |
| FR-LIB-03 | The library lists saved resources                  | MUST     | Grouped or filterable by subject and programme, with a sort by date saved and by title                                                    | FR-LIB-01  |
| FR-LIB-04 | The library survives sign-out                      | MUST     | Saved items persist across sessions and devices                                                                                           | FR-LIB-01  |
| FR-LIB-05 | A removed or hidden resource is not shown          | MUST     | A resource that has been deleted or hidden disappears from the library without breaking the page                                          | FR-DIS-07  |
| FR-LIB-06 | An unsave can be undone                            | SHOULD   | Undo is available immediately after unsaving, without leaving the page                                                                    | FR-LIB-01  |
| FR-LIB-07 | A new account sees a correct empty library         | MUST     | The empty state explains how to fill it and offers a link to browse                                                                       | FR-LIB-03  |

### 7.7 Contribution management (`FR-CON`)

| ID        | Requirement                                                  | Priority | Acceptance criteria                                                                                                       | Depends on |
| --------- | ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-CON-01 | A contributor can see everything they have published         | MUST     | Including resources currently hidden by moderation, clearly marked as hidden with the reason category where policy allows | FR-MOD-03  |
| FR-CON-02 | Each published resource shows how it is being used           | SHOULD   | Download count and save count are visible to its owner                                                                    | FR-RES-13  |
| FR-CON-03 | A contributor can edit their own resource's metadata         | MUST     | Only the owner or an admin may edit; every edit is audited                                                                | FR-RES-09  |
| FR-CON-04 | A contributor can replace the file on their own resource     | SHOULD   | The resource keeps its URL, its saves and its identity; the old object is removed or retained per `D-008`                 | FR-RES-09  |
| FR-CON-05 | A contributor can delete their own resource                  | MUST     | A single confirmation names the resource and states that saves by others will be lost                                     | FR-RES-10  |
| FR-CON-06 | A contributor cannot edit someone else's resource            | MUST     | Attempting it — including by crafting a request directly — is refused and audited                                         | FR-CON-03  |
| FR-CON-07 | The upload form remembers the contributor's academic context | SHOULD   | Institution, programme and semester are prefilled from the profile and remain editable                                    | FR-PRO-02  |

### 7.8 Notifications (`FR-NOT`)

| ID        | Requirement                                                       | Priority | Acceptance criteria                                                                                                                 | Depends on |
| --------- | ----------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-NOT-01 | Verification email is sent at registration                        | MUST     | The message contains a working single-use link with an expiry; failure to send is surfaced to the user rather than failing silently | FR-ACC-11  |
| FR-NOT-02 | Password reset email is sent on request                           | MUST     | Same guarantees as FR-NOT-01, and identical behaviour whether or not the address exists                                             | FR-ACC-10  |
| FR-NOT-03 | A contributor is told the outcome of moderation on their resource | SHOULD   | The message states the decision and the reason category, never the reporter's identity                                              | FR-MOD-03  |
| FR-NOT-04 | A reporter is told their report was actioned                      | COULD    | Confirms receipt, and confirms the outcome without disclosing the moderation detail of other users                                  | FR-MOD-01  |
| FR-NOT-05 | Notification volume is bounded                                    | MUST     | No resource can generate unbounded email; a per-recipient daily ceiling applies                                                     | FR-NOT-01  |
| FR-NOT-06 | Marketing or digest email is **not** sent in the MVP              | WON'T    | Only transactional messages exist in v1                                                                                             | —          |

---

### 7.9 Reporting and moderation (`FR-MOD`)

| ID        | Requirement                                                 | Priority | Acceptance criteria                                                                                                                                                                                                       | Depends on |
| --------- | ----------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-MOD-01 | Any signed-in user can report a resource                    | MUST     | The report requires a reason from a controlled list, with optional free text; a confirmation is shown; the reporter can report the same resource only once                                                                | FR-ACC-05  |
| FR-MOD-02 | A report is never disclosed to the reported contributor     | MUST     | Neither the reporter's identity nor the existence of the report appears in any interface or email the contributor can reach                                                                                               | FR-MOD-01  |
| FR-MOD-03 | A moderator can hide a resource                             | MUST     | One action, with a required reason; the resource immediately disappears from browse, search, the library and the contributor's public profile — asserted by test — while remaining visible to its owner, marked as hidden | FR-MOD-01  |
| FR-MOD-04 | Hiding is reversible                                        | MUST     | Restoring returns the resource to every surface it previously appeared in                                                                                                                                                 | FR-MOD-03  |
| FR-MOD-05 | Resolving or dismissing a report requires a reason          | MUST     | The queue cannot be cleared without recording why; the action is attributed to the moderator                                                                                                                              | FR-MOD-01  |
| FR-MOD-06 | Permanent deletion is administrator-only                    | MUST     | A moderator attempting it is refused, including when the attempt is crafted directly rather than through the interface                                                                                                    | FR-MOD-03  |
| FR-MOD-07 | A user can be restricted                                    | SHOULD   | Restriction blocks publishing and reporting, ends the user's sessions where necessary, and is reversible; it never locks the user out of their own account entirely                                                       | FR-MOD-06  |
| FR-MOD-08 | Every moderation action is recorded                         | MUST     | Actor, target, action, reason and timestamp are stored and readable by an administrator; the record cannot be edited through the interface                                                                                | FR-MOD-03  |
| FR-MOD-09 | A moderator can see enough context to decide                | SHOULD   | The queue shows the resource, its metadata, the contributor's history, and the report reason in one view                                                                                                                  | FR-MOD-01  |
| FR-MOD-10 | The queue is bounded in practice                            | SHOULD   | Duplicate reports on one resource are grouped rather than listed separately                                                                                                                                               | FR-MOD-01  |
| FR-MOD-11 | Policy pages are publicly readable                          | MUST     | Acceptable use, copyright and takedown, and privacy pages render without authentication and are linked from the resource and upload screens                                                                               | FR-MOD-01  |
| FR-MOD-12 | A copyright takedown can be actioned within a stated window | MUST     | The operator runbook documents the procedure and the committed response window, and a takedown is executable without a code change                                                                                        | FR-MOD-06  |

### 7.10 Settings and account surfaces (`FR-SET`)

| ID        | Requirement                                                                  | Priority | Acceptance criteria                                                                                                 | Depends on |
| --------- | ---------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- | ---------- |
| FR-SET-01 | A user can see and edit their account settings                               | MUST     | Display name, academic context, default visibility and theme preference are editable in one place                   | FR-PRO-01  |
| FR-SET-02 | The user's email address is visible but changing it requires re-verification | SHOULD   | A change is only applied once the new address is verified; the old address is notified of the change attempt        | FR-ACC-11  |
| FR-SET-03 | A user can see which sessions are active                                     | COULD    | Active sessions are listed with a way to end all others                                                             | FR-ACC-08  |
| FR-SET-04 | A user can export their own data                                             | COULD    | A machine-readable export of their account, resources and saved items                                               | FR-PRO-05  |
| FR-SET-05 | A user can choose light, dark or system theme                                | SHOULD   | The preference persists across sessions and is honoured before first paint, so there is no flash of the wrong theme | FR-SET-01  |

---

## 8. Non-functional requirements

> Every figure in this section is a **proposed target**. None has been measured, none
> is a contractual commitment, and none should be quoted as an achieved result.

### 8.1 Security

| ID         | Requirement                                                 | Target                                                               | Verified by                                                           |
| ---------- | ----------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| NFR-SEC-01 | Roles are never derived from client input                   | 100 % of endpoints                                                   | Authorisation matrix iterating the real route list                    |
| NFR-SEC-02 | Every protected route denies by default                     | 100 % of routes                                                      | The same matrix, asserting deny as well as allow                      |
| NFR-SEC-03 | Stored objects are unreachable without authorisation        | 100 %                                                                | A test that fetches a bucket URL directly and expects refusal         |
| NFR-SEC-04 | Passwords are stored with a modern, parameterised algorithm | Argon2id, or bcrypt at cost ≥ 12                                     | A hashing test asserting the recorded configuration                   |
| NFR-SEC-05 | Every state-changing request carries a session-bound token  | 100 % of mutations                                                   | A test submitting a mutation with no valid token, expecting rejection |
| NFR-SEC-06 | Uploaded content is validated by server-side inspection     | 100 % of uploads                                                     | The upload-validation matrix                                          |
| NFR-SEC-07 | No secret is present in the repository                      | 0 occurrences                                                        | A CI secret scan plus manual review                                   |
| NFR-SEC-08 | Security headers are set explicitly                         | CSP, `X-Content-Type-Options`, `Referrer-Policy`, HSTS in production | A response-header assertion                                           |
| NFR-SEC-09 | Dependency advisories are tracked                           | No unresolved high severity at release                               | The CI audit gate                                                     |
| NFR-SEC-10 | Security-relevant actions are logged                        | 100 % of authentication, moderation and admin actions                | The audit-record completeness test                                    |

### 8.2 Performance

| ID          | Requirement                                        | Target (proposed)                                                         | Conditions                                          |
| ----------- | -------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| NFR-PERF-01 | Listing screens are quick on a mid-tier phone      | Interaction-ready < 2.5 s                                                 | Simulated 4G, throttled CPU, cold cache             |
| NFR-PERF-02 | Page weight stays modest                           | < 200 KB compressed per listing screen, excluding any opened document     | Same conditions                                     |
| NFR-PERF-03 | Layout is stable                                   | Cumulative layout shift < 0.1                                             | Self-hosted fonts, reserved media space             |
| NFR-PERF-04 | Search feels immediate                             | Server response < 500 ms at MVP corpus size                               | The corpus size is stated alongside any measurement |
| NFR-PERF-05 | Listings do not issue a query per row              | Query count constant as page size grows                                   | Query-count assertion in tests                      |
| NFR-PERF-06 | Opening a document is not delayed by the interface | Viewer begins within 1 s of the browser requesting it, network permitting | Measured, not assumed                               |

### 8.3 Accessibility

| ID          | Requirement           | Target                                                                                                                                                  |
| ----------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-A11Y-01 | Conformance standard  | **WCAG 2.2 level AA**, including its additions: focus not obscured, an alternative to dragging, target size, redundant entry, accessible authentication |
| NFR-A11Y-02 | Keyboard operability  | Every interactive element reachable and operable by keyboard; focus never trapped except inside a modal, and always restorable on close                 |
| NFR-A11Y-03 | Contrast              | Body text ≥ 4.5:1 (aim 7:1); large text and interactive boundaries ≥ 3:1                                                                                |
| NFR-A11Y-04 | Non-colour signalling | No meaning carried by colour alone                                                                                                                      |
| NFR-A11Y-05 | Form errors           | Announced programmatically and associated with their field                                                                                              |
| NFR-A11Y-06 | Touch targets         | ≥ 44 × 44 px, above the 24 × 24 px minimum                                                                                                              |
| NFR-A11Y-07 | Motion                | All motion respects `prefers-reduced-motion` without removing content                                                                                   |
| NFR-A11Y-08 | Structure             | Correct landmarks, one `<h1>` per page, heading order reflecting real hierarchy                                                                         |
| NFR-A11Y-09 | Automated checks      | No critical or serious issue from the automated scanner on any primary journey                                                                          |

**How to read these.** They are _design and implementation standards_, not a claim of
compliance. Conformance is asserted only after the `M10` audit, and even then only for
the pages and journeys actually tested, with the tooling recorded.

### 8.4 Availability, reliability and data integrity

| ID         | Requirement                                       | Target (proposed)                                                                                       |
| ---------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| NFR-AVL-01 | Availability                                      | Best-effort, dependent on free-tier hosting. **No uptime commitment is made**                           |
| NFR-AVL-02 | Graceful degradation                              | A failing non-essential block never breaks the page around it                                           |
| NFR-REL-01 | Failed writes are never silent                    | Every state-changing operation either confirms or reports failure with a reason                         |
| NFR-REL-02 | Multi-write operations are transactional          | 100 % of operations containing more than one write                                                      |
| NFR-REL-03 | Database and storage stay reconcilable            | A scheduled job reconciles staged objects against records; a mismatch is reported, not ignored          |
| NFR-REL-04 | Referential integrity is enforced by the database | All foreign keys declared with their tables, with explicit deletion behaviour                           |
| NFR-REL-05 | Concurrency is safe                               | Saving, downloading and moderating produce correct results under concurrent requests — asserted by test |

### 8.5 Scalability

| ID         | Requirement                         | Target (proposed)                                                                                                             |
| ---------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| NFR-SCA-01 | Vertical headroom                   | Serves the pilot cohort — order of hundreds of users and low thousands of resources — on free or entry tiers without redesign |
| NFR-SCA-02 | No architectural rewrite for growth | The first scaling step is a plan change or an index, not a re-architecture                                                    |
| NFR-SCA-03 | Queries are bounded                 | Every listing is paginated; no unbounded query exists in application code                                                     |
| NFR-SCA-04 | Storage growth is measured          | Bytes stored per account, and in total, are visible to the operator                                                           |

### 8.6 Maintainability and quality

| ID         | Requirement                                       | Target (proposed)                                                                                           |
| ---------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| NFR-MNT-01 | One command to run, test and build                | Documented scripts that work from a clean clone                                                             |
| NFR-MNT-02 | Type safety                                       | Strict type checking with no suppression comments in application code                                       |
| NFR-MNT-03 | Nothing hardcoded outside its designated file     | No colours, sizes or secrets outside the token file and the environment configuration — enforced by lint    |
| NFR-MNT-04 | Documentation accompanies change                  | Any milestone that changes behaviour updates its documents in the same change                               |
| NFR-MNT-05 | Onboarding cost                                   | A new developer reaches a running local environment in under 15 minutes by following the README             |
| NFR-MNT-06 | Security-critical modules are exhaustively tested | The policy module and the validation schemas (see roadmap §16.4)                                            |
| NFR-MNT-07 | Browser support                                   | The last two versions of the major Chromium, Firefox and WebKit engines, plus iOS Safari and Android Chrome |

### 8.7 Privacy, backup and recovery

| ID         | Requirement                      | Target (proposed)                                                                                       |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| NFR-PRV-01 | Data minimisation                | Email, display name and academic context only. No telephone number, no postal address, no date of birth |
| NFR-PRV-02 | Nothing private is public        | Email addresses and contact details never render on a public surface                                    |
| NFR-PRV-03 | Reporter anonymity               | A reported contributor can never determine who reported them, through any surface or message            |
| NFR-PRV-04 | User control                     | Deactivation, deletion and — post-MVP — export are available without contacting the operator            |
| NFR-PRV-05 | Retention                        | Every data category has a stated retention period (`D-010`), including logs                             |
| NFR-PRV-06 | Policy pages are public          | Acceptable use, copyright and takedown, and privacy are readable without an account                     |
| NFR-BAK-01 | Automated backup                 | The managed database's backup mechanism is enabled, and its retention period is recorded                |
| NFR-BAK-02 | **A restore has been performed** | At least once before release, verified and logged. An unrestored backup is not a backup                 |
| NFR-BAK-03 | Object storage is recoverable    | Uploaded documents are covered by a stated recovery approach, and its limits are documented honestly    |
| NFR-BAK-04 | Rollback is rehearsed            | A procedure exists and has been executed at least once (`M11`)                                          |

---

## 9. What "premium" means, concretely

"Premium" is otherwise a word that means nothing and costs everything. Here it is
defined as **thirteen statements that can each be tested and each be failed**.

| #      | Statement                                                                                                                 | How it is tested                                                                                                                |
| ------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| PRE-01 | **Nothing jumps.** The layout does not shift as content arrives.                                                          | Cumulative layout shift < 0.1 on every primary journey                                                                          |
| PRE-02 | **Every state is designed.** Loading, empty, error, partial and success exist for every data surface.                     | A checklist of the 15 MVP screens, each reviewed in `M4` and again in `M10`                                                     |
| PRE-03 | **There is one visual language.** No component invents its own colours, sizes or spacing.                                 | Lint forbids hardcoded values outside the token file                                                                            |
| PRE-04 | **It works for everyone.** Nothing depends on a mouse, on colour alone, or on perfect vision.                             | Automated scan clean; keyboard-only completion of three primary journeys; contrast verified with a tool                         |
| PRE-05 | **It works on a cheap phone on a slow connection** — the actual context, not an edge case.                                | Page-weight and interaction-time budgets measured on a throttled mid-tier profile                                               |
| PRE-06 | **It is fast where it matters.** Searching and opening a document are not delayed by anything incidental.                 | Server response under 500 ms at a stated corpus size; the viewer begins within 1 s of being requested                           |
| PRE-07 | **It never lies to the user.** No silent failures, no optimistic success on a write, no fake progress.                    | Deterministic failure paths are tested; every state-changing operation has an error path with a visible outcome                 |
| PRE-08 | **The empty states teach.** They name the exact control to use and offer exactly one action.                              | Manual review of all fifteen surfaces against the empty-state rule                                                              |
| PRE-09 | **The words are considered.** Plain nouns, specific errors, honest consequences in destructive confirmations.             | Reviewed against the voice table in the design system                                                                           |
| PRE-10 | **The data is trustworthy.** Every published resource carries complete metadata, and its file actually exists.            | Integrity assertions: no resource without a subject, category and stored object; the reconciliation job reports zero mismatches |
| PRE-11 | **It is defensible.** A copyright complaint has a documented path and a stated response window.                           | The runbook exists, and a takedown is executable in under five minutes without a deploy                                         |
| PRE-12 | **It earns trust quietly.** No dark patterns, no forced sign-up to view, no hidden unsubscribe, no countdowns.            | Browsing and search work without an account — asserted by test as a guest                                                       |
| PRE-13 | **The craft is consistent where it shows.** One icon family, one accent per screen, one type scale, both themes complete. | Visual review against the banned-effects list and the design-system rules                                                       |

### 9.1 What "premium" is **not**

Said explicitly, because these are the cheap substitutes this design exists to avoid:

| Not a signal of quality                                 | Why                                                                 |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| More animation                                          | Motion that delays reading makes a product feel slower, not better  |
| Gradients, glass effects, glows                         | They compete with the content, which is the only thing that matters |
| A huge feature list                                     | Features that half-work make the working parts feel unreliable      |
| A dashboard of statistics nobody acts on                | Decoration pretending to be function                                |
| A component library's default theme                     | The fastest route to looking like every other project               |
| A landing page that promises more than the product does | It costs trust exactly once, and then permanently                   |

---

## 10. Content policy and legal considerations

> **This section is a policy framework, not legal advice.** It identifies the decisions
> the owner must make and the risks they carry. It does not assert that any particular
> upload is lawful. If the platform grows beyond a small pilot, the owner should take
> qualified advice on copyright and data protection for their jurisdiction.

### 10.1 The position the platform takes

EDU-SHARE hosts material uploaded by its users. That creates obligations, and the honest
framing is this:

> **The platform does not claim that uploading third-party teaching material is
> permitted. It claims the right to remove it when asked, and the machinery to do so
> quickly.**

Being small does not remove the obligation; it changes only the scale. What a small
platform _can_ do is be genuinely responsive — which is why the takedown runbook is an
`M9` deliverable rather than a later concern.

### 10.2 The policy positions

| ID         | Position                                    | Detail                                                                                                                                                                                                                                                                                                                                                                                                   |
| ---------- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **POL-01** | **Ownership and attribution**               | A contributor retains ownership of what they upload and is credited by display name and date on every resource. By publishing, they grant the platform a non-exclusive, revocable licence to store, display and distribute the file **within the platform** (`D-011`). The platform never sells content and never grants rights it does not hold                                                         |
| **POL-02** | **Contributor declaration**                 | Before publishing, a contributor confirms that they have the right to share the file, that it is their own work, or that its licence permits redistribution. The declaration is recorded with the resource. It is a declaration, **not** a verification, and it is not treated as one                                                                                                                    |
| **POL-03** | **Copyright and takedown**                  | Publishing textbooks, paid question banks, or commercial course material without permission is **not** authorised. A rights holder can report a resource using a dedicated reason, and the platform publishes a contact route. On receipt, the resource is hidden and the contributor is notified. The response window is an owner decision (`D-012`), written into both the runbook and the policy page |
| **POL-04** | **Personal data inside uploaded documents** | Documents may contain names, roll numbers or signatures. Contributors are warned to remove personal data before uploading; a dedicated reporting reason exists; a confirmed exposure triggers takedown rather than discussion. The platform does **not** scan document contents for personal data in v1, and says so                                                                                     |
| **POL-05** | **Malicious files**                         | A document-only allow-list, forced download disposition, no inline rendering of anything executable, and a user-visible caution. **No malware scanning is available at this budget**, and that limitation is stated rather than hidden (`D-007`)                                                                                                                                                         |
| **POL-06** | **Prohibited content**                      | Illegal material, material that infringes copyright, exposed personal data, malware, harassment, and advertising or spam. **Additionally, and specific to this domain: live or leaked examination papers whose disclosure would compromise an assessment.** This category gets its own reporting reason and removal path, because it is the most likely serious complaint this platform will receive     |
| **POL-07** | **Reporting and moderation outcomes**       | Every report requires a controlled reason. Outcomes are: hidden, restored, dismissed, escalated. Reporters are told that a report was actioned, without learning anyone else's moderation detail. A contributor can dispute an outcome by replying to the notification, and an administrator reviews it                                                                                                  |
| **POL-08** | **Retention and deletion**                  | Content is soft-deleted for a fixed window and then purged (`D-008`). Account deactivation ends sessions and withdraws the public listing; the treatment of previously published resources is `D-008`. Logs have their own retention period (`D-010`)                                                                                                                                                    |
| **POL-09** | **The integrity of attribution**            | Copyright notices, author names and watermarks already present in a document are never stripped, and re-uploading another contributor's resource as one's own is a reportable offence                                                                                                                                                                                                                    |
| **POL-10** | **Abuse prevention**                        | Registration and sign-in are rate limited; uploads are quota-limited per account; a restricted account cannot publish or report. Quotas are stated on the upload screen rather than revealed on failure                                                                                                                                                                                                  |

### 10.3 Policy pages required for the MVP

Three pages, all reachable **without an account**, all linked from the resource detail
screen and the upload screen. They are deliverables of `M9`, not afterthoughts.

| Page                       | Must state                                                                                                                                                  |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Acceptable use**         | What may and may not be uploaded, including the leaked-examination-paper rule, and what happens to a policy breach                                          |
| **Copyright and takedown** | That third-party copyrighted material is not authorised, how to request removal, the contact route, and the committed response window                       |
| **Privacy**                | What data is collected and why, that telephone numbers and postal addresses are **not** collected, how long data is kept, and how a user exercises deletion |

### 10.4 What this framework deliberately does not do

| Not done                                                   | Reason                                                                                                                                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Claim that uploading past question papers is always lawful | It may be lawful for some institutions and jurisdictions and not for others. The platform does not adjudicate, and promising otherwise would be a false assurance |
| Use automated content matching or fingerprinting in v1     | No affordable service, and a false positive that removes a legitimate student's work does real damage                                                             |
| Offer legal indemnity to contributors                      | The platform has no capacity to stand behind such a promise                                                                                                       |
| Adopt a full notice-and-counter-notice process in v1       | It requires identity verification and a dispute process. In v1 the owner handles disputes manually, and the policy page says so                                   |
| Set out a licence for the **documents**                    | The contributor's own licence terms govern. The platform grants rights only over its own software                                                                 |

### 10.5 Deciding the policy positions

The positions above are proposals. `D-004` chooses between:

| Option                              | Description                                                    | Trade-off                                                                                                                  |
| ----------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **A. Pre-moderation**               | Nothing is published until a moderator approves it             | Highest safety; the platform cannot grow without moderator capacity, and PR-02's contribution loop is punished with a wait |
| **B. Post-moderation** _(proposed)_ | Published immediately, with reporting and a fast takedown path | The contribution loop works; some material is briefly visible before it is removed; requires the owner to be responsive    |
| **C. Restricted contribution**      | Only verified or manually approved contributors may publish    | Very low abuse; significantly limits the material available, and adds an approval step that must be staffed                |

**Proposed default: B**, because the platform's value depends on material existing, and
because the takedown machinery is a required deliverable either way. If the owner chooses
A or C, the affected requirements are `FR-RES-01`, `FR-MOD-03` and the `M7`/`M9`
milestones — and the roadmap's `M9` scope grows.

---

## 11. Owner decisions required

> **Silence is not approval.** A decision that is not answered keeps its provisional
> default, and the milestone records that the default is still provisional. Only the
> entries marked **BLOCKS** stop work.

### 11.1 Blocking decisions

| ID               | Question                                                                                                                         | Why it matters                                                                            | Options                                                                                  | Trade-offs                                                                                                                                             | Proposed default                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| **D-001 BLOCKS** | Which architecture?                                                                                                              | Determines every subsequent technical decision and the shape of every milestone from `M3` | A — integrated TypeScript; B — decoupled front end and API; C — backend-as-a-service led | See [ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md) §3–§5                                                                                       | **A**, as recommended and justified in §6 of that document                                                                     |
| **D-002 BLOCKS** | Which managed database, and is a paid tier ever acceptable?                                                                      | Determines cost, the free-tier ceiling, and whether a migration is needed later           | A free-tier managed PostgreSQL; a self-hosted container; a paid tier from the start      | Free tiers have small storage — 0.5 GB on the smallest documented tier — and may pause when idle; self-hosting costs operational time                  | Free-tier managed PostgreSQL, with the storage layer kept portable                                                             |
| **D-005 BLOCKS** | Where does the application run, given that the main free hosting plan is documented as **non-commercial and personal use only**? | The platform may be judged to exceed "personal use", and monetisation certainly would     | The free hosting plan; a container host on a small paid tier; a self-hosted server       | Free is free, but the terms are a real constraint and a later migration is work; a container host costs a few dollars a month and removes the question | Decide at `M2`. If the use is judged non-commercial, start free but keep container-portability; otherwise use a container host |

### 11.2 Decisions that shape scope and policy

| ID        | Question                                                                                     | Why it matters                                                                  | Options                                                                                                                  | Trade-offs                                                                                                       | Proposed default                                                                                                   |
| --------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **D-003** | Is "AI-assisted" in scope for v1?                                                            | Affects scope, cost and the moderation surface                                  | In v1; post-MVP only; never                                                                                              | v1 AI adds cost, latency and a dependency before there is content to assist with; post-MVP keeps the option open | **Post-MVP only**, with the architectural constraint recorded (`ADR-005`)                                          |
| **D-004** | Open uploads, or moderated before publication?                                               | Determines the contribution loop and the moderation workload                    | Pre-moderation; post-moderation; restricted contribution                                                                 | See §10.5                                                                                                        | **Post-moderation**, with reporting and a fast takedown                                                            |
| **D-006** | Can a moderator permanently delete, or only hide?                                            | Determines the blast radius of a moderator's mistake                            | Moderate-and-hide only; moderate-and-delete                                                                              | Hiding is reversible; deletion is not                                                                            | **Hide only for moderators**; permanent deletion is administrator-only                                             |
| **D-007** | How is malware risk handled when scanning is not affordable?                                 | An uploaded document could harm a user, and the platform would have accepted it | Compensating controls only; a paid scanning service; disable uploads until scanning is affordable                        | Disabling uploads removes the product's purpose; paid scanning costs money the project does not have             | **Compensating controls only**, documented as a known limitation in the policy pages                               |
| **D-008** | What happens to a contributor's resources when the account closes, or a resource is deleted? | Determines retention, attribution, and what other users lose                    | Retain with attribution; anonymise; remove entirely                                                                      | Removing orphans other people's saves; retaining keeps a person's work public after they leave                   | **Retain with attribution**, anonymise the display name if requested; soft-delete, then purge after a fixed window |
| **D-009** | What personal data is collected?                                                             | Determines the privacy obligation and the exposure surface                      | Minimal (email, display name, academic context); extended (adds contact details)                                         | Extended data has no product use and increases exposure if the database leaks                                    | **Minimal**, as specified in `NFR-PRV-01`                                                                          |
| **D-010** | How long are access logs and audit events retained?                                          | The fastest-growing data on the smallest free tier                              | 30 days; 90 days; indefinite                                                                                             | Indefinite will exhaust the free tier; too short weakens the ability to investigate abuse                        | **90 days**, with moderation audit records retained longer                                                         |
| **D-011** | What licence do contributors grant the platform?                                             | Without a stated grant, hosting and displaying an upload is legally awkward     | A narrow, revocable, non-exclusive licence to store, display and distribute within the platform; a broader licence; none | A broader licence invites hostility and is not required by the product                                           | **The narrow, revocable licence**, stated on the upload screen and in the policy pages                             |
| **D-012** | What takedown response window does the owner commit to?                                      | It becomes a public promise to rights holders                                   | 24 hours; 72 hours; 7 days                                                                                               | Shorter is stronger but must be sustainable during exams and holidays                                            | **72 hours**, stated on the copyright page and in the runbook                                                      |

### 11.3 The owner approval checklist

To answer in one message. Copy the block, replace each choice, and return it.

```
D-001 architecture ................. [A] integrated TypeScript   [B] decoupled API      [C] BaaS-led
D-002 database ..................... [A] free managed Postgres   [B] self-hosted         [C] paid from start
D-003 AI scope ..................... [A] post-MVP only           [B] in v1               [C] never
D-004 content policy ............... [A] pre-moderated            [B] post-moderated     [C] restricted contribution
D-005 hosting ...................... [A] free tier if non-commercial   [B] small paid container host
D-006 moderator power .............. [A] hide only                [B] hide and permanently delete
D-007 malware handling ............. [A] compensating controls, limitation stated   [B] pay for scanning
D-008 resource after account closes  [A] retain with attribution   [B] anonymise         [C] remove
D-009 personal data collected ...... [A] minimal                  [B] extended
D-010 log retention ................ [A] 90 days                  [B] 30 days           [C] other: ______
D-011 contributor licence grant .... [A] narrow and revocable      [B] broader           [C] none
D-012 takedown response window ..... [A] 72 hours                 [B] 24 hours          [C] 7 days

Please also confirm:
  [ ] The architecture recommendation (Option A) is   APPROVED / NEEDS REVISION
  [ ] The MVP scope in §6.2 is                        APPROVED / see comments
  [ ] The role model in §5 (no self-selected roles) is APPROVED
  [ ] May I proceed to M3 once D-001, D-002 and D-005 are answered?
```

---

## 12. Assumptions and open questions

### 12.1 Assumptions carried until the owner answers

| #   | Assumption                                                | Marked as      | Reversal cost                                                                 |
| --- | --------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------- |
| A-1 | Architecture is Option A (integrated TypeScript)          | `[ASSUMPTION]` | High after `M5`, low before `M3` — which is why approval comes first          |
| A-2 | Content policy is post-moderation                         | `[ASSUMPTION]` | Low: it changes the publish path and the moderation queue, not the data model |
| A-3 | AI is out of the MVP                                      | `[ASSUMPTION]` | Low                                                                           |
| A-4 | The free tier is sufficient for the pilot                 | `[ASSUMPTION]` | Low–medium: a plan change, if the architecture keeps storage portable         |
| A-5 | A single owner-administrator is enough                    | `[ASSUMPTION]` | Low                                                                           |
| A-6 | Publication is in English                                 | `[ASSUMPTION]` | Low, but retrofitting internationalisation is not                             |
| A-7 | Students will accept an email-verified account to publish | `[ASSUMPTION]` | Low: verification can be relaxed with a recorded trade-off                    |
| A-8 | The pilot audience is one or two institutions             | `[ASSUMPTION]` | Low: the schema is multi-institution from the start                           |

### 12.2 Genuinely open questions (not needed for approval)

| #   | Question                                                                | Why it can wait                                                                          | When it must be answered                 |
| --- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------- |
| Q-1 | Should the platform eventually support a native mobile app?             | It does not change the v1 architecture, and `ADR-001` records the trigger for revisiting | When mobile becomes a requirement        |
| Q-2 | Should institution-following and a personalised feed return?            | Post-MVP candidate; the inherited half-built version is not a reason to finish it        | After the core loop is used and measured |
| Q-3 | Is full-text search **inside** documents worth the extraction pipeline? | The clearest post-MVP upgrade, but it needs a pipeline and storage headroom first        | After search is used in practice         |
| Q-4 | Should contributor reputation or badges exist?                          | Needs a trustworthy base of activity before it can mean anything                         | After several months of real use         |
| Q-5 | Should the platform be monetised?                                       | It changes hosting terms (`D-005`), the legal posture, and moderation obligations        | Before any commercial step               |
| Q-6 | Should the taxonomy be seeded centrally, or grow from user requests?    | Both paths exist in the requirements; the balance is a judgement based on usage          | During `M6` and after launch             |

---

## 13. Summary of this document

| Item                        | State                                                                    |
| --------------------------- | ------------------------------------------------------------------------ |
| Personas defined            | 5, plus 4 explicit non-personas                                          |
| Roles defined               | 3 (`user`, `moderator`, `admin`), plus two orthogonal account states     |
| Capability matrix           | 27 capabilities × 4 actors                                               |
| Functional requirements     | 76, each with an ID, priority, acceptance criteria and dependencies      |
| Non-functional requirements | 46, all targets and none measured                                        |
| "Premium" defined           | 13 testable statements, plus an explicit list of what premium is **not** |
| Policy positions            | 10, plus 3 required policy pages                                         |
| Owner decisions             | 12, of which 3 block implementation                                      |
| Assumptions recorded        | 8                                                                        |
| Open questions              | 6                                                                        |
| Code written                | **None**                                                                 |
| Dependencies installed      | **None**                                                                 |

_End of requirements. Every priority, target and acceptance criterion in this document is
a proposal pending owner approval. No requirement stated here is implemented._
