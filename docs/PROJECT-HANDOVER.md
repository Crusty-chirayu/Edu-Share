# PROJECT HANDOVER — EDU-SHARE

**Status:** Onboarding & discovery complete. Pre-implementation.
**Prepared by:** AI development agent (Cline), for the new project owner.
**Scope:** Verified technical assessment of the inherited EDU-SHARE application.

> **Reading convention.** Findings are tagged:
> **[VERIFIED]** = read directly from source or GitHub API.
> **[INFERRED]** = strong technical conclusion drawn from the evidence.
> **[UNKNOWN]** = could not be determined from the repository.

---

## 1. Purpose of the original project

**[VERIFIED]** (inherited `README.md` + source): "EDU-SHARE – Targeted Knowledge
Exchange Platform." A PHP web application where students and teachers across
universities and colleges upload, browse, and download academic materials (notes,
question papers, study material), organised hierarchically as
**University → Department → Course → Subject → Semester**.

Intended differentiator: sharing **across institutional boundaries**, not limited
to one's own college.

---

## 2. Verified technologies

| Layer | Technology | Evidence |
| --- | --- | --- |
| Language | **PHP 8** (dump header: PHP 8.2.12) | `project.sql` header |
| Database | **MySQL / MariaDB 10.4.32**, `utf8mb4` | `project.sql` header, `mysqli` usage |
| DB driver | `mysqli`, `prepare` / `bind_param` | all `*.php` |
| Frontend | Server-rendered HTML + inline PHP | all page files |
| CSS | **Tailwind CSS via CDN** (`cdn.tailwindcss.com`), inline `<style>` | all page files |
| Icons | Font Awesome 6.4.0 via CDN | `lib.php`, `favorites.php` |
| Fonts | Google Fonts (Poppins / Inter) | `lib.php`, `login1.php` |
| JS | Vanilla JS + `fetch()` to JSON endpoints | `favorites.php`, `mainhome.php` |
| Auth | PHP native sessions + `password_hash` / `password_verify` | `login1.php`, `register.php` |
| Tooling | **None** — no Composer, npm, package.json, tests, or CI | directory listing |

**No build step, no dependency manager, no automated tests, no CI/CD.**

---

## 3. Repository structure (inherited)

Inherited source is at `E:\projects\Edu-Share` on the owner's machine.
**[VERIFIED]** — 24 files, flat, no subdirectories:

```
admin.php            dashboard.php         db_connect.php
delete_material.php  download.php          favorites.php
get_courses.php      get_departments.php   get_subjects.php
get_universities.php homepage.php          lib.php
login1.php           logout.php            mainhome.php
process_upload.php   project.sql           README.md
register.php         teacher_profile.php   toggle_favorite.php
toggle_university_favorite.php  university_teachers.php
upload.php
```

### 3.1 Critical structural finding

**[VERIFIED]** The inherited files use **mutually inconsistent relative paths**
that do not resolve in this flat layout:

- `db_connect.php` — at repo root
- `lib.php` → `require '../../db_connect.php'`
- `toggle_favorite.php` → `require '../../db_connect.php'`
- `process_upload.php`, `delete_material.php`, `favorites.php`,
  `university_teachers.php` → `require '../db_connect.php'`
- `login1.php`, `register.php` → inline their own DB credentials
- `mainhome.php` links `../home/mainhome.php`, `../login/logout.php`, `../register/register.php`
- `logout.php` → `header("Location: ../home/mainhome.php")`

**[INFERRED]** The original project was laid out as
`login/`, `register/`, `home/`, `upload/`, `profile/`, plus root `db_connect.php`.
This checkout is a **flattened, partially-refactored copy in which navigation and
`require` paths are broken. It cannot run as-is.**

**[UNKNOWN]** Whether a complete, working directory tree exists elsewhere. Must
be established before treating the inherited code as a runnable baseline.

### 3.2 `admin.php` is not valid PHP

**[VERIFIED]** `admin.php` is wrapped in literal Markdown fences:

````
```php
<?php
...
```
````

**[INFERRED]** It is a documentation snippet saved with the wrong extension. The
"admin panel" it describes does not exist as working code — and would fail
immediately regardless (see §7.1).

---

## 4. Data model

**[VERIFIED]** From `project.sql` (phpMyAdmin dump, generated 2025-09-28).
Database name `project`. All tables InnoDB / `utf8mb4_general_ci`; foreign keys
are added afterwards via `ALTER TABLE`, not declared inline.

