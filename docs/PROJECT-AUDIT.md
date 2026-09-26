# PROJECT AUDIT — EDU-SHARE

| Field | Value |
| --- | --- |
| **Status** | Audited — proposed findings, pending owner approval |
| **Last reviewed** | 2026-09-26 |
| **Audit subject** | The inherited EDU-SHARE application (PHP/MySQL) written by a third party |
| **Audit scope** | Read-only static inspection of the inherited source plus the Git/GitHub state of this repository |
| **Auditor** | AI development agent (Cline), for the project owner (Chirayu Babu Jaysawal) |
| **Companion documents** | [PROJECT-HANDOVER.md](./PROJECT-HANDOVER.md) · [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) · [ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md) · [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) |

---

## 1. Purpose and method

This audit performs three jobs:

1. **Establish the truth** about what the inherited application is, what it actually
   does, and where it is broken — separating verified facts from claims.
2. **Rank the defects** so that the replacement architecture is designed against
   known problems rather than in ignorance of them.
3. **Draw a firm legal and technical boundary** between *product ideas* that may be
   reused freely and *source code* that may not.

### 1.1 Evidence conventions

| Label | Meaning |
| --- | --- |
| **VERIFIED** | Confirmed directly by inspecting a file, its hash, or the GitHub API during this audit. |
| **REPORTED** | Recorded in `PROJECT-HANDOVER.md` from a prior inspection session and not re-inspected here (used only where re-inspection was forbidden or impractical). |
| **INFERRED** | A technical conclusion strongly supported by the evidence, but not conclusively proven. |
| **UNKNOWN** | Evidence is insufficient to make any claim. |

Every finding carries a `AUD-nnn` identifier so that requirements, risks, and
roadmap items can reference it.

### 1.2 Methods used

- Directory and file enumeration of the inherited checkout.
- Targeted text search across all `*.php` files for authentication, session,
  cookie, SQL, upload, and output-encoding patterns.
- Full reads of the authentication, upload, download, favourites, dashboard, and
  admin paths.
- SHA-256 hashing to detect duplicated files.
- GitHub CLI queries for repository identity.

### 1.3 What was deliberately **not** done

- The inherited database dump (`project.sql`) was **not opened, parsed, printed,
  copied, or committed**. A prior session established that it contains real
  personal data and password hashes; this audit does not re-inspect it and does
  **not** reproduce any record from it. Findings that depend on it are labelled
  **REPORTED**.
- The inherited application was **not executed**, and no database migration,
  connection, or live service was touched. No package was installed and no
  inherited file was modified.

---

## 2. Executive summary

**In one paragraph.** The inherited EDU-SHARE application is a PHP 8 / MySQL
student project that implements a real and worthwhile product idea — cross-institution
sharing of academic material — with a reasonable screen layout and a decent instinct
for password hashing. It is, however, **not shippable and not even runnable as
delivered**. Its file layout is internally inconsistent, one of its files is not valid
PHP at all, several of its security controls are absent entirely, and its central
database constraint (`courses.name` is globally unique) directly contradicts the
product's own reason to exist. It contains hardcoded database credentials, stores
uploaded documents inside the web-served directory with no real authorization check
on download, and — most seriously — exposes an **unauthenticated arbitrary file read**
through a profile page.

**What that means for the new project.** None of these are reasons to abandon the
idea; the idea is the valuable part. They are reasons to **write the new platform
from scratch** with the security boundary designed in from the first commit, and to
treat the inherited code purely as evidence of what the product should *do*, never as
a template for how to do it.

### 2.1 Headline numbers

| Metric | Result |
| --- | --- |
| Inherited files inspected | 24 (`23` PHP + `1` SQL dump + README) |
| **Critical** findings | 2 |
| **High** findings | 6 |
| **Medium** findings | 9 |
| **Low / informational** findings | 6 |
| Files with hardcoded database credentials | 3 |
| Files containing any CSRF defence | **0** |
| Files containing any transaction control | **0** |
| Files setting cookie or security headers | **0** |
| JSON endpoints reachable without authentication | 4 |
| Test files, CI configuration, dependency manifests | **0** |
| Files with a detectable licence | **0** |

### 2.2 The three findings that most change the plan

1. **AUD-001 — unauthenticated arbitrary file read.** A request to
   `teacher_profile.php?file=…` reaches the file-serving branch *before* any
   authentication check, and the supplied value is concatenated into a filesystem
   path with no `basename()` sanitisation. This is the kind of defect that must
   never be re-created; the replacement design therefore treats *every* file read
   as an authorised, audited server action.
2. **AUD-002 — privilege escalation by self-selected role.** Registration lets a
   user pick `teacher`; the admin panel authorises purely on that stored value.
   The replacement design therefore makes elevated roles **unassignable by the
   user** and always granted by an existing administrator.
3. **AUD-010 — a globally unique course name.** This is a *product* defect, not a
   security one, and it is the single clearest example of a database decision that
   silently forbids the product's core premise. The replacement schema scopes
   uniqueness to an institution.

---

## 3. Existing application inventory

### 3.1 Technology inventory (VERIFIED unless noted)

| Layer | Technology | Evidence |
| --- | --- | --- |
| Language | PHP 8 with the `mysqli` extension | `<?php` sources, `new mysqli(...)`, `->prepare()` |
| Database | MySQL / MariaDB, InnoDB, `utf8mb4` | REPORTED from dump header; consistent with `mysqli` usage |
| Templating | None — server-rendered HTML with inline PHP; `<head>` and `<nav>` duplicated per file | every page file |
| CSS | Tailwind CSS **via the CDN play script** (`cdn.tailwindcss.com`) plus inline `<style>` | all page files |
| Icons | Font Awesome 6.4.0 via CDN | page files |
| Fonts | Google Fonts — Poppins on some pages, Inter on others | `mainhome.php` vs `lib.php` |
| Client JS | Vanilla JS `fetch()` against ad-hoc JSON endpoints | `homepage.php`, `favorites.php` |
| Auth | PHP native sessions; `password_hash` / `password_verify` with `PASSWORD_DEFAULT` | `login1.php`, `register.php` |
| Dependency management | **None** — no `composer.json`, no `package.json` | VERIFIED: no manifests found |
| Tests / CI | **None** | VERIFIED |
| Licence | **None** | VERIFIED |

The Tailwind CDN play script is documented by Tailwind as unsuitable for
production, and the mixed font stacks mean the inherited UI never had a single
visual identity.

### 3.2 File-level inventory

