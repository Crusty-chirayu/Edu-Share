# Supabase integration & safe migration workflow (M3)

> **Status 2026-09-27:** hosted verification against project `uqcmcurhohbdnxzpdpei`
> in progress — see §5. No credentials are recorded here; `.env` stays local.

## 1. Which pieces touch Supabase

| Piece                | File                                           | Behaviour when unconfigured                                                                                                                              |
| -------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lazy client boundary | `src/lib/supabase.ts`                          | `getSupabase()` returns `null`; `isSupabaseConfigured()` is `false`                                                                                      |
| Env validation       | `src/lib/env.ts`                               | `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` default to `""` (optional)                                                                                      |
| Health endpoint      | `src/app/api/health/route.ts`                  | Reports local `DATABASE_URL` reachability only; never pings Supabase                                                                                     |
| Migration runner     | `src/db/migrate.ts` + `src/db/guard.ts`        | `status` is read-only (no guard); `up`/`down` assert the target first: loopback, or a Supabase host whose project ref matches `NEXT_PUBLIC_SUPABASE_URL` |
| Read-only inspector  | `scripts/inspect-db.ts` (`npm run db:inspect`) | Prints DB identity (no credentials), foundation-table presence, journal rows, probe count                                                                |

## 2. Local development (verified path)

```powershell
Copy-Item .env.example .env   # then keep defaults: local Docker Postgres
docker compose up -d
npm run db:migrate            # apply 0001 foundation_journal
npm run db:migrate:status     # expect: migration 0001: applied
npm run db:seed               # writes one health_probes row
npm run dev                   # http://localhost:3000, /api/health -> 200 when DB is up, 503 when down
```

Docker Desktop is optional. Two supported paths:

- **Hosted Supabase (primary):** `npm run db:inspect` → `:migrate:status` →
  `:migrate` → `:seed`. `up`/`down`/`seed` refuse any target that is not
  loopback or the configured project ref (see guard in §4).
- **Local Docker (fallback):** `docker compose up -d`, then the same commands.

## 3. Supabase path (project `uqcmcurhohbdnxzpdpei`)

1. In `.env` (local only, git-ignored), set:
   - `DATABASE_URL` = pooled connection (Transaction mode, port 6543)
   - `DIRECT_URL` = direct connection (Session/direct, port 5432)
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://uqcmcurhohbdnxzpdpei.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key
2. Run `npm run db:inspect` first (read-only identity + table check).
3. Run `npm run db:migrate:status` — read-only; always prints
   `migration 0001: applied|pending` lines to stdout.
4. Run `npm run db:migrate` — applies `0001` only if the journal lacks it
   (`ON CONFLICT DO NOTHING` + per-version skip); records the journal row.
5. **Never run `db:migrate:down` against hosted Supabase.** Rollback exists for
   disposable local/CI databases only (gate G6 runs it there). This is now
   enforced in code, not just by convention: `migrateDown()` refuses any
   non-loopback host — including a ref-matched hosted one — _before_ it opens a
   connection, so the hosted project cannot be rolled back from the CLI at all.

## 4. Safety rules (standing)

- No `DATABASE_URL` is ever committed. `.env` is git-ignored; only `.env.example`
  (placeholders) is tracked.
- Writes (`up`/`down`/`seed`) run only after `assertWriteTarget()` proves the
  target is loopback (`localhost`/`127.0.0.1`/`::1`/`[::1]`) or matches the
  configured Supabase ref **exactly**: hostname `db.<ref>.supabase.co`, or a
  `*.pooler.supabase.com` host with the decoded user `postgres.<ref>`.
  Substring lookalikes (`db.<ref>.supabase.co.evil.example.com`) are refused.
  Anything else exits 1 before any connection opens.
- `status` and `db:inspect` are read-only and never take the write path.
- Rollback is **loopback-only**, enforced separately from the write-target
  guard: `migrateDown()` calls `isLoopbackHost(target.host)` after
  `assertWriteTarget()` and throws before connecting, so a ref-matched hosted
  Supabase target — which `up` must accept — is still refused for `down`. There
  is deliberately no environment-variable bypass (`ALLOW_HOSTED_ROLLBACK` and
  similar do not exist).
- The journal stays truthful after a rollback: once a migration's `down`
  succeeds, its `schema_migrations` row is deleted (guarded by a
  `to_regclass('public.schema_migrations')` check, so it is a no-op when the
  `down` dropped the journal itself, as `0001` does). Without it, `status`
  would report a reverted migration as `applied`.