| Table | Purpose | Notable columns |
| --- | --- | --- |
| `users` | Accounts | `full_name`, `gmail` (UNIQUE), `password`, `user_type`, `university_id`, `department_id`, `branch`, `year`, `contact`, `address` |
| `universities` | Institutions | `name` UNIQUE |
| `departments` | Departments | `name`, `university_id`, `branch_id`; UNIQUE(`university_id`,`name`) |
| `branches` | Campuses | one seed row: `'Main Campus'` |
| `courses` | Programmes | `name` **UNIQUE globally**, `university_id`, `department_id` |
| `subjects` | Subjects | `name`, `course_id`, `department_id`, `semester` |
| `materials` | Uploaded files | `title`, `description`, `file_path`, `university_id`, `department_id`, `course_id`, `subject_id`, `semester`, `user_id`, `upload_group_id`, `branch_for` (NOT NULL, unused) |
| `material_favorites` | Saved items | UNIQUE(`user_id`,`material_id`); **duplicate** `created_at` + `favorited_at` |
| `university_favorites` | Followed institutions | UNIQUE(`user_id`,`university_id`) |
| `user_favorites` | **Orphan / dead table** — no FK, referenced by no code | — |

### 4.1 Schema observations

- **[VERIFIED]** `subjects.semester` is `NOT NULL` with no default, and
  `process_upload.php` never supplies it, so subject creation fails at runtime.
- **[VERIFIED]** `subjects` carries **two** foreign keys on `department_id`
  (`fk_subject_department` and `subjects_ibfk_2`).
- **[VERIFIED]** `courses.name` is **globally UNIQUE** — two institutions cannot
  own a course of the same name. This is an architectural blocker for the
  product's own cross-institution premise.
- **[VERIFIED]** `materials.semester` and `subjects.semester` are unrelated columns.
- **[VERIFIED]** `materials` has never-populated denormalised text columns:
  `subject`, `user_course_name`, `user_subject_name`.
- **[INFERRED]** There is **no admin role** — `user_type` is only
  `student` / `teacher`. No email verification, no password reset, no lockout.

---

## 5. Request and data flows

### 5.1 Authentication **[VERIFIED]**

`login1.php` -> inline `mysqli` connect -> `SELECT ... WHERE gmail = ?` ->
`password_verify()` -> `session_regenerate_id(true)` -> sets
`$_SESSION['user_id' | 'user_type' | 'full_name']` -> redirect `../home/dashboard.php`.

Good: bcrypt via `PASSWORD_DEFAULT`, prepared statement, session-ID rotation.

Registration (`register.php`) auto-creates university / department rows on demand
via `getOrCreateAffiliationID()`.

### 5.2 Material upload **[VERIFIED]**

`upload.php` (form) -> `process_upload.php`: session check -> get-or-create
course / subject -> loop over `$_FILES['files']` (**hard-capped at 2 files**) ->
validate size (<= 10 MB) and extension -> rename to `uniqid('material_', true)`
plus extension -> `move_uploaded_file()` into `uploads/` (`mkdir(..., 0777, true)`)
-> `INSERT INTO materials`.

### 5.3 Material retrieval **[VERIFIED]**

`lib.php`: GET filters `uni_id`, `search`, `semester`, `course`, `subject` -> a
single prepared statement with `LEFT JOIN`s -> per-user favourite state joined via
`material_favorites`.

`download.php`: session check -> `basename()` on the file parameter -> serve from
`uploads/`. This is the one endpoint that is both in-place runnable and
relatively careful (`basename` blocks traversal; login required).

### 5.4 AJAX endpoints **[VERIFIED]**

`get_universities.php`, `get_departments.php`, `get_courses.php`,
`get_subjects.php` are JSON endpoints driving cascading dropdowns
(university -> department -> course -> subject).

`university_teachers.php` and `toggle_university_favorite.php` are **duplicates of
one another** — the former is misnamed and merely toggles favourites; it does
**not** list teachers. `teacher_profile.php` exists, but its reachability is
unverified.

`toggle_favorite.php` is GET-driven with no CSRF token, while the JS in
`favorites.php` POSTs JSON to that same file, which only reads `$_GET`, so the
AJAX path is broken.

---

## 6. What works, what does not

### Verified functional (in the original folder layout)
- Login / logout, bcrypt password storage, session regeneration.
- Registration with auto-created university / department.
- Material listing with multi-filter plus text search (prepared statements).
- Favourite toggle and favourites listing.
- Cascading academic dropdowns.
- `download.php` file serving with traversal mitigation.

### Confirmed broken or incomplete **[VERIFIED from source]**

| Issue | Evidence |
| --- | --- |
| Entire navigation / `require` graph | Mismatched relative paths (see 3.1) |
| Subject creation | `subjects.semester` is NOT NULL and never supplied |
| `admin.php` | Markdown fences; also queries columns that do not exist (`department_name`, `course_name`, `subject_name`) |
| AJAX favourite toggle | POSTs JSON; server reads `$_GET` |
| `university_teachers.php` | Duplicate of `toggle_university_favorite.php` |
| `lib.php` markup | Stray `</a>`; "View" opens a binary inline in the browser |
| Multi-file upload | Capped at 2 files regardless of input |
| `branch` / `year` / `contact` / `address` | Collected at registration, never used anywhere in the UI |
| `roll_number` | Has a UNIQUE key, but is commented out of both the form and the INSERT |
| `upload_group_id` | Written on every upload, read by no code |

### Explicitly absent **[VERIFIED]**
No tests, no CI/CD, no `composer.json` or `package.json`, no `.env` or config
layer (credentials hardcoded in three files), no email verification, no password
reset, no rate limiting or brute-force protection, no admin role, no CSRF tokens
anywhere, no pagination, no full-text search, no file-content scanning, no audit
log, no API versioning, no deployment configuration.

---

## 7. Security concerns, ordered by severity

### 7.1 SQL injection — high **[VERIFIED]**
`admin.php` executes `$conn->query("DELETE FROM departments WHERE id = $id");`
plus roughly eight more interpolated statements. The only mitigation is
`intval()` on that one parameter and an unverified `teacher`-role gate.

### 7.2 Broken access control — high **[VERIFIED]**
`admin.php` authorises any user whose `user_type` is `teacher` to delete
departments, courses, and subjects globally. Any self-registered "teacher"
account is effectively an administrator. By contrast `delete_material.php`
correctly verifies `$material['user_id'] != $user_id`.

### 7.3 Sensitive personal data in the source dump — high **[VERIFIED]**
`project.sql` contains a **full data export**: five users with real names, Gmail
addresses, phone numbers, home addresses, and **bcrypt password hashes**, plus
eight material rows. This is personal data belonging to third parties.

> **Action required.** Never commit this file; it is git-ignored here. Consider
> asking the original author to rotate those credentials and remove the dump.

### 7.4 Hardcoded credentials — high **[VERIFIED]**
`root` with an empty password, duplicated in `db_connect.php`, `login1.php`, and
`register.php`. There is no environment layer at all.

### 7.5 No CSRF protection — medium **[VERIFIED]**
Every state-changing action (register, login, upload, delete, favourite) is a
plain form or a GET link with no token. Deletion is reachable via a crafted link.

### 7.6 Weak upload controls — medium **[VERIFIED]**
The extension allowlist is reasonable, but there is **no MIME or content
validation**; `uploads/` is created with `0777`; the directory is **served
directly by the web server**, so a bypass of the allowlist would allow execution;
and filenames use `uniqid()`, which is time-based and guessable.

### 7.7 Authorisation inconsistency — medium **[VERIFIED]**
`lib.php` shows **all** materials platform-wide to any logged-in user, while the
product premise is institution-scoped sharing. `favorites.php` also links to
`../profile/download.php`, a path that does not exist.

### 7.8 Output-encoding bug — low/medium **[VERIFIED]**
Most output correctly uses `htmlspecialchars()`, but `admin.php` interpolates
values straight into HTML attributes, and `process_upload.php` escapes **before
storing** (`htmlspecialchars($_POST['title'])`). Data is therefore encoded in the
database and double-encoded on output — a correctness bug as well as a smell.

### 7.9 Error disclosure — low **[VERIFIED]**
`die("SQL Prepare Error: " . $conn->error)`, `die("Connection failed: " ...)`,
and raw mysqli errors surfaced to end users in `process_upload.php`.

---

## 8. UI and UX assessment

**[VERIFIED]** Every page independently loads Tailwind, Font Awesome, and Google
Fonts from CDNs, duplicates its own `<nav>`, and hardcodes colours
(`bg-blue-600`, `bg-green-500`). There is **no shared layout, component library,
or design-token system**, and the body font differs between pages (Poppins vs
Inter).

**Strengths.** A genuinely coherent information architecture
(Home -> Library -> Favorites -> Dashboard -> Upload) and correct, responsive
Tailwind usage. That IA is worth keeping as product input.

**Weaknesses.** No visual identity; no design system; duplicated navigation;
`cdn.tailwindcss.com`, which is explicitly not for production; almost no
loading, empty, or error state design beyond a bare "No materials found" line;
no accessibility work (no `focus-visible` states, icon-only controls); no motion
or micro-interaction design; and the core screen is a plain list with no previews,
no relevance ranking, and no discovery surface.

---

## 9. Local setup of the inherited app — probable, not verified

**[UNKNOWN]** Could not be executed: no PHP or MySQL server was available in the
analysis environment, and the directory layout is broken (see 3.1).

**[INFERRED]** The original required: PHP 8 with `mysqli`; a MySQL/MariaDB server
with a `project` database reachable as `root` with no password on `localhost`;
`project.sql` imported; the **original multi-folder layout**; and an
Apache/XAMPP-style server with `uploads/` writable by the PHP process.