| File | Intended role | Verified state |
| --- | --- | --- |
| `admin.php` | Academic admin panel (add/update/delete university → department → course → subject) | **Not valid PHP** — line 1 is a literal Markdown fence, then `<?php`. Redirects to `manage_academics.php`, which does not exist in the checkout. |
| `dashboard.php` | Personal dashboard: own uploads, favourited materials, followed institutions | Logic complete and readable; links uploaded files by direct web path (AUD-007) |
| `db_connect.php` | Shared DB connection | Hardcoded credentials (AUD-006) |
| `delete_material.php` | Delete own upload | Ownership check present (good); GET-driven and unprotected (AUD-004/005); deletes row then file with no transaction (AUD-014) |
| `download.php` | Serve / preview a stored file | Session check **and** `basename(urldecode(...))` — the sound pattern in the codebase; path assumes an absent directory layout |
| `favorites.php` | Favourites screen | Session check; AJAX toggles; links a non-existent `../profile/download.php` (REPORTED) |
| `get_courses.php`, `get_departments.php`, `get_subjects.php`, `get_universities.php` | JSON lookups for cascading selects | Prepared statements; **no authentication check** (AUD-016) |
| `homepage.php` | "All materials" feed, search box, institution-follow toggle | Reads the denormalised `materials.subject` text column while other pages join the `subjects` table — the same data is modelled two ways (AUD-009) |
| `lib.php` | Library / browse screen with filters | Joins `subjects` correctly; the favourite action is a GET link |
| `login1.php` | Login | bcrypt verify + `session_regenerate_id(true)` (good); inline credentials; distinguishes unknown email from wrong password (AUD-015); redirects to a non-existent `profile/profile.php` when already signed in |
| `logout.php` | Logout | Destroys session and cookie; GET-triggerable (AUD-019) |
| `mainhome.php` | Public landing page | Never loads the database; gradient hero; links into `../home/`, `../login/`, `../register/` |
| `process_upload.php` | Upload handler | Extension-only validation, 10 MB cap, 2-file cap; escapes input *before* storing (AUD-013); no transaction |
| `project.sql` | Database dump | **Not inspected in this audit** — contains personal data and password hashes (AUD-022) |
| `register.php` | Registration | Inline credentials; the user self-selects the `teacher` role (AUD-002); auto-creates institutions by name; no email verification |
| `teacher_profile.php` | Public profile + inline file serving | **Contains no authentication check at all**; its file branch concatenates user input into a filesystem path (AUD-001) |
| `toggle_favorite.php` | Toggle a saved material | GET-driven state change |
| `toggle_university_favorite.php` | Toggle a followed institution | POST + JSON; no anti-CSRF token |
| `university_teachers.php` | Intended "teachers at this university" listing | **Byte-identical duplicate** of `toggle_university_favorite.php` (SHA-256 `030cfa601f823cce55dc2e938814d53bfdb4533919401f6c943fdcc6abfd962f`). The feature it names does not exist (AUD-011) |
| `upload.php` | Upload form | Populates a department list with **no institution scoping**; Tailwind CDN |

---

## 4. Existing functionality

Functionality is classified as **Working**, **Partial**, **Broken**, or **Absent**.
"Working" means the code path is internally coherent — it does **not** mean the
application runs, because the directory layout is broken (AUD-012).

| Area | Status | Verified detail |
| --- | --- | --- |
| Registration | **Partial** | Collects role, name, email, password, institution name, department name, contact, address, and student branch/year; creates missing institution and department rows on the fly. No email verification, no password-strength rule, no explicit duplicate-email error path, and the role is self-selected (AUD-002). |
| Login | **Partial** | Prepared lookup by email, `password_verify`, session-ID rotation, session variables set, redirect. No lockout, no rate limit, no password reset, no email-verification requirement. |
| Logout | **Working** | Clears the session array, expires the cookie, destroys the session. |
| Academic organisation (university → department → course → subject) | **Broken** | Only an admin path manages this, and that path is not valid PHP (AUD-003). Elsewhere the taxonomy is created implicitly and inconsistently — by registration and by upload. |
| Admin operations | **Broken** | `admin.php` cannot execute as written, and it redirects to a file that is not present. Its authorisation is the privilege-escalation flaw in AUD-002. |
| Upload | **Partial** | A reasonable two-phase form with cascading selects and "create new course/subject" affordances. The handler validates extension and size only, then writes the file **before** the database row (AUD-008, AUD-014). |
| Download / preview | **Partial** | Two competing implementations — `download.php` (authorised and sanitised) versus direct web-path links from `dashboard.php` (unauthorised, AUD-007) — plus a third, unsafe implementation inside `teacher_profile.php` (AUD-001). |
| Saved materials | **Partial** | Toggle works; a unique constraint on (user, material) was reported. Triggered by a GET link from `lib.php` and by POST JSON from `homepage.php` — two mechanisms for one action. |
| Followed institutions | **Partial** | POST JSON toggle. The near-identical `university_teachers.php` appears to be an abandoned copy of it (AUD-011). |
| Profiles | **Broken** | `teacher_profile.php` renders profile data only for the "teacher" case, and serves files without authentication. No self-service profile editing exists anywhere in the checkout. |
| Search | **Partial** | `homepage.php` and `lib.php` build `LIKE '%term%'` predicates over title, description, course, and department. No ranking, no snippet or highlight, no typo tolerance, no result count, no pagination. |
| Browsing by taxonomy | **Partial** | Filters exist for institution, semester, course, and subject, but depend on data consistency that the write paths never guarantee. |
| Teacher directory | **Absent** | The file named for it contains no such logic (AUD-011). |
| Reporting / moderation | **Absent** | No report entity, no moderator role, no takedown workflow, no content policy. |
| Notifications | **Absent** | No email, in-app, or webhook notification of any kind. |
| Accessibility | **Absent** | No focus management, no landmark usage, no visible focus styling, no form-error association, no skip link (see §8). |

### 4.1 What the product actually does, as one flow

A visitor lands on `mainhome.php`, registers (choosing their own role), is sent to a
dashboard, browses institutions on `homepage.php`, drills into `lib.php` with
filters, opens or downloads a file, uploads their own material through a single form
that simultaneously defines the academic taxonomy, and can "favourite" both
materials and institutions.

**Every step is implemented somewhere, and none of it is implemented safely or
consistently.** That sentence is the reason this project is a rewrite rather than a
repair.

---

## 5. Application architecture and its limitations

### 5.1 What the architecture actually is

A **flat, page-per-action, request–response PHP application with no framework**:

- **No router.** The URL *is* the filename (`lib.php`, `toggle_favorite.php`).
- **No shared layout.** Each page emits its own `<html>`, `<head>`, and `<nav>`.
- **No domain or service layer.** Business logic lives inline in the page that
  triggered it, so a query two pages need is written twice, differently.
- **No configuration layer.** Credentials are string literals in three files.
- **No autoloading, no dependency injection, no error strategy** beyond `die()`.
- **State changes are direct SQL inside the request handler**, and files are written
  straight to the filesystem with `move_uploaded_file()`.
- **A "view" inseparable from the controller and the model.**

### 5.2 Why this architecture produced exactly these defects

The findings are not bad luck. They are the predictable output of this structure.

| Structural property | Defect it produced |
| --- | --- |
| No shared request pipeline | Anti-forgery, authorisation, and session validation must be remembered per file. They were remembered **zero** times. → AUD-004, AUD-016 |
| No shared layout or components | Fifteen copies of the navigation, two body fonts, and per-page hardcoded colours. → AUD-021 |
| No schema owner | Two representations of "the subject of this material". → AUD-009 |
| No transactions | Writes are ordered by hand; a failure between steps orphans rows and files. → AUD-014 |
| No configuration | Credentials inside source. → AUD-006 |
| No build or type checking | Nothing detects a broken `require` path, or a redirect to a file that does not exist. → AUD-012 |
| No tests | Nothing detects that a file named for one feature contains a different feature entirely. → AUD-011 |
| No authorisation layer | The only role check in the codebase is a session value the user picked at signup. → AUD-002 |

### 5.3 The architectural conclusion

**None of these defects can be fixed by editing files in place.** In every case the
fix is a *layer that does not exist*, not a *line that is wrong*: a request pipeline,
a policy module, a schema owner, a configuration layer, a test suite. Adding those
layers to procedural PHP with no framework means rewriting the application.

The replacement is specified in
[ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md); the sequencing that makes it
safe is in [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) §3.

---

## 6. Database model

> **Constraint on this section.** The inherited database dump is **not** opened or
> reproduced by this audit, because it contains personal data and password hashes.
> Everything below about tables, columns and constraints is therefore labelled
> **REPORTED** (established in `PROJECT-HANDOVER.md` §4 in a prior session), while
> everything about how the code *uses* those structures is **VERIFIED** from the
> source. No record, name, address, email address, telephone number, or password hash
> appears anywhere in EDU-SHARE's documentation.

