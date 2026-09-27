# M3 migration-safety verification runbook

> **Status 2026-09-27: written, not executed.** The session that produced these
> code changes had no working shell (every command returned
> `The terminal's shell process has exited`), so **nothing in this file is a
> recorded result**. Every "expect" below is a claim to confirm, and every step
> is owner-run. Update this file with real output before treating M3 as verified.

Audience: the owner, at the keyboard, in the project root
`E:\projects\edu-share-platform`.

## 1. What changed in this session (uncommitted)

Code:

- `src/db/migrate.ts` — `migrateDown()` gained an independent **loopback-only
  barrier**: `assertWriteTarget()` runs first (so an unconfigured/foreign target
  still fails with the guard's own message), then `isLoopbackHost(target.host)`
  is checked and a non-loopback host throws **before any connection opens**.
  `up` is unchanged, so the ref-matched hosted project remains migrateable while
  hosted rollback is impossible. After a successful `down`, the migration's
  `schema_migrations` row is now deleted, guarded by a
  `to_regclass('public.schema_migrations')` truthy check — this keeps the journal
  truthful for future migrations whose `down` keeps the journal (for `0001` the
  `down` drops the journal, so the check correctly skips the delete).
- `src/db/migrate.test.ts` — **new file**. Stubs the `postgres` driver with a
  factory that records every connection attempt and then throws
  `network disabled in unit tests`. That makes "was a connection attempted?"
  directly observable: the hosted-refusal tests assert `connectCalls` is empty,
  which is what proves the refusal happens *before* connecting. Covers the
  barrier (ref-matched hosted refusal, unconfigured-project refusal, `up` still
  reaching a hosted target, loopback `down` reaching the driver) and
  `describeWriteTarget()` (reports host/source, never credentials; returns
  `url=<invalid environment>` when the env is unusable).
- `src/db/guard.test.ts` — negative cases added: missing `DATABASE_URL`,
  percent-encoded host (`db.%75qcm…` — `%75` is `u`, and opaque hosts are never
  decoded, so it must not be treated as the project), trailing-dot host
  (`db.<ref>.supabase.co.`, refused rather than trimmed), plus
  `matchesSupabaseRef` edge cases.
- `src/db/migrations.test.ts` — invariant test: versions are unique and strictly
  sorted, names are unique.

Docs:

- `docs/SUPABASE.md` — §3 step 5 records that the hosted-rollback ban is now
  enforced in code; §4 gains the barrier and truthful-journal rules; §7 adds the
  rollback cycle and points here.
- `README.md` — local-setup comment corrected (`.env.example` already contains
  valid local Docker defaults; Supabase values are optional), check list now
  matches CI order, and this runbook is linked from the docs table.
- `docs/DEVELOPMENT-STATUS.md`, `docs/CONTINUATION-CHECKPOINT.md` — updated to
  separate *verified* from *pending*.

Confirm the exact set with `git --no-pager status -sb` before staging; do not
stage a file you have not read in the diff.

## 2. Step 1 — static gates, in CI order

Run from the project root. Every command must exit 0; in PowerShell check the
code immediately after each one, because text output alone proves nothing:

```powershell
npx tsc --noEmit            # expect no output; $LASTEXITCODE -eq 0
npx eslint .                # expect no output; $LASTEXITCODE -eq 0
npx prettier --check .      # see §3: run `npm run format:write` once first
npx vitest run              # see §4
npm run build               # expect the Next.js build to complete; exit 0
```

These are the same underlying commands as the `package.json` scripts
(`npm run typecheck`, `npm run lint`, `npm run format`, `npm test`,
`npm run build`), so either form is fine. CI additionally passes `--run` to
`npm test` (`vitest run --run`), which is harmless.

## 3. Known issue — the format gate fails on this repo's markdown

**Run this before the check step, once:**

```powershell
npm run format:write          # == npx prettier --write .
```

Why it is needed, and why it is not caused by this session's edits:

1. `.prettierignore` excludes config and build artifacts only —
   `.prettierrc.json`, `eslint.config.mjs`, `next-env.d.ts`, `.next`, `out`,
   `coverage`, `playwright-report`, `test-results` — and contains **no** `*.md`
   pattern, so `npm run format` (i.e. `prettier --check .`, Prettier 3.6.2, the
   CI step named "Format check") inspects `README.md` and every `docs/*.md`.
2. Prettier's markdown printer **aligns table columns**. The delimiter row of
   the first README table is `| --- | --- |` while the column it belongs to holds
   `` `docs/PROJECT-AUDIT.md` `` (24 characters wide); Prettier would emit
   `| ------------------------ | --- |`. The same unpadded style appears
   throughout `README.md` and `docs/*.md`, so the check reports those files as
   unformatted.
3. Because that style is in already-pushed files as well as in this session's
   edits, the format gate was most likely **already red at HEAD**, independent of
   this work. (Inferred from the file contents and Prettier's documented table
   behaviour — this session could not run the check to confirm.)

Remediation is one `prettier --write .` run, which only re-pads markdown tables
and whitespace; it does not reflow prose (`proseWrap: "preserve"` in
`.prettierrc.json`), so paragraph line breaks written by hand are kept. Review
`git --no-pager diff --stat` afterwards: expect doc-only, whitespace-only
changes plus the new files.

This runbook deliberately contains **no markdown tables**, so the only change
`--write` should make to it is whitespace normalization (blank lines, the
trailing newline). If it rewrites prose or aligns a table in this file, that is
a signal the assumption above is wrong and the diff needs review before
committing.

## 4. Step 2 — unit tests (no database needed)

```powershell
npx vitest run
```

Expect every suite green. `src/db/db.integration.test.ts` is
`describe.skipIf(process.env.RUN_DB_TESTS !== "1")`, so it reports as **skipped**
here — a skip is expected, not a failure. The suites that matter for this work:

- `src/db/guard.test.ts` — write-target rules, exact-match ref checking, and
  credential redaction.
- `src/db/migrate.test.ts` — the rollback barrier with the `postgres` driver
  stubbed. Its stub records every connection attempt and then throws
  `network disabled in unit tests`, so a failure here means either a refusal
  happened *after* a connection attempt (`connectCalls` non-empty) or a legal
  rollback never reached the driver.
- `src/db/migrations.test.ts` — migration-file invariants (unique, strictly
  sorted versions; unique names).

Optional extra, needs a reachable database (the local Docker one is enough):

```powershell
$env:RUN_DB_TESTS = "1"
npx vitest run src/db/db.integration.test.ts
Remove-Item Env:RUN_DB_TESTS
```

It issues `SELECT 1` only, and it self-checks its target first: loopback, a
database path containing `test`, or the ref-matched Supabase project.

## 5. Step 3 — local database cycle (the only executed proof of `down`)

```powershell
docker compose up -d          # postgres:16-alpine, 127.0.0.1:5432, db=edushare
docker compose ps             # expect the db service healthy
npm run db:inspect            # read-only identity: host, tables, journal
npm run db:migrate:status     # expect: migration 0001: pending
npm run db:migrate            # expect: migration 0001: applied, then
                              #         migrate up: ok (host=127.0.0.1 via=DATABASE_URL)
npm run db:migrate            # re-run: must be idempotent, same output, exit 0
npm run db:migrate:down       # loopback, so permitted:
                              #   migrate down: ok (host=127.0.0.1 via=DATABASE_URL)
npm run db:migrate:status     # expect: migration 0001: pending  (journal truthful)
npm run db:migrate            # re-apply, leaving the database usable
npm run db:seed               # optional: seed: ok health_probes=1 (prunes to 5 newest)
```

Notes that prevent false alarms:

- The verbose per-step lines (`migration applied`, `migration reversed`) go
  through the JSON logger and may be filtered by `LOG_LEVEL`; the reliable
  markers are the `migration <version>: applied|pending` lines and the final
  `migrate up: ok ...` / `migrate down: ok ...` lines, which are plain stdout.
  There is no "reverted" line to look for.
- `via=DATABASE_URL` is expected when `DIRECT_URL` is empty (the
  `.env.example` default); `via=DIRECT_URL` appears when it is set.
- `db:inspect` and `db:migrate:status` are read-only and never take the write
  path, so they work even when the write guard would refuse the target.
- If `docker compose up -d` fails because the Docker daemon is down, this step is
  **blocked**. Record that outcome; do not treat the local cycle as verified.
  Rollback is the one behaviour that cannot be proven any other way — CI runs its
  own disposable service, but only the owner can run this here.

## 6. Step 4 — hosted refusal proof (no hosted writes at all)

With the hosted values present in `.env` (`DIRECT_URL`/`DATABASE_URL` pointing at
`db.<ref>.supabase.co`, and `NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co`
for that same ref):

```powershell
npm run db:migrate:status   # read-only, must still work against hosted
npm run db:migrate:down     # MUST fail before connecting
$LASTEXITCODE               # expect 1
```

Expect stderr shaped like this (record your exact text):

```text
migration down failed (host=db.<ref>.supabase.co via=DATABASE_URL): Refusing migrate down: host "db.<ref>.supabase.co" is not loopback. Rollback is only permitted against a local/disposable database (localhost, 127.0.0.1, [::1]); hosted Supabase schema changes stay in the dashboard (docs/SUPABASE.md, section 4).
```

The decisive detail is that the message is a **policy refusal**: there must be no
`ECONNREFUSED`, `timeout`, `password authentication failed` or any other
connection-level error, because the barrier runs before `postgres(url, ...)` is
called. `src/db/migrate.test.ts` asserts the same property offline by checking
that the stubbed driver recorded zero connection attempts.

Do **not** run `npm run db:migrate` (hosted `up`) in this section — that is a real
write and belongs to the documented sequence in `docs/SUPABASE.md` §3, which is
still recorded there as owner-reported and pending. Two related refusals are
worth confirming only if they apply to you: a remote host with
`NEXT_PUBLIC_SUPABASE_URL` unset fails with `... is unset, so the target project
cannot be verified`, and a remote host whose ref differs fails with
`... does not match Supabase project ref "<ref>"`.

## 7. Step 5 — production build

```powershell
npm run build
```

Expect a successful Next.js production build (the `/api/health` route and app
routes compiled) and exit code 0. This is the same gate CI runs, so a failure
here is blocking.

## 8. Step 6 — review, then commit

```powershell
git --no-pager status -sb
git --no-pager diff --check     # expect no output (no whitespace errors)
git --no-pager diff --stat      # expect code+tests+docs only; no .env, no dumps
git --no-pager diff             # read all of it before staging anything
git --no-pager status --ignored --short | Select-String "\.env"
```

Use `--no-pager`: an interactive pager is what left the previous session's shell
unusable. Then stage **explicit paths only** — never `git add .` — for example:

```powershell
git add src/db/guard.ts src/db/guard.test.ts src/db/migrate.ts src/db/migrate.test.ts src/db/migrations.test.ts src/db/db.integration.test.ts scripts/inspect-db.ts package.json docs/SUPABASE.md docs/M3-VERIFICATION.md docs/DEVELOPMENT-STATUS.md docs/CONTINUATION-CHECKPOINT.md README.md
git --no-pager diff --cached --stat
git commit -m "Harden M3 migration safety: loopback-only rollback, truthful journal, tests"
git push origin main
```

Push only if every step above passed and the owner authorizes it. Never
force-push, never rewrite history, never touch `E:\projects\Edu-Share`. If the
`prettier --write .` run from §3 touched files, include them in the same commit —
a formatting-only commit that also re-pads doc tables is easier to review than a
separate one.

## 9. What to report back

Paste raw output, not a summary, for: `npx tsc --noEmit`, `npx eslint .`,
`npx prettier --check .` (after the `--write` run), `npx vitest run` (the final
counts), `npm run build` (the route table), the commands in §5, the failed
`npm run db:migrate:down` from §6 **with its exit code**, and
`git --no-pager status -sb`.

If something fails, record the exact command and its output in
`docs/DEVELOPMENT-STATUS.md` under M3, and correct this file if an expectation
turned out to be wrong (an expectation that was never run is a claim, not a
result). Do not silently drop a failing step.

## 10. Boundary

This runbook verifies M3 only. No M4 tokens/components/shell, no M5
auth/sessions/roles, no M6–M11, no deploy, no paid service, and no hosted write
beyond the already-documented `up` sequence in `docs/SUPABASE.md` §3. The
inherited project at `E:\projects\Edu-Share` stays untouched.

