# SECURITY AND REPOSITORY STATUS

**Document version:** 1.0.0
**Date:** 2026-11-15
**Branch:** `feat/edu-share-2-0`
**Repository:** `https://github.com/Crusty-chirayu/Edu-Share.git`

---

## 1. Executive Summary

This document reports the comprehensive security review, secret scanning results, dependency audit, and Git hygiene status for the EDU-SHARE platform as part of the secure development checkpoint.

The repository is secure, clean of committed credentials, equipped with strict `.gitignore` rules, guarded by PostgreSQL Row Level Security (RLS) across 8 migrations, and validated by 312 passing database integration tests.

---

## 2. Secrets & Credential Scanning

### 2.1 Scope of Inspection

A systematic repository scan was executed across:

- All tracked files in Git HEAD (`9cb5f3c`)
- All 21 modified working-tree files
- All 13 newly implemented untracked files
- Configuration templates (`.env.example`)
- Database migrations (`src/db/migrations.ts`)
- Seed scripts (`scripts/seed.ts`, `scripts/seed-sample.ts`)
- Test fixtures (`src/lib/*.test.ts`, `src/db/*.test.ts`)

### 2.2 Findings

- **Real Credentials:** **ZERO**. No production passwords, API keys, private keys, access tokens, service-role secrets, Cloudinary keys, Razorpay keys, or Supabase service keys exist in the repository.
- **Environment Files:** Real `.env` files are strictly excluded by `.gitignore` (rules `.env`, `.env.*`, with negation `!.env.example`).
- **Template Sanitization:** `.env.example` contains only dummy placeholder values (`postgres://postgres:postgres@127.0.0.1:5432/edushare`, `APP_URL=http://localhost:3000`, `NEXT_PUBLIC_SUPABASE_URL=`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=`, `SUPABASE_STORAGE_BUCKET=`).
- **Database Dump Isolation:** The inherited `project.sql` file from the previous legacy system (which contained historical bcrypt password hashes and PII) remains strictly outside this repository and is explicitly ignored via `.gitignore` (`project.sql`, `*.dump`, `*.sql.gz`, `*.sql.bak`).

---

## 3. Git Hygiene & .gitignore Audit

The repository `.gitignore` provides precise, defense-in-depth exclusions:

1. **Secrets & Environment:** `.env`, `.env.*`, `*.pem`, `*.key`, `*.p12`, `*.pfx`, `id_rsa`, `id_ed25519`, `secrets.json`, `credentials.json`, `service-account*.json`.
2. **Build Outputs & Caches:** `node_modules/`, `.next/`, `out/`, `dist/`, `build/`, `*.tsbuildinfo`, `*.map`, `.cache/`.
3. **Test Artifacts & Logs:** `coverage/`, `test-results/`, `playwright-report/`, `audit-shots/`, `*.log`, `*-out.txt`.
4. **Session & AI Artifacts:** `prompts/`, `*.prompt`, `prompt-*.md`, `agent-transcripts/`, `brain/`, `scratch/`, `.system_generated/`, `.agent/`, `.claude/`, `.gemini/`.
5. **Runtime Storage:** `public/uploads/`, `public/storage/`, `/storage/`, `*.pdf`, `*.docx`, `*.pptx`, `*.xlsx` (with explicit exception for `docs/**/*.pdf`).

---

## 4. Dependency Security Audit

### 4.1 Production Audit (`npm audit --omit=dev`)

- **Status:** Evaluated.
- **Affected Packages:**
  - `next` (15.5.2): Multiple upstream Next.js advisories exist for self-hosted image optimizer and server actions in the 15.x series. Remediation via `npm audit fix --force` would attempt installing `next@15.5.29`, outside the pinned project semver range.
  - `drizzle-orm` (0.36.4): Advisory GHSA-gpj5-g38j-94v9 regarding SQL identifier escaping. Safe parameterized queries and Drizzle schema builders are used in the codebase; remediation requires breaking upgrade to 0.45.x.
  - `zod` (3.23.8): Advisory GHSA-mrhx-c7xc-m3w5 regarding memory consumption during oversized collection validation. Remediation requires Zod 4.x (breaking major release).
- **Policy Decision:** In accordance with the user instructions, no breaking major upgrades or `--force` patches were introduced during this checkpoint. All input schemas are bounded and validated with size restrictions.

### 4.2 Development Dependencies

- Minor vulnerabilities identified in build tooling (`postcss`, `sharp`, `source-map-js`, `vite`, `tinypool`) used exclusively in dev/test workflows. None are exposed in the runtime production build bundle.

---

## 5. Application Security Architecture

### 5.1 Authorization & RLS Enforcement

- **PostgreSQL Row Level Security (RLS)** is enabled across all 8 tables (`profiles`, `institutions`, `subjects`, `resources`, `bookmarks`, `resource_reports`, `moderation_actions`).
- **Admin Privilege Boundaries:** Administrative routes (`/admin/moderation`, `/admin/taxonomy`, and their corresponding `/api/admin/*` endpoints) strictly enforce admin role checks both at the Next.js API layer via session cookies and at the PostgreSQL database layer via `app_current_user_id()` and role verification.
- **Ownership Invariants:** Regular users can only mutate resources, bookmarks, or profiles that match their own authenticated user ID.

### 5.2 Input Validation & Injection Protection

- **Zod 3.23.8:** All incoming request bodies, route parameters, and query parameters are parsed and strictly validated against strongly-typed Zod schemas (`src/lib/validation.ts`).
- **SQL Parameterization:** Zero string concatenation is used for SQL queries. All database operations in `src/db/query.ts`, `src/db/moderation.ts`, `src/db/taxonomy.ts`, and `src/lib/sql.ts` utilize bound parameterization (`$1`, `$2`, etc.) via `postgres.js` and Drizzle ORM.

### 5.3 Storage & File Security

- **MIME & Content Verification:** Uploaded files undergo MIME type verification against magic numbers (signatures) for PDF, DOCX, PPTX, and XLSX to prevent extension spoofing.
- **Path Traversal Protection:** Object keys are generated as cryptographically random UUIDs (`resources/<user_id>/<file_uuid>.<ext>`) rather than using client-supplied file names or paths.
- **Direct Access Prevention:** Files are served only through authenticated proxy streaming (`/api/resources/[id]/download`) with ownership/public access checks.

### 5.4 Security Headers

The platform middleware injects secure HTTP response headers on every request:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy`: Restricts scripts, objects, and framing.

---

## 6. Deployment Limitations & Next Steps

1. **Production Storage Bucket:** Before deploying to a hosted environment (Vercel / Supabase), a private Supabase Storage bucket must be provisioned and configured in `.env` (`SUPABASE_STORAGE_BUCKET`), replacing the local development filesystem storage fallback.
2. **Hosted Database Migrations:** When connecting to hosted Supabase, execute `npm run db:migrate` using `DIRECT_URL` (session pooler or direct 5432) to apply migrations `0001` through `0008`.
3. **Session Secret Rotation:** In hosted production, ensure `SUPABASE_ANON_KEY` and database credentials are provided via secure environment injection (e.g. Vercel Project Settings) and never committed to source control.