### 6.1 Reported table inventory

Database `project`; InnoDB; `utf8mb4`; foreign keys added afterwards via `ALTER TABLE`
rather than declared inline.

| Table | Purpose | Notable columns and constraints |
| --- | --- | --- |
| `users` | Accounts | `full_name`, `gmail` (UNIQUE), `password`, `user_type`, `university_id`, `department_id`, `branch`, `year`, `contact`, `address` |
| `universities` | Institutions | `name` UNIQUE |
| `departments` | Departments | `name`, `university_id`, `branch_id`; UNIQUE (`university_id`, `name`) |
| `branches` | Campuses | One seed row |
| `courses` | Programmes | `name` **globally UNIQUE**, `university_id`, `department_id` |
| `subjects` | Subjects | `name`, `course_id`, `department_id`, `semester` |
| `materials` | Uploaded files | `title`, `description`, `file_path`, `university_id`, `department_id`, `course_id`, `subject_id`, `semester`, `user_id`, `upload_group_id`, `branch_for` (NOT NULL, unused) |
| `material_favorites` | Saved materials | UNIQUE (`user_id`, `material_id`); two duplicate timestamp columns |
| `university_favorites` | Followed institutions | UNIQUE (`user_id`, `university_id`) |
| `user_favorites` | **Orphan table** | No foreign key, referenced by no code |

### 6.2 Relationships as the code actually uses them

- A user belongs to one institution and one department.
- A department belongs to an institution.
- A programme belongs to an institution **and** a department.
- A subject belongs to a programme **and** a department, and carries a semester.
- A material belongs to a user, an institution, a department, a programme, a subject
  **and** a semester — five parent relationships, three of which are derivable from
  the subject alone. That redundancy is the structural cause of AUD-009.

**INFERRED:** because foreign keys are attached by later `ALTER TABLE` statements
rather than declared with their tables, some constraints may never have been applied
on the running database. The orphan `user_favorites` table — no foreign key, no code
reference — is evidence that schema management was manual and incomplete.

### 6.3 Uniqueness constraints and the multi-institution problem

| Constraint | Assessment |
| --- | --- |
| `universities.name` UNIQUE | Acceptable |
| `departments` UNIQUE (`university_id`, `name`) | **Correct** — scoped to the parent. This is how the other tables should have been built |
| `courses.name` **globally UNIQUE** | **AUD-010, the architectural blocker.** The first institution to create "Computer Engineering" owns that name globally |
| `subjects` keyed by (`name`, `course_id`) | Partly right, but the semester is excluded from the key even though the product treats semester as part of a subject's identity |

**What AUD-010 actually does.** When a second institution creates a programme whose
name already exists, one of two things happens, and both break the product premise:

1. The database rejects the insert, so the second institution cannot describe itself,
   and the platform has silently become single-institution.
2. **Worse:** `process_upload.php` looks up an existing course **without scoping by
   institution** (VERIFIED: `SELECT id FROM courses WHERE name = ?`). The new
   programme is therefore attached to a *different institution's* programme, and
   resources are filed under the wrong institution with no error shown to anyone.

---

### 6.4 Data-integrity findings

| # | Finding | Status | Impact |
| --- | --- | --- | --- |
| DB-1 | A material's semester exists in two unrelated columns — `materials.semester` and `subjects.semester` — with nothing tying them together | REPORTED | The same resource can claim two different semesters depending on which screen reads it |
| DB-2 | `materials.subject` is a denormalised text column used by `homepage.php`, while `lib.php` and `dashboard.php` join the `subjects` table | **VERIFIED** | Two screens show different subject names for the same resource; the feed shows a blank where the library shows the real value |
| DB-3 | The denormalised columns `user_course_name` and `user_subject_name` are never written | REPORTED | Dead schema that misleads future readers |
| DB-4 | `subjects.semester` is NOT NULL with no default, and the upload path never supplies it | REPORTED | Subject creation fails at runtime |
| DB-5 | `materials.branch_for` is NOT NULL and unused | REPORTED | An insert must supply a meaningless value to succeed |
| DB-6 | Duplicated timestamp columns on the favourites table | REPORTED | Two sources of truth for one fact |
| DB-7 | Registration creates institutions and departments from free text (`getOrCreateAffiliationID`) | **VERIFIED** | Ten users can produce ten spellings of one university, permanently, with no deduplication path |

### 6.5 Deletion and cascading behaviour

**VERIFIED:** `admin.php` deletes taxonomy rows with a bare `DELETE FROM … WHERE id = …`
and **ignores the return value** of `$conn->query()`. A delete blocked by a foreign key
and a delete that succeeded are therefore indistinguishable — the code redirects as
though it worked either way, and the user is shown a success-looking page for an
operation that did not occur. **This is a silent-failure defect, not merely a missing
error message.**

**UNKNOWN:** whether the `ALTER TABLE`-added foreign keys declare `ON DELETE`
behaviour at all, and therefore whether deleting a programme silently orphans or
cascades over its subjects and materials. This must be resolved before any data
migration is contemplated — and it is a further reason the replacement schema declares
deletion semantics explicitly.

### 6.6 The database verdict

The inherited schema is not a design; it is an accumulation. Each table was shaped by
whichever page first wrote to it, and the result is redundant parent links, duplicated
facts, half-applied constraints, and one global constraint that forbids the product's
own premise.

**Required properties of the replacement schema** — implemented in `M3` and `M6`,
specified in [ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md) §8:

| # | Property | Fixes |
| --- | --- | --- |
| 1 | Every uniqueness constraint is **scoped to its parent** | AUD-010, DB-7 |
| 2 | Every fact has **exactly one canonical home** | DB-1, DB-2, DB-6 |
| 3 | Deletion behaviour is **declared explicitly** — `RESTRICT` by default, soft deletion for content | §6.5 |
| 4 | A non-nullable column must have a source that supplies it | DB-4, DB-5 |
| 5 | Structural metadata is **required at upload** and enforced by the database, not by convention | AUD-009 |
| 6 | Foreign keys are declared **with** their tables, inside a versioned migration | §6.2 |
| 7 | A failed write is **never silent** — every result is checked | §6.5 |

---

## 7. Security audit

### 7.1 Method and framing

Every control below was checked by searching the entire source for its presence and
then reading the relevant files in full. "Absent" means **no occurrence of the control
was found anywhere in the 23 PHP files** — a stronger statement than "not observed on
one path".

A note on proportion: this audit reports what is present or missing, not what might be
exploited in a live deployment. The application cannot run as delivered (AUD-012), so
nothing here is a claim about live exploitation. The purpose is to establish which
*design mistakes* must not be repeated.

### 7.2 Authentication and session handling

| Control | Finding | Status |
| --- | --- | --- |
| Password hashing | `password_hash` with `PASSWORD_DEFAULT` at registration, `password_verify` at sign-in — correct choices | **VERIFIED — good** |
| Prepared statement for the credential lookup | Present; the email is bound, not concatenated | **VERIFIED — good** |
| Session identifier rotation on sign-in | `session_regenerate_id(true)` is called on successful authentication | **VERIFIED — good** |
| Session cookie attributes | No `session_set_cookie_params` anywhere; no `SameSite`, no `Secure`, no explicit `HttpOnly` configuration | **VERIFIED — absent** |
| Session expiry | No idle or absolute expiry configured | **VERIFIED — absent** |
| Server-side session revocation | Sign-out destroys the session, but there is no way to end another session administratively | **VERIFIED — absent** |
| Sign-in throttling or lockout | No counter, no delay, no lockout | **VERIFIED — absent** |
| Account enumeration | Sign-in returns different messages for "No account found with that email." and "Invalid password." | **VERIFIED — defect (AUD-015)** |
| Email verification | None | **VERIFIED — absent** |
| Password reset | None — a user who forgets a password has no recovery path | **VERIFIED — absent** |
| Password strength rules | None; a one-character password is accepted | **VERIFIED — absent** |
| Credential handling in source | Credentials are string literals in three files (AUD-006) | **VERIFIED — defect** |