- Integration tests allow loopback, `*test*` databases, or the configured
  Supabase ref — never an unverified remote host.
- `db:seed` writes probe rows only (capped at 5, pruned oldest-first) — no
  users, no taxonomy, no PII, no product tables.
- The absent `./drizzle/` directory is by design: `drizzle.config.ts` is the
  drizzle-kit codegen config for future `generate` use; the committed migration
  source of truth is `src/db/migrations.ts` (plain versioned SQL with explicit
  down), so there is no missing artifact to reconstruct.
- Product migrations (M5+) append new `0002+` entries with explicit `up`/`down`;
  the `down` of `0001` is never extended in place.

## 5. Verification log (this task — shell unavailable, results owner-reported)

> The dev-machine shell was unavailable to this session (`shell process has
exited` on every command), so hosted commands were executed by the owner in
> their own terminal and their outputs pasted back. Results below are recorded
> as owner-reported, not first-hand.

| Check                        | Result                                                                                                                                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run db:inspect`         | ⏳ pending — paste output in next session                                                                                                                                                                       |
| `npm run db:migrate:status`  | ⏳ pending — expect `migration 0001: applied` or `pending` on stdout (fix: status no longer goes through the level-filtered logger)                                                                             |
| `npm run db:migrate`         | ⏳ pending — safe to run: guard + idempotent skip; no destructive SQL (only two `CREATE TABLE IF NOT EXISTS` + journal insert)                                                                                  |
| `npm run db:seed`            | ⏳ pending — run after `up`; bounded probe write only                                                                                                                                                           |
| Why status was silent before | Diagnosed: `scripts/migrate.ts` logged status via `logger.info`, and `LOG_LEVEL=warn` in CI/owner env suppressed `info` — exit 0, no output. Now uses `console.log`. Errors use `console.error` + nonzero exit. |
| Why `drizzle/` is absent     | By design (custom runner, not drizzle-kit `generate`). Documented, no files to reconstruct.                                                                                                                     |

## 6. Exact verification sequence (run in the project root, in order)

```powershell
Set-Location E:\projects\edu-share-platform
npm run db:inspect
npm run db:migrate:status
npm run db:migrate
npm run db:migrate:status
npm run db:inspect
npm run db:seed
npm run db:inspect
```

Paste back the full output of each command (redact nothing yourself — the
scripts already print hostnames only, never credentials). Expected:

1. `db:inspect` → `db: PostgreSQL … connected host=<db host>`, `foundation tables: (none)` or
   the two tables, journal/probe `regclass` lines, journal rows if any.
2. `status` → `migration 0001: pending` (fresh) or `applied` (already migrated).
3. `up` → `migrate up: ok (host=… via=DIRECT_URL|DATABASE_URL)`.
4. `status` → `migration 0001: applied`.
5. `inspect` → both tables present, `applied: 0001 foundation_journal`.
6. `seed` → `seed: ok health_probes=<n> (host=… via=…)`.
7. `inspect` → `health_probes rows=<n>`.

If step 1 shows unexpected tables or data beyond the two foundation tables,
stop before step 3 and report — do not migrate over an unknown schema.

## 7. Rollback cycle and the M3 verification runbook

`down` is not part of the hosted sequence above. The only place it is exercised
is a disposable local database, where the loopback barrier permits it:

```powershell
Set-Location E:\projects\edu-share-platform
docker compose up -d          # 127.0.0.1:5432/edushare (compose.yaml)
npm run db:migrate            # apply 0001
npm run db:migrate:down       # allowed: loopback
npm run db:migrate:status     # expect `migration 0001: pending` again
npm run db:migrate            # re-apply; must be idempotent
```

Against a hosted target the same command must fail safely:

```powershell
npm run db:migrate:down
# exit code 1, `Refusing migrate down: host "db.<ref>.supabase.co" is not loopback.`
# no connection is opened and nothing on the hosted project changes.
```

The full ordered runbook — typecheck, lint, format, tests, build, the local
cycle above, the hosted refusal proof, and the git review/commit steps — is
[`M3-VERIFICATION.md`](./M3-VERIFICATION.md). This document (§5) still records
the _hosted_ commands as owner-reported and pending; the runbook adds the
local rollback cycle and the refusal proof on top.