To stand up a runnable baseline, first obtain the original layout (or
reconstruct it from the `require` and redirect paths in 3.1).

---

## 10. Licensing — a blocking issue for code reuse

**[VERIFIED]** The inherited checkout contains **no LICENSE file, no
`composer.json`, and no copyright or attribution header** in any file.

**Consequence.** Under default copyright law, "no license" means **all rights
reserved**. There is therefore **no permission** to copy, modify, or redistribute
that code into this repository.

**Decisions taken:**
1. **No inherited source has been committed to this repository.** Done.
2. `project.sql` is excluded through `.gitignore` (PII plus password hashes). Done.
3. Inherited source stays on the original machine, unmodified, as reference only. Done.
4. The new platform will be **written from scratch**.

**If reuse is ever desired:** obtain written permission or a retroactive license
from the original author and record it in `docs/THIRD-PARTY-NOTICES.md`. Until
then, treat the inherited code as read-only reference material.

**Our own license.** This repository carries an MIT `LICENSE` (copyright 2026
Chirayu) that was already present in the remote. It covers *our* work only. It
grants no rights over the original author's contributions, and none are claimed.

---

## 11. What is worth preserving (product thinking, not code)

| Preserve | Rationale |
| --- | --- |
| The **University -> Department -> Course -> Subject -> Semester** taxonomy | Correct domain model; the core of the product |
| The **information architecture** (Home / Library / Favorites / Dashboard / Upload) | Maps well onto real student workflows |
| **Cross-institution discovery** as the differentiator | Genuinely valuable and under-built in the original |
| `download.php`'s `basename()` plus session-check pattern | Sound instinct, even though thin |
| bcrypt and `session_regenerate_id` | Correct choices, worth carrying forward |
| Prepared-statement discipline in the read paths | Good habit, inconsistently applied |

## 12. What should be replaced

| Replace | Reason |
| --- | --- |
| PHP procedural + `mysqli`, no framework | No structure, no testability, no migrations |
| Hardcoded credentials | Unacceptable for a new project |
| Flat multi-file page architecture | No shared layout, duplicated code |
| CDN Tailwind, no design system | Unacceptable for a premium product |
| Global `courses.name` UNIQUE | Blocks the product's core premise |
| `user_favorites` dead table, duplicated timestamps, unused columns | Data-model debt |
| `branches` as a single hardcoded row | Premature abstraction |
| GET-driven mutations with no CSRF | Security debt |
| Web-served `uploads/` directory | Storage and permission risk |

---

## 13. Git and repository safety

| Item | State |
| --- | --- |
| Inherited local dir | `E:\projects\Edu-Share` — **no `.git`, not a clone, no remotes, unmodified** |
| Parent `E:\projects` | Is a Git repo with **zero commits**, containing 13 unrelated projects |
| New workspace | `E:\projects\edu-share-platform` — independent `git init`, own `.git` |
| New remote | `https://github.com/Crusty-chirayu/Edu-Share.git` (verified via `gh repo view`) |
| Remote repository | `isFork: false`, `visibility: PRIVATE`, default branch `main` |
| Remote history | One commit, `75cfd10` "Initial commit", containing only `LICENSE` |
| Integration method | Local `main` branched **from** `origin/main` — linear history, no force-push, no rewrite |

**Hazard recorded.** The parent directory `E:\projects` is a Git repository with no
commits. Running `git` from inside `E:\projects\Edu-Share` therefore targets
**that** repository, not this project. **All development work must happen in
`E:\projects\edu-share-platform`.**

---

## 14. Unknowns requiring investigation

1. Does a complete, runnable original directory tree exist anywhere? (see 3.1)
2. Was the original application ever deployed publicly, and to whom did the PII belong?
3. Is `teacher_profile.php` reachable from any working page?
4. Was `branches` intended as a real campus model?
5. Which parts of the original were actually used in practice?

---

## 15. Recommended next milestone

**Milestone 1 — Technical Audit and Architecture Proposal (documentation only, no code).**

Deliverables:
1. `docs/PROJECT-AUDIT.md` — deeper trace of inherited flows and a prioritised defect list
2. `docs/PRODUCT-REQUIREMENTS.md` — real student workflows, personas, must / should / won't
3. `docs/ARCHITECTURE-PROPOSAL.md` — two or three stack options with trade-offs and costs
4. `docs/UI-UX-DESIGN-SYSTEM.md` — design tokens, type scale, component inventory
5. `docs/IMPLEMENTATION-ROADMAP.md` — phased build plan

Only after the owner **approves the architecture** does implementation begin.

---

*End of handover.*