**Assessment.** The *cryptographic* choices are sound; the *lifecycle* is missing
entirely. There is no way to recover an account, no way to slow an attacker, and no
way to end a session except by the user choosing to log out.

### 7.3 Authorisation and privilege boundaries

**VERIFIED — this is the most serious class in the audit.**

| Finding | Detail |
| --- | --- |
| **Self-selected role (AUD-002)** | `register.php` accepts `role` from the registration form, including `teacher`, and stores it as `user_type`. Any visitor can create an account holding the value that authorises destructive actions |
| **The destructive authorisation is exactly that value** | `admin.php` authorises on `$_SESSION['user_type'] !== 'teacher'` and nothing else — no second factor, no approval step, no separate administrator identity |
| **No role model beyond one string** | No administrator, no moderator, no capability concept, and no record of who changed what |
| **Endpoints with no authorisation at all** | Four JSON catalogue endpoints require no session: `get_universities.php`, `get_departments.php`, `get_courses.php`, `get_subjects.php` (AUD-016) |
| **Controls that do not exist** | No ownership helper, no policy module, no audit log, no soft deletion, no per-endpoint authorisation review |

**The precise chain.** Anyone can register → select "Teacher" → their session carries
`user_type = 'teacher'` → `admin.php` authorises them → they can delete departments,
courses and subjects shared by every user on the platform. Nothing prevents it, and
nothing records it afterwards.

**Cross-reference.** This is the finding that most shapes the proposed architecture. It
is why [ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md) §8.2 requires a single
`can()` module, and why [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) §5.2
states that a role is never accepted from client input.

### 7.4 SQL injection

**Verdict: substantially better than the previous handover claimed, with one
correction that matters.**

| Location | Finding | Status |
| --- | --- | --- |
| `admin.php` delete handlers | Interpolate `$id` directly into `DELETE` statements — **but** `$id` is immediately cast with `intval()`, and `$type` is compared against string literals | **Not injectable. The earlier "SQL injection in admin.php" claim is hereby corrected** |
| All dynamic filter building (`lib.php`, `homepage.php`) | Prepared statements with correctly accumulated type strings and bound parameters | **VERIFIED — good** |
| Upload-path lookups (`process_upload.php`) | Prepared statements; the course and subject identifiers are bound | **VERIFIED — good** |
| `register.php`'s `getOrCreateAffiliationID($conn, $tableName, …)` | Interpolates the **table name** and a **column name** into SQL | Internal constants only, so not currently exploitable — but it would become injectable the moment a caller passes anything derived from input |
| Unauthenticated catalogue endpoints | Values are cast to `int` before binding | Not injectable |

**Assessment.** The codebase uses prepared statements broadly — 42 `prepare(` call
sites were counted — and the dynamic query construction is handled correctly. The
residual risk is a *pattern* risk in one helper, not a live injection.

**Why this correction matters.** An audit that overstates one finding invites
scepticism about the others. The serious findings here are the unauthenticated file
read, the privilege escalation, and the missing lifecycle controls — not SQL
injection.

### 7.5 Cross-site scripting and output encoding

| Finding | Status |
| --- | --- |
| Most dynamic output uses `htmlspecialchars()` — the habit is present and mostly applied | **VERIFIED — good** |
| `process_upload.php` escapes **before storing** (`htmlspecialchars($_POST['title'])`), so encoded text is written to the database and then encoded again on output | **VERIFIED — defect (AUD-013)** |
| `teacher_profile.php` renders literal `**Department:**` Markdown inside HTML output | **VERIFIED — the same Markdown contamination as `admin.php`'s code fence, here cosmetic** |
| Several attributes interpolate database values without a quoting context (`value="<?= $row['id'] ?>"`) | **VERIFIED — low risk today because the values are integers, but the pattern is unsafe** |
| No Content-Security-Policy header | **VERIFIED — absent** |
| No `X-Content-Type-Options: nosniff` | **VERIFIED — absent** |

**Why escaping-before-storage is a real defect, not pedantry.** It is a correctness
bug with a security consequence: stored text is no longer the text the user typed, so
searches for it fail, exports contain entities, and any future consumer of that data
(an API, a search index, a PDF export) must remember to decode it. The rule violated
is simple and worth carrying forward: **escape on output, store what the user meant.**

### 7.6 Cross-site request forgery

**VERIFIED — absent everywhere.** A search for `csrf`, `xsrf`, and `nonce` across all
23 PHP files returns **zero** matches.

The inherited app does not merely lack protection; it uses the request shapes that make
the absence dangerous:

| Action | Trigger | Consequence |
| --- | --- | --- |
| Delete a department, course or subject | `GET admin.php?delete=…&type=…` | An image tag on any page performs it — no form, no interaction |
| Delete one's own upload | `GET delete_material.php?id=…` | Same |
| Toggle a saved resource | `GET toggle_favorite.php?material_id=…` | Same |
| Sign out | `GET logout.php` | Trivial denial of service |
| Post a report or a toggle via JSON | `POST` with no token, no `Origin` check, and no `SameSite` cookie attribute | Cross-site request accepted |

**This is the class of finding that a shared request pipeline prevents.** Because each
file must remember to verify a token, and nothing ever did, the correct fix is a layer
rather than a patch — rule `S4` in
[IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) §3.

### 7.7 Password handling

| Aspect | Finding |
| --- | --- |
| Hashing | Correct: `password_hash` with `PASSWORD_DEFAULT`; verified with `password_verify` |
| Strength rules | **None.** A single-character password is accepted |
| Rehash on algorithm upgrade | None — no rehash-on-successful-login path |
| Reset | **Nonexistent**, so a forgotten password is unrecoverable |
| Logging | No password is logged, because the application logs nothing at all |
| Transport | No HTTPS enforcement in code; the app assumes whatever the web server provides |

**Net assessment:** correct at rest, unmanaged over time. There is no path to improve
the hashing cost, and no path for a locked-out user.

### 7.8 File upload security

| Control | Finding | Status |
| --- | --- | --- |
| Extension allow-list | Present: `pdf, doc, docx, ppt, pptx, xls, xlsx, txt` | **VERIFIED — good intent** |
| Size limit | Present: 10 MB per file | **VERIFIED — good intent** |
| Files per request | Capped at 2 | **VERIFIED** |
| **Content-type validation** | **Absent** — no `finfo`, no `getimagesize`, no magic-byte inspection anywhere. Only the *name* is examined | **VERIFIED — defect (AUD-008)** |
| Filename handling | Renamed to `uniqid('material_', true)` plus the extension, which does blunt traversal **on this path** | **VERIFIED — good intent** |
| Storage location | `uploads/` **inside the web-served directory**, created with `mkdir($target_dir, 0777, true)` | **VERIFIED — defect (AUD-007)** |
| Order of operations | File is moved to its final location **before** the database insert | **VERIFIED — defect (AUD-014)** |
| Quota | None — per user or globally | **VERIFIED — absent** |
| Malware scanning | None | **VERIFIED — absent** |
| Deletion on failure | None — a failed insert leaves the file in place | **VERIFIED — absent** |
| Upload authorisation | Any signed-in user, with no role or verification requirement | **VERIFIED** |

