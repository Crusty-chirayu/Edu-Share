# DATABASE SCHEMA — EDU-SHARE

**Status:** written from the code in [`src/db/migrations.ts`](../src/db/migrations.ts).
**Runtime verification: NOT EXECUTED** — the session's terminal was unavailable, so
migration `0002` has never been applied to a database. Treat the SQL as reviewed
code, not as a proven-applied schema, until the owner runs the cycle in §6.

**Single source of truth:** migrations, not this document. If they disagree, the
migration wins and this file is the bug.

---

## 1. Migrations

- `0001_foundation_journal` — `schema_migrations` (the journal) + `health_probes`.
  Applied and verified in M3. Never rewrite it.
- `0002_resource_core` — the product schema: `profiles`, `institutions`,
  `subjects`, `resources`, `bookmarks`, their indexes, the RLS identity bridge and
  the row-level policies. Forward-only in practice: once resources exist in
  production, changes ship as new migrations.

Both migrations are exact `up`/`down` inverses, and the existing runner records
each in `schema_migrations` after it succeeds, deleting the row on a successful
`down` — so the journal never claims a migration that is not there.

---

## 2. Tables

- **`profiles`** — one row per author. `id` (UUID, generated) is the identity the
  app uses; `auth_user_id` is the *nullable* link to a Supabase Auth user, so a
  local/demo profile can exist before Auth is configured. `display_name` is the
  only field meant to be shown publicly. `role` is a `CHECK`-constrained enum
  (`student` | `teacher` | `admin`) that **cannot be self-assigned** by a client:
  it is written server-side only (fixes inherited `AUD-002`, privilege escalation
  by self-selected role). `email` is stored for the future Auth mapping and is
  never exposed by the app layer or by the RLS policies below.
- **`institutions`** — the sharing boundary of the product. `name` is unique.
- **`subjects`** — taxonomy rows, `UNIQUE (institution_id, name)`: the same subject
  name may exist in two institutions, which is exactly the inherited `AUD-010`
  defect (a globally unique course name) this design removes. Deleting an
  institution cascades to its subjects; deleting a subject nulls
  `resources.subject_id` rather than deleting shared material.
- **`resources`** — the material itself. Ownership is `owner_id` (cascade on
  author removal). `visibility` is `public` | `private` and defaults to `public`.
  File columns are metadata only — `file_key` is an **opaque storage key**
  (never a filesystem path, never a public URL); `file_name`,
  `file_size_bytes` and `file_mime_type` describe it for display and validation.
  `search_vector` is a **stored generated column** over title + description, so
  the GIN index and the query expression cannot drift apart.
- **`bookmarks`** — `PRIMARY KEY (user_id, resource_id)` makes "save twice"
  impossible at the storage layer; cascade from both sides.

Not created, deliberately: any table for a feature the requirements do not
contain, plus the inherited app's `admin`-writable hierarchy tables (taxonomy
here is reference data, not an admin panel surface).

---

## 3. Indexes, and the query each one serves

- `resources_public_feed_idx` — partial, `created_at DESC WHERE visibility = 'public'`:
  the discovery feed, sorted newest first.
- `resources_search_idx` — GIN on `search_vector`: keyword search
  (`websearch_to_tsquery('english', $1) AND search_vector @@ ...`).
- `resources_owner_idx` — "my resources" and the ownership check on every
  update/delete.
- `resources_subject_idx` — the subject filter.
- `subjects_institution_idx` — taxonomy lookups per institution.
- `bookmarks_resource_idx` — reverse lookup (how many saves a resource has).

Every list query must paginate with an explicit `LIMIT`/`OFFSET` or keyset
window; there is no unbounded read path in the schema's design.

---

## 4. Row Level Security

All five tables have RLS **enabled**. RLS is the second line of defence: the
application also checks ownership in its service layer, because the local
migration/dev CLI connects as the table owner, which bypasses RLS.

Identity bridge: `public.app_current_user_id()` returns
`nullif(current_setting('app.user_id', true), '')::uuid` — the server sets a
**transaction-local** `app.user_id` before issuing queries as a given user.
Anonymous callers get `NULL`, which is why the public-read paths below work for
signed-out visitors and everything else does not.

- `profiles` — SELECT: own row, or the row of an author whose resources you can
  read. INSERT/UPDATE: own row only. **No DELETE policy**: account removal is an
  owner/admin action, never self-service.
- `institutions`, `subjects` — SELECT for all, **no write policies**: the
  taxonomy is reference data written server-side only, so a compromised client
  token cannot invent subjects.
- `resources` — SELECT: `visibility = 'public' OR owner_id = current`. INSERT,
  UPDATE, DELETE: `owner_id = current` only. A private resource is invisible to
  everyone but its author, at the database level.
- `bookmarks` — `FOR ALL`, restricted to `user_id = current`: bookmarks are
  private to their owner in both directions.

Anonymous traffic is therefore *possible* only through the explicit
public-visibility rules; nothing is open by default. `profiles.email` is the one
value this design does not yet fully protect, because the `profiles_read`
policy exposes whole rows: a profile that has published a resource is readable,
email included. **Known limitation** — fixed either by moving `email` to a
separate table or by a column-scoped view before any real user data exists.

These policies are **statically reviewed only**. They have never been executed by
PostgreSQL, and hosted policy execution is explicitly out of scope for this
session (§6 gives the owner-run procedure).

---

## 5. Deliberately absent

No `tsvector` trigger, no soft deletes, no `deleted_at`, no audit log, no `users`
table duplicating Supabase Auth, no favourites-and-likes-and-views variants. Each
would be speculative scope; the roadmap says what comes next.

---

## 6. Owner-run verification (nothing here has been run)

Against the **disposable local database only**:

```powershell
npm run db:migrate:status        # expect: migration 0002: pending
npm run db:migrate               # applies 0001 + 0002 to 127.0.0.1
npm run db:migrate:status        # expect: migration 0002: applied
npx vitest run src/db/migrations.test.ts
npm run db:migrate:down          # loopback-only; reverses 0002 exactly
npm run db:migrate:status        # expect: migration 0002: pending
npm run db:migrate               # re-apply for local development
```

`db:migrate:down` against a hosted Supabase project must be refused by the
existing guard; see [`M3-VERIFICATION.md`](./M3-VERIFICATION.md) §6. A hosted
project is applied with `up` only, exactly once, by the owner.