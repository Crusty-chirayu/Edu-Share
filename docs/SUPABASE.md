# Supabase integration & safe migration workflow (M3)

> **Status:** code boundary implemented, live integration NOT verified.
> No Supabase project exists, no credentials were invented, no migration has
> touched any remote database. The only verified database path is the local
> Docker PostgreSQL (`compose.yaml`) and CI's disposable Postgres service.

## 1. Which pieces touch Supabase

| Piece | File | Behaviour when unconfigured |
| --- | --- | --- |
| Lazy client boundary | `src/lib/supabase.ts` | `getSupabase()` returns `null`; `isSupabaseConfigured()` is `false` |
| Env validation | `src/lib/env.ts` | `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` default to `""` (optional) |
| Health endpoint | `src/app/api/health/route.ts` | Reports local `DATABASE_URL` reachability only; never pings Supabase |
| Migration runner | `src/db/migrate.ts` | Uses `DIRECT_URL` when set, else `DATABASE_URL`; refuses nothing by itself — the operator chooses the target (see §3) |

## 2. Local development (verified path)

```powershell
Copy-Item .env.example .env   # then keep defaults: local Docker Postgres
docker compose up -d
npm run db:migrate            # apply 0001 foundation_journal
npm run db:migrate:status     # expect 0001 applied=true
npm run db:seed               # writes one health_probes row
npm run dev                   # http://localhost:3000, /api/health -> 200 when DB is up, 503 when down
```

Docker Desktop was **not running** on this machine during M3, so
`db:migrate` / `db:seed` against local Postgres are implemented and covered by
the up/down/status code path but their live run is recorded as BLOCKED below.
CI runs the same sequence against its Postgres service on every PR.

## 3. Supabase path (documented, NOT yet executed)

1. Create a Supabase project by hand (free tier). Do NOT commit its keys.
2. In `.env` (local only, git-ignored), set:
   - `DATABASE_URL` = Supabase **pooled** connection (Transaction mode, port 6543)
   - `DIRECT_URL` = Supabase **direct** connection (Session/direct, port 5432)
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://<ref>.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the anon key
3. Run `npm run db:migrate:status` first — it only reads.
4. Run `npm run db:migrate` — applies `0001` inside one session each; journal row
   recorded in `schema_migrations` with `ON CONFLICT DO NOTHING` (idempotent).
5. Roll back only on a disposable branch/database: `npm run db:migrate:down`
   drops `health_probes` + `schema_migrations`. **Never run `down` against a
   shared/production database** — it is a development affordance for gate G6.

## 4. Safety rules (standing)

- No `DATABASE_URL` is ever committed. `.env` is git-ignored; only `.env.example`
  (placeholders) is tracked.
- Integration tests (`src/db/db.integration.test.ts`) refuse any target that is
  not localhost or a `*test*` database, even when `RUN_DB_TESTS=1`.
- `db:seed` writes a single `health_probes` row — no users, no taxonomy, no PII.
- Product migrations (M5+) append new `0002+` entries with explicit `up`/`down`;
  the `down` of `0001` is never extended in place.