**The compounding effect.** A `.php` file cannot pass the extension allow-list, so
direct code execution is blocked — but a file whose *extension* is allowed and whose
*content* is not (malformed, malicious, or a decompression bomb) is accepted, stored in
a web-served directory, and handed to other users. An upload form with no quota and no
scanning is an open file host, which is also precisely the use pattern that hosting
providers explicitly disallow under fair-use policies.

### 7.9 Download authorisation and path traversal

This is the most serious section of the audit. There are **three different download
mechanisms** in the codebase, and only the least-used one is safe.

| Path | Implementation | Verdict |
| --- | --- | --- |
| `download.php` | Requires a session, applies `basename(urldecode($_GET['file']))`, checks `file_exists` and `is_file`, then streams with an explicit content type | **Sound pattern.** This is the one to imitate conceptually |
| `dashboard.php`, `favorites.php` | Link **directly** to the stored file's web path (`../upload/uploads/<file_path>`) | **No authorisation at all.** Access depends entirely on the filename being unguessable, and guessing is not a security control. Any leak of a path — a referrer, a screenshot, a shared link — grants lasting access |
| `teacher_profile.php` | Builds a filesystem path from `urldecode($_GET['file'])`, passes it to `file_exists()` and `readfile()`, and sets `Content-Disposition` from it | **AUD-001 — unauthenticated arbitrary file read** |

**AUD-001 in detail.** Three properties combine:

1. **No authentication.** The file-serving branch runs before any session check. The
   file reads `$_SESSION['user_id'] ?? null` and then never enforces it, so a request
   supplying only `?file=…` reaches `readfile()`.
2. **No traversal defence.** `urldecode()` *creates* traversal sequences rather than
   removing them, and no `basename()`, `realpath()` containment check, or allow-list is
   applied. Compare `download.php`, which does apply `basename()` — the defence exists
   in this codebase and is simply absent here.
3. **A path computed above the application root.** `dirname(dirname(__DIR__))` resolves
   *above* the project directory, so the intended target directory was already wrong.
   That makes the effective reach of the traversal larger and harder to reason about.

**Impact.** Any file readable by the web-server process can be fetched and returned to
the caller with attacker-influenced headers: application configuration, source code,
any other user's uploaded document, and — on a typical development machine — anything
outside the project directory. This is a total loss of confidentiality, reachable by an
unauthenticated request.

**Why this shapes the architecture more than any other finding.** It is not a coding
slip. It is what happens when a file is served by a page that was never designed to
serve files. The proposed design removes the possibility rather than the mistake:
**no route in the new architecture accepts a request parameter that contributes to a
filesystem or storage path** (see
[ARCHITECTURE-PROPOSAL.md](./ARCHITECTURE-PROPOSAL.md) §8.4), and every file read is an
authorised, audited server operation.

### 7.10 Secret management and configuration

| Finding | Status |
| --- | --- |
| Database credentials are literals in `db_connect.php`, `login1.php` and `register.php` — a local `root` account with an **empty password** | **VERIFIED (AUD-006)** |
| Three separate connection configurations, so a change must be made in three places | **VERIFIED** |
| No configuration layer, no environment variables, no `.env` handling, no separation of development and production settings | **VERIFIED — absent** |
| Connection and query failures are surfaced to the user with the driver's own message | **VERIFIED — defect (AUD-018)** |
| No secret rotation path and no distinction between a development and a production credential | **VERIFIED — absent** |

The empty-password `root` account is a local-development default rather than a leaked
secret, but it is exactly the configuration that becomes catastrophic when code is
copied to a server — which is how this class of credential reaches production.

### 7.11 Rate limiting, abuse and resource exhaustion

| Control | Finding |
| --- | --- |
| Rate limiting on sign-in, registration, upload, or any endpoint | **Absent** |
| CAPTCHA or equivalent on registration | **Absent** |
| Per-user upload quota | **Absent** |
| Storage accounting | **Absent** — nothing measures how much has been stored |
| Bandwidth accounting | **Absent** |
| Catalogue enumeration limits | **Absent** — the four unauthenticated JSON endpoints can be called without bound |

**Consequences.** A single actor can create unlimited accounts, attempt unlimited
sign-ins, upload until the disk or a free-tier ceiling is exhausted, and enumerate the
entire catalogue of institutions, departments, programmes and subjects. Because uploads
are also served without authorisation, the platform functions as an **unmetered public
file host** — precisely the pattern hosting providers list as prohibited fair use.

### 7.12 Privacy, personal data and retention

| Finding | Status |
| --- | --- |
| Registration collects a telephone number and a **postal address**, neither of which the product needs | **VERIFIED** |
| `teacher_profile.php` selects and renders the user's contact field on a page that requires no authentication | **VERIFIED** |
| No privacy notice, no consent record, no stated lawful basis, no retention period | **VERIFIED — absent** |
| No account deletion, no data export, and no way for a user to correct their data | **VERIFIED — absent** |
| The database dump contains real names, email addresses, telephone numbers, physical addresses and bcrypt password hashes | **REPORTED (AUD-022) — not inspected and not reproduced** |

**Assessment.** Personal data was collected because fields were easy to add, not
because a requirement needed them. The replacement applies data minimisation as a
design rule: email, display name and academic context are collected; a telephone number
and a postal address are not, and nothing private is displayed publicly. See `D-009`.

### 7.13 Dependency and deployment security

| Finding | Status |
| --- | --- |
| No dependency manifest exists, so there is nothing to audit and no lockfile to pin | **VERIFIED** |
| Tailwind is loaded from the **CDN play script** — a development build that resolves to the latest version at run time | **VERIFIED** |
| Font Awesome is pinned by version in its URL, but **no Subresource Integrity attribute** is present on any script or stylesheet tag | **VERIFIED** |
| Cross-origin CDN scripts execute with full page privileges, so any CDN compromise becomes a full application compromise | **INFERRED** |
| No security headers are set anywhere | **VERIFIED — absent** |
| Debug and error-display behaviour is unmanaged; the application relies on server defaults | **VERIFIED** |

**Why this matters beyond the inherited app.** Every one of these is a *supply-chain*
finding. The replacement self-hosts its fonts, builds its CSS instead of loading a
runtime script, pins every dependency with a committed lockfile, adds Subresource
Integrity where an external asset is unavoidable, and sets security headers explicitly.

---

## 8. Accessibility, responsiveness, usability and visual design

### 8.1 Accessibility

**VERIFIED — no accessibility work has been done.** Not one of the following controls
appears anywhere in the codebase.

| Control | Finding |
| --- | --- |
| Visible focus styles | **Absent** — no `focus-visible`, no focus ring on any interactive element |
| Accessible names on icon-only controls | **Absent** — controls such as the favourite toggle render a `<button>` containing only an `<i>` glyph, so a screen reader announces nothing meaningful |
| Skip link | **Absent** |
| Landmarks | **Partial** — `<header>` and `<main>` appear on some pages; others carry no landmark structure at all |
| Form error association | **Absent** — errors render as standalone text, with no `aria-describedby`, no `aria-invalid`, no live region |
| Announcement of result changes | **Absent** — filtering and searching replace content with no programmatic notice |
| `lang` attribute | **Present** on every page — a genuine, if small, positive |
| Contrast verification | **Never performed**; no evidence anyone checked |
| Touch target sizing | **Inconsistent** — several controls are styled `py-1 px-3 text-sm`, rendering below a comfortable touch target |
| Reduced-motion support | **Absent** |
| Keyboard operability of the custom controls | **Incomplete** — the AJAX-driven selects are pointer-oriented |

**Assessment.** For a product whose primary user is a student on a phone at night, this
is a functional gap as much as an ethical one: missing focus styles and silent icon
buttons make the interface hard to use with assistive technology *and* awkward to use
with a keyboard or a cracked screen. The replacement adopts WCAG 2.2 AA as an
implementation standard from the first component rather than as a later audit.

### 8.2 Responsiveness

**VERIFIED — this is the inherited app's strongest technical quality.** Tailwind's
responsive utilities are applied consistently and thoughtfully: grids collapse, form
layouts stack, text scales, and there is no horizontal overflow.

**What is missing is depth, not technique:** no bottom navigation for thumb reach, no
horizontally scrolling taxonomy strip, no bottom sheets for filters, and no
consideration of a slow connection — every action is a full page reload with no skeleton
and no progress indication.

### 8.3 Usability

| Observation | Consequence |
| --- | --- |
| The entire application sits behind a login except the landing page | A logged-out visitor cannot see whether the platform holds anything useful, so persona PR-01 never gets past the first screen |
| Destructive actions use the browser's native `confirm()` | Blocking, unstyled, untranslatable, and it does not name what is being deleted |
| Errors surface as `die()` output or raw database text | The user cannot tell what happened or what to do next |
| No loading feedback anywhere | A slow query looks like a broken page |
| No empty states beyond one italic line | A new user reads "No materials found" and learns nothing about what to do |
| Two different mechanisms perform the same favourite action | The same control behaves differently depending on the page |
| Search offers no count, no filters and no ranking explanation | Users cannot tell whether they found everything |

### 8.4 Visual design

**VERIFIED — there is no design system and no visual identity.**

| Aspect | Finding |
| --- | --- |
| Identity | None. The default Tailwind palette, default component shapes, and no brand presence beyond a plain text wordmark |
| Typography | Inconsistent — Poppins on some pages, Inter on others; a single CDN font with no scale and no rhythm |
| Colour | Per-page hardcoded utility classes (`bg-blue-600`, `bg-green-500`) with no semantic meaning and no theming |
| Spacing | Default Tailwind values used ad hoc; no spacing scale and no vertical rhythm |
| Components | None. Every card, button and list is restyled inline on each page |
| Dark theme | **Absent** |
| Iconography | Font Awesome glyphs used decoratively, at inconsistent sizes, with no rule about when an icon stands alone |
| Motion | **Absent** — nothing beyond a CSS hover colour transition |
| Imagery | A gradient hero on the landing page and nothing else |

**The one thing worth keeping.** The **information architecture** — Home → Library →
Favourites → Dashboard → Upload — is coherent and maps onto real student tasks. It is
recorded in [UI-UX-DESIGN-SYSTEM.md](./UI-UX-DESIGN-SYSTEM.md) §4 as an input to the
design, not as the design.

---

## 9. Reliability, performance, observability, maintainability and testability

### 9.1 Reliability

| Finding | Status |
| --- | --- |
| Errors terminate the request with `die()` and the driver's message | **VERIFIED** |
| Failed writes are not detected — `admin.php` ignores the return value of `query()` | **VERIFIED — silent failure** |
| No transactions anywhere (zero occurrences of `begin_transaction`, `commit` or `rollback`) | **VERIFIED (AUD-014)** |
| No idempotency: a repeated form submission repeats the effect | **VERIFIED** |
| No retry, no compensating action, and no cleanup — a failure between the file write and the insert leaves residue | **VERIFIED** |
| No health or readiness indication | **VERIFIED — absent** |

### 9.2 Performance

| Finding | Status | Effect |
| --- | --- | --- |
| No `LIMIT` and no pagination on any listing | **VERIFIED** | Every listing grows without bound; the dashboard loads everything a user has ever touched |
| Six-table `LEFT JOIN`s on the primary listing, with predicates no index can use efficiently | **VERIFIED** | Cost grows with total content, not with the page size |
| Leading-wildcard `LIKE '%term%'` search | **VERIFIED** | Defeats ordinary indexing and forces a scan |
| Three sequential AJAX round trips to build one upload form's taxonomy cascade | **VERIFIED** | Latency multiplies on a mobile connection |
| Tailwind's runtime CDN compiler | **VERIFIED** | Parses and generates CSS in the browser on first paint — a real cost on PR-01's device |
| No caching of any kind — no HTTP cache headers, no query cache, no memoisation | **VERIFIED** | Every page view repeats all of the above |

### 9.3 Observability

**VERIFIED — there is none.** No structured logging, no log levels, no request
identifiers, no metrics, no tracing, no error reporting and no audit trail. The only
diagnostic instruments in the codebase are a single `error_log()` call and the raw
driver error text shown to the user.

**The consequence is severe for a small project:** a failure in production is
invisible. There is no way to know that uploads began failing, that a query became slow,
or that someone deleted a department — only that users stopped appearing.

### 9.4 Maintainability

| Finding | Status |
| --- | --- |
| Navigation markup duplicated across every page | **VERIFIED** |
| Credentials triplicated across three files | **VERIFIED** |
| The same query reimplemented differently in `homepage.php` and `lib.php` | **VERIFIED** |
| A file named for one feature containing a completely different feature | **VERIFIED (AUD-011)** |
| Documentation contamination left inside source files — `admin.php`'s code fence, `teacher_profile.php`'s Markdown emphasis | **VERIFIED** |
| No `declare(strict_types=1)`, no docblocks, no architectural notes | **VERIFIED** |
| Dead schema — the orphan favourites table, unused denormalised columns, `branch_for` | **REPORTED / VERIFIED** |

The cost is concrete: a new reader cannot tell which files are live, which are
abandoned, and which are documentation saved with the wrong extension.

### 9.5 Testability

**The code is effectively untestable as written**, and this is structural rather than a
matter of missing test files:

| Property | Why it blocks testing |
| --- | --- |
| The database connection is created inline in each page | No seam for a test double; a page cannot be exercised without a live database |
| Business logic is inline in the request handler | There is nothing to call in isolation |
| State is read from superglobals throughout | A function cannot be invoked with controlled inputs |
| `header()` and `die()` sit inside logic paths | Execution cannot be observed; the process simply ends |
| HTML, PHP and SQL are interleaved in one file | Output cannot be asserted without rendering a whole page |
| Only **two** functions are defined anywhere in the codebase | There is almost no unit of code to test in the first place |

**This is the finding that most justifies a rewrite rather than a repair.** Adding tests
to this structure requires first extracting the logic from the pages — which *is* the
rewrite.

---

## 10. Positive patterns worth retaining conceptually

The inherited app is not without merit, and the replacement should deliberately carry
these forward. Each is a *practice*, not code.

| # | Pattern | Evidence | How it is carried forward |
| --- | --- | --- | --- |
| P-1 | **bcrypt for password storage** | `password_hash` with `PASSWORD_DEFAULT`, verified with `password_verify` | Retained; upgraded to Argon2id where available, with the algorithm and cost recorded |
| P-2 | **Session identifier rotation on authentication** | `session_regenerate_id(true)` on successful sign-in | Retained, and extended to rotate on privilege change as well |
| P-3 | **Filename sanitisation before use** | `basename(urldecode(...))` in `download.php` | Retained as a rule and generalised: **no request parameter may ever form part of a storage or filesystem path** |
| P-4 | **Prepared statements as the default** | 42 `prepare(` call sites, with dynamic filters built correctly using accumulated type strings | Retained. The typed query layer makes the safe path the only path |
| P-5 | **Ownership checked before a destructive action** | `delete_material.php` verifies `materials.user_id` against the session before deleting | Retained, and generalised into the policy module instead of being re-implemented per file |
| P-6 | **Authentication checked at the top of a page** | Present in 17 of 23 PHP files | Retained in spirit, but moved into the request pipeline so it cannot be forgotten |
| P-7 | **A coherent information architecture** | Home → Library → Favourites → Dashboard → Upload | Retained as product input (see [UI-UX-DESIGN-SYSTEM.md](./UI-UX-DESIGN-SYSTEM.md) §4) |
| P-8 | **Responsive layout discipline** | Consistent, well-chosen Tailwind breakpoints | Retained as a standard, with the missing depth added — bottom navigation, sheets, tab strips |
| P-9 | **Correct taxonomy shape** | University → Department → Course → Subject → Semester | Retained as the domain model, with the naming and the constraints corrected |
| P-10 | **Status feedback passed through a redirect** | Success and error messages carried in the URL after an action | Retained as an idea, and made honest — a redirect is never treated as proof of success (§9.1) |

**Why this list matters.** The audit's conclusions are harsh about the *engineering*, and
it would be easy to read that as "nothing was learned". P-1 to P-4 in particular are
correct choices that many student projects get wrong. The replacement's job is to keep
the instincts and add the layers that were missing.

---

## 11. Prioritised risk register

Severity combines impact and exploitability **as the system stands**. Each entry names
the remediation that closes it, and — the only question that matters for this milestone
— whether it changed the proposed architecture.

### 11.1 Critical and high severity

| ID | Finding | Severity | Verification | Impact if realised | Remediation | Changes the architecture? |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-001 | Unauthenticated arbitrary file read via a traversal in `teacher_profile.php` | **CRITICAL** | VERIFIED | Total loss of confidentiality — configuration, source and other users' documents — with no account required | Eliminate file serving from page routes; authorise before delivery; never allow a request parameter to reach a path | **Yes, decisively.** §8.4 of the architecture exists because of this |
| AUD-002 | Privilege escalation by self-selected role | **CRITICAL** | VERIFIED | Any visitor can obtain platform-wide destructive power over shared academic records | One policy module; roles never accepted from input; elevation only by an administrator; every change audited | **Yes.** Drives the policy module and the role model |
| AUD-003 | `admin.php` is not valid PHP | **HIGH** | VERIFIED | The administrative function does not exist, and a broken file is mistaken for a working one | Rewritten as taxonomy admin in `M6`; "valid at build time" becomes a guarantee rather than a hope | Yes — a build step is required |
| AUD-004 | No anti-forgery protection anywhere | **HIGH** | VERIFIED | Any state-changing action can be triggered from another site | Handling moves into the form primitive, so it cannot be forgotten per form (rule `S4`) | **Yes.** Drives the primitive design |
| AUD-005 | Destructive actions are GET-driven | **HIGH** | VERIFIED | Deletion triggered by an image tag, with no user interaction | Mutations are POST-only; nothing destructive is reachable by GET | Yes |
| AUD-006 | Hardcoded database credentials in three files | **HIGH** | VERIFIED | Credentials travel with the code, and a development default becomes production | Environment-based configuration with fail-fast validation, no defaults, and a CI secret scan | Yes |
| AUD-007 | Uploads stored in a web-served directory and linked directly | **HIGH** | VERIFIED | Files are protected only by an unguessable name; any path leak is permanent access | Private object storage; authorise before issuing a delivery credential | **Yes.** Drives the storage layer |
| AUD-008 | Extension-only validation; no content inspection, no quota, no scanning | **HIGH** | VERIFIED | Malformed or malicious documents are accepted and redistributed | Server-side inspection of the stored object; allow-list; forced download disposition; documented scanning limitation | Yes |

### 11.2 Medium severity

| ID | Finding | Severity | Verification | Impact if realised | Remediation | Changes the architecture? |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-009 | The same fact modelled two ways (`materials.subject` versus the `subjects` table) | MEDIUM | VERIFIED | Screens disagree about the same data; future consumers cannot trust it | One schema owner; design rules `R2` (one canonical home) and `R3` (one path to the taxonomy) | Yes |
| AUD-010 | `courses.name` is globally UNIQUE | MEDIUM | REPORTED | The product's own cross-institution premise is forbidden, or data is silently corrupted | Scope every uniqueness constraint to its parent; regression-tested in `M6` | **Yes.** Drives the schema design |
| AUD-011 | `university_teachers.php` is a byte-identical copy of an unrelated file | MEDIUM | VERIFIED | A named feature does not exist, and the codebase misleads every reader | Delete the concept or build it deliberately; a test suite prevents silent duplication | Yes — testing becomes structural |
| AUD-012 | The application cannot run as delivered (inconsistent paths) | MEDIUM | VERIFIED | No runnable baseline exists from which to measure anything | A build system and module resolver make paths explicit and check them at build time | Yes |
| AUD-013 | Escaping before storage, and Markdown left inside HTML output | MEDIUM | VERIFIED | Stored text is not what the user typed; searches fail; exports are corrupted | Escape on output; store what the user meant | Yes — a framework-level encoding decision |
| AUD-014 | No transactions or compensating writes anywhere | MEDIUM | VERIFIED | A failure between steps orphans files or rows — including files with no database record | Transactions for multi-write operations; a reconciliation job for staged objects | Yes |
| AUD-015 | Account enumeration at sign-in | MEDIUM | VERIFIED | An attacker can learn which addresses have accounts | Identical responses and comparable timing for both failure modes | No — a requirement, not an architectural change |
| AUD-016 | Four catalogue endpoints require no authentication | MEDIUM | VERIFIED | The whole taxonomy is enumerable by anyone, without bound | Route-level authorisation by default; explicit public routes only | Yes — the request pipeline |
| AUD-024 | Unnecessary personal data is collected, and some of it is rendered publicly | MEDIUM | VERIFIED | Unnecessary exposure, and an avoidable legal obligation | Data minimisation as a design rule; nothing private appears on a public surface | Yes — a schema decision |

### 11.3 Low and informational

| ID | Finding | Severity | Verification | Impact if realised | Remediation |
| --- | --- | --- | --- | --- | --- |
| AUD-017 | A helper interpolates table and column names into SQL | LOW | VERIFIED | Not currently exploitable; becomes injectable the moment a caller passes input | Parameterise everything; identifiers live in code, never in data |
| AUD-018 | Raw driver errors are shown to users | LOW | VERIFIED | Internal structure is disclosed on failure | One error boundary; generic user-facing messages with a correlation identifier; details only in logs |
| AUD-019 | No cookie attributes, and sign-out is GET-triggerable | LOW | VERIFIED | Session cookies are less protected than they should be | Explicit `HttpOnly`, `Secure`, `SameSite`, recorded as evidence |
| AUD-020 | No tests, no CI, no dependency manifest | LOW | VERIFIED | Nothing prevents a regression, and nothing detects a supply-chain problem | The quality gates in [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) §16, from `M3` |
| AUD-021 | Duplicated metadata and no design system | LOW | VERIFIED | Inconsistent interface and a high cost per new screen | Tokens and primitives before screens (`M4`, rule `S5`) |
| AUD-022 | The database dump contains real personal data and password hashes | **INFO — handling rule** | REPORTED | Exposure of other people's data; a duty to tell the original author to rotate those credentials | Never commit, never inspect, never reproduce. Recommend rotation by the original author |
| AUD-023 | No licence in the inherited source | **INFO — legal** | VERIFIED | Inherited code cannot lawfully be reused or redistributed | Write the platform from scratch; treat the inherited code as reference only |

### 11.4 The three findings that carry the most weight

Everything above is real, but three determine the shape of the replacement:

1. **AUD-001** — because it shows what happens when a page is asked to do something it
   was never designed to do. The correct fix is a **removal of possibility**, not another
   check to remember.
2. **AUD-002** — because a trust boundary was a dropdown. The correct fix is one policy
   module, plus a test that enumerates every actual route.
3. **AUD-023** — because it means the answer to "can we just repair it?" was always going
   to be "no". Once the code cannot be reused, the remaining findings become a list of
   mistakes not to repeat rather than a backlog to burn down.

### 11.5 Severity distribution

| Severity | Count | IDs |
| --- | --- | --- |
| Critical | 2 | AUD-001, AUD-002 |
| High | 6 | AUD-003 – AUD-008 |
| Medium | 9 | AUD-009 – AUD-016, AUD-024 |
| Low | 5 | AUD-017 – AUD-021 |
| Informational | 2 | AUD-022, AUD-023 |
| **Total** | **24** | |

---

## 12. The boundary between reusable requirements and non-redistributable code

This section exists because it is the single most consequential conclusion of the audit,
and because it is the one most easily lost in a long document.

### 12.1 Verified licensing position

| Fact | Status |
| --- | --- |
| The inherited checkout contains **no `LICENSE` file**, no `composer.json`, and no copyright or attribution header in any file | **VERIFIED** |
| Under default copyright law, the absence of a licence means **all rights reserved** | Established legal position |
| Therefore there is **no permission** to copy, modify, or redistribute the inherited source | **Conclusion** |

### 12.2 What may be reused

| Reusable | Basis |
| --- | --- |
| **The product concept** — cross-institution sharing of academic material | Ideas and product concepts are not protected by copyright |
| **The taxonomy shape** — Institution → Department → Course → Subject → Semester | A domain model is a fact about a domain, not an expression |
| **The information architecture** — Home, Library, Favourites, Dashboard, Upload | Same |
| **The functional requirements derived from observing it** | Requirements are ours; we did the analysis |
| **The audit's findings and the lessons in them** | Our own analysis |
| **The list of practices worth retaining** (§10) | Our own conclusions, expressed as practices rather than code |

### 12.3 What may **not** be reused

| Not reusable | Why |
| --- | --- |
| Any line of the inherited PHP | Unlicensed; all rights reserved |
| The database dump | Unlicensed **and** contains third parties' personal data |
| The database schema as expressed in the dump | Unlicensed expression, even though the *shape* of the domain is reusable |
| Any CSS, markup, or client script from the inherited pages | Unlicensed |
| The wording of the inherited README or any UI copy | Unlicensed |

### 12.4 What this means for the replacement

1. **The platform is written from scratch.** This was already true for technical reasons;
   the licensing position makes it non-negotiable.
2. **The inherited source is never vendored, copied, or committed.** It stays on the
   original machine, unmodified, ignored by `.gitignore` even if someone adds it.
3. **No inherited snippet appears in EDU-SHARE's documentation.** This audit deliberately
   paraphrases and cites rather than quoting, which is why it contains no code blocks from
   the inherited application.
4. **If reuse is ever wanted**, the path is: obtain written permission or a licence from
   the original author, record it in a third-party notices file, and only then consider
   incorporating anything. Until that happens, the inherited code is read-only reference
   material.
5. **Our own licence covers our work only.** The MIT licence already present in this
   repository grants no rights over the original author's contributions, and none are
   claimed.

---

## 13. Audit limitations, assumptions and unverified claims

An audit is only as trustworthy as its statement of what it could not establish.

### 13.1 What this audit could not determine

| # | Unknown | Why it matters | How to resolve |
| --- | --- | --- | --- |
| U-1 | Whether a complete, runnable copy of the original directory tree exists anywhere | Determines whether the inherited app could ever be run to confirm runtime behaviour | Ask the original author |
| U-2 | Whether the `ALTER TABLE`-added foreign keys declare `ON DELETE` behaviour | Determines whether deleting a programme orphans or cascades over other people's data | Requires read access to the live schema, not the dump |
| U-3 | Whether the application was ever deployed publicly, and to whom the personal data in the dump belonged | Determines whether there is a disclosure obligation | Ask the original author |
| U-4 | Whether the personal data in the dump is current or stale | Determines whether the individuals are still exposed | Ask the original author |
| U-5 | Whether `teacher_profile.php` is reachable from any working page | Affects the practical exploitability of AUD-001, though not its severity — an unauthenticated file read does not need a link to be dangerous | Reasonable inference: reachable in the original layout |
| U-6 | Which parts of the inherited system were actually used | Determines which features were genuinely valuable | Ask the original author |
| U-7 | The number of rows in each table | Would inform migration effort — which is moot, since nothing will be migrated | Not needed |
| U-8 | PHP and MySQL server behaviour under load | Not established, and not needed: the application cannot run as delivered | Not needed |

### 13.2 Assumptions this audit makes

| # | Assumption | If it is wrong |
| --- | --- | --- |
| A-1 | The flattened checkout is representative of the original application's logic | The *functionality* findings could be stale, but the security and architecture findings are structural and would survive partial refactoring |
| A-2 | The inherited code will not be reused, and no data will be migrated | If reuse or migration were later wanted, a fresh licensing and data-protection review would be required first |
| A-3 | The previous session's reported schema facts are accurate | Only six findings (DB-1, DB-3, DB-4, DB-5, DB-6, AUD-010) depend on them, all marked REPORTED, and none changes the architectural conclusion |
| A-4 | The intended deployment was a conventional web server with a writable uploads directory | Any other deployment would change the *exploitability* of AUD-007, not the finding |
| A-5 | The owner controls the repository and the intended deployment | Repository and remote were verified directly (private, not a fork, correct owner) |

### 13.3 Claims this audit explicitly does **not** make

| Not claimed | Why |
| --- | --- |
| That any vulnerability was exploited | No runtime analysis was performed, and the application cannot run as delivered |
| That the inherited application holds a specific number of records | The dump was deliberately not inspected |
| That the inherited code is insecure in every respect | It has real strengths, listed in §10 |
| That the replacement architecture is complete or final | It is a proposal awaiting approval |
| That any performance figure has been measured | Nothing has been built |
| That the platform will be easy | The audit's own findings are the evidence that this class of work is not easy, which is why the plan sequences it the way it does |

### 13.4 Verification summary

| Verification state | Findings |
| --- | --- |
| **VERIFIED** — confirmed by direct inspection this session | AUD-001, 002, 003, 004, 005, 006, 007, 008, 009, 011, 012, 013, 014, 015, 016, 017, 018, 019, 020, 021, 023, 024 |
| **REPORTED** — from the prior session's handover, not re-inspected, and not reproducible here without exposing personal data | AUD-010, AUD-022, plus data-model findings DB-1, DB-3, DB-4, DB-5, DB-6 |
| **INFERRED** — supported by evidence but not conclusively established | §6.2's foreign-key observation; AUD-013's supply-chain consequence |
| **UNKNOWN** — insufficient evidence | §13.1, U-1 to U-8 |

**Corrections to the previous handover, recorded honestly.**

| Previous claim | Correction |
| --- | --- |
| "`admin.php` contains SQL injection" | **Corrected.** The identifiers are cast with `intval()` and the type is compared against literals. The file is still invalid PHP and still contains the privilege-escalation flaw — but not injection |
| "Prepared statements in certain read paths" | **Corrected upward.** 42 prepared-statement call sites are used across the codebase, including all dynamic filter construction. This is a genuine strength, not a partial one |

Recording these corrections is part of the audit's purpose: a document that only ever
confirms its own earlier claims is not an audit.

---

*End of audit. Every finding above is a finding about the **inherited** application.
Nothing in this document describes software that EDU-SHARE has built.*
















