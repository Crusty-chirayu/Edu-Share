# ARCHITECTURE PROPOSAL — EDU-SHARE

| Field | Value |
| --- | --- |
| **Status** | Proposed — requires owner approval before any implementation |
| **Last reviewed** | 2026-09-26 |
| **Owner** | Chirayu Babu Jaysawal |
| **Decision IDs** | `ADR-nnn` architecture decisions · `D-nnn` owner decisions |
| **Related** | [PROJECT-AUDIT.md](./PROJECT-AUDIT.md) · [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) · [UI-UX-DESIGN-SYSTEM.md](./UI-UX-DESIGN-SYSTEM.md) · [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) |

> **Nothing in this document is implemented.** No framework has been installed, no
> project has been scaffolded, no database exists, and no service has been
> provisioned. This is a proposal, and it stays a proposal until it is approved.

---

## 1. Purpose

This is the central architecture decision document for EDU-SHARE. It evaluates
three realistic stacks against the actual requirements, recommends one, and
specifies it in enough detail that implementation can begin without further design
debate.

It also records **what would make us change our minds**, so that the decision is
revisitable on evidence rather than on fashion.

## 2. Inputs, constraints and non-negotiables

### 2.1 From the audit ([PROJECT-AUDIT.md](./PROJECT-AUDIT.md))

| Audit finding | Architectural consequence |
| --- | --- |
| AUD-001 unauthenticated arbitrary file read | File access must be a *server-mediated, authorised* operation. No file is ever reachable by a guessable URL |
| AUD-002 privilege escalation via self-selected role | Roles are data assigned by an administrator; authorisation is checked server-side at every boundary |
| AUD-004/005 no CSRF defence, GET-driven mutations | Every state change is a POST to a handler that validates a session-bound token |
| AUD-006 hardcoded credentials | Configuration comes from environment variables; no credential appears in source |
| AUD-007 uploads served from the web root | Storage is private by default and never inside the web root |
| AUD-008 extension-only file validation | Validation uses declared type, sniffed type, size, and a stored content hash |
| AUD-009 model drift (`materials.subject` vs `subjects` table) | One schema, one owner, migrations under version control |
| AUD-010 globally unique course name | Uniqueness constraints are scoped to their parent entity |
| AUD-012 inconsistent paths | A build system and a module resolver make paths explicit and checked at build time |
| AUD-014 no transactions | State-changing flows are transactional or explicitly compensating |

### 2.2 Constraints that are real

| Constraint | Consequence |
| --- | --- |
| **One developer**, a computer-engineering student, working with AI assistance | One language, one deployable, one database. No microservices, no message broker, no Kubernetes |
| **Little or no budget** | Free tiers must be sufficient for development and early production; every service choice must have a documented exit |
| **Coursework and exam pressure** | The project must survive weeks of neglect and stay deployable. Boring and documented beats clever and undocumented |
| **The inherited code is unlicensed** | Written from scratch. This is a constraint on the *plan*, not the architecture |
| **The product is inherently relational** | Institutions, programmes, semesters and subjects form a strict hierarchy with real foreign keys. This is why a relational database is not negotiable |

### 2.3 Non-negotiable architectural properties

1. **Server-authoritative authorisation.** Every read and write of a protected
   resource is authorised on the server against the session identity, never on the
   client.
2. **No credential or secret in source control.**
3. **Relational integrity enforced by the database**, not merely by application
   code.
4. **Private file storage.** Files are never served from a public directory.
5. **One deployable.** A single artefact that can be run, tested, and deployed by
   one person.
6. **Portability.** Every managed service sits behind an interface with a
   documented replacement.

### 2.4 Explicit non-goals for v1

- Real-time collaboration, chat, or presence.
- Native mobile applications.
- Video hosting or streaming.
- Microservices, event sourcing, or multi-region deployment.
- Paid institutional accounts, billing, or SSO.
## 3. The three candidate architectures

Three realistic options are evaluated. They are **candidates, not predetermined
winners**, and each is described fairly enough that a reviewer could choose it.

### 3.1 Option A — Integrated full-stack TypeScript

**Shape.** One TypeScript application (Next.js, App Router) rendering both the
interface and the server logic. Pages are React Server Components; mutations are
Server Actions or Route Handlers; data access goes through a typed query layer to a
managed PostgreSQL database; uploaded documents live in a private S3-compatible
bucket.

| Aspect | Detail |
| --- | --- |
| Frontend | React with server rendering — the same language on both sides of the boundary |
| Backend | Route Handlers and Server Actions inside the same process |
| Database | Managed PostgreSQL (Neon or Supabase) in production; Dockerised PostgreSQL locally |
| Storage | Private S3-compatible bucket. Cloudflare R2's free tier includes 10 GB-month of storage and free egress (verified 2026-09-26) |
| Deploy | Vercel Hobby, or any host that runs a Node server |
| Strength | One language, one deployable, one test suite, one mental model. Public resource pages are server-rendered and therefore indexable |
| Weakness | Framework coupling: Server Actions are a Next-specific idiom, so moving to a separate API later would mean rewriting the mutation layer |

### 3.2 Option B — Decoupled frontend and API

**Shape.** A React or Next.js frontend as a pure client of a separate Python
(FastAPI) or Node API service. The API owns the database and storage; the frontend
owns only presentation.

| Aspect | Detail |
| --- | --- |
| Frontend | React SPA, or Next.js with client-side data fetching |
| Backend | FastAPI with SQLAlchemy and Pydantic, or Node with Fastify — deployed separately |
| Database | The same managed PostgreSQL, reachable only by the API |
| Storage | The same private bucket, reachable only by the API |
| Deploy | Two services, plus the database and the bucket |
| Strength | A clean contract-first boundary. The API is independently testable and reusable by a future native mobile client. Python brings a richer data and AI ecosystem later |
| Weakness | Two languages, two dependency trees, two deploy pipelines, and two surfaces to secure — for one developer. Identity must also cross an origin boundary (tokens or a shared cookie domain), which is exactly where session-handling bugs live |

### 3.3 Option C — Backend-as-a-service led

**Shape.** A managed platform (Supabase) supplies the database, authentication,
storage and row-level policies. The application is largely a frontend using the
platform SDK, with security expressed as database policies.

| Aspect | Detail |
| --- | --- |
| Frontend | React or Next.js against the platform SDK |
| Backend | Only the thin server logic that policies cannot express |
| Database | Platform-managed PostgreSQL. Supabase Free: 500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly active users (verified 2026-09-26) |
| Storage | Platform-managed object storage |
| Deploy | Static or edge frontend; the platform is the backend |
| Strength | The fastest route to a working login. Authentication, email flows and storage are handled, and policies give genuine defence in depth at the data layer |
| Weakness | The interesting logic — taxonomy integrity, moderation, upload lifecycle, rate limiting — lands either in SQL policies (hard to unit-test, hard to review in a diff) or back in server code anyway, producing a hybrid with two sources of truth. Also strong platform coupling, and free projects pause after a week of inactivity |

### 3.4 Options considered and rejected without full evaluation

| Option | Rejected because |
| --- | --- |
| Repair the inherited PHP application | The defects are *missing layers*, not wrong lines ([AUDIT §5.3](./PROJECT-AUDIT.md)); and the code is unlicensed, so it cannot legally be the base |
| Microservices, Kubernetes, or a message broker | Solves problems this project does not have, at a maintenance cost one developer cannot pay |
| Static site with client-side-only storage | There is no way to enforce authorisation, which is the whole of AUD-001, AUD-002 and AUD-007 |
| Two databases (e.g. PostgreSQL plus a document store) | All required data is relational; a second store adds a consistency problem with no compensating benefit |
| A dedicated search engine (Algolia, Typesense, Elasticsearch) on day one | PostgreSQL full-text search covers the MVP corpus. A dedicated engine is a cost and an operational surface with no demonstrated need yet |

---

## 4. Comparison against the criteria that actually matter

The matrix below is **descriptive, not scored**. No numeric total is computed,
because adding up unrelated trade-offs produces a number that looks objective and is
not.

| Criterion | Option A — integrated TS | Option B — decoupled API | Option C — BaaS-led |
| --- | --- | --- | --- |
| **Development speed** | Fastest: one repository, one language, framework conventions for routing, rendering and mutations | Slowest: two services, an API contract, CORS, and a token or shared-cookie strategy | Fast at first — auth and storage appear for free — then slows sharply once logic exceeds what row-level policies express comfortably |
| **Learning curve** | Moderate; React plus the server/client boundary is the main new idea | Steepest: two ecosystems, plus identity across an origin boundary | Gentlest start, then a second curve for SQL policies and platform idioms |
| **Frontend flexibility** | High; public pages are server-rendered and readable while signed out | Highest — the frontend can be replaced or joined by another client at will | High, but the data layer is the platform SDK and its shape leaks upward |
| **Backend capabilities** | Sufficient: streaming downloads, file hashing, image handling, scheduled jobs | Strongest: the richest ecosystem for future data and AI work | Weakest: anything policies cannot express returns to server code anyway |
| **Authentication / authorisation** | Full control and fully testable; one policy module, checked in one place | Same control, but identity crosses an origin boundary — the classic source of session bugs | Most of auth is provided and correct; fine-grained rules live in the database, where they are harder to review and test |
| **Database integrity** | Constraints, foreign keys, transactions and versioned migrations — exactly what AUD-010 needs | Same | Same engine, but schema ownership is split between migrations and policies |
| **Secure file storage** | Private bucket plus server-mediated, authorised download; straightforward to verify | Same, with one extra hop through the API | Storage provided with policy-based access. **Risk:** a policy can be mistaken for authorisation |
| **Search** | PostgreSQL full-text search with trigram fallback suffices at MVP scale | Same, server-side | Reachable, but ranking and query shape are less directly controllable through the SDK |
| **Scalability** | Scales to early thousands of users with no operational work; ceilings are plan-based, not architectural | Scales per service, with more moving parts to size and pay for | Scales on the platform's terms, with tier cliffs that force re-planning |
| **Testing** | One runner, one layer; integration tests hit one process | Two suites plus contract tests between them | Hardest: policy behaviour is only meaningfully testable against the live platform |
| **Deployment** | One pipeline, one artefact, preview per pull request | Two pipelines that must release in a compatible order | Frontend pipeline plus platform configuration |
| **Maintenance burden** | One dependency tree, one upgrade path | Two dependency trees, two upgrade paths, and version skew between them | Smallest routine surface, but platform changes are imposed rather than chosen |
| **Free-tier limits** | Hosting, PostgreSQL, and object storage all have usable free tiers at this scale | Doubles the compute footprint, so free allowances run out sooner | One free platform for everything — convenient, and it pauses after a week of inactivity |
| **Vendor lock-in** | Moderate; the coupling is framework idioms, while the database and storage stay portable | Lowest — every part is replaceable | Highest — authentication, storage and data access are all platform-shaped |
| **Portability** | Good: a Node server that also runs in a container | Best | Poor: leaving means re-implementing auth, storage and access rules |
| **Long-term extensibility** | Good; a native mobile client later needs a dedicated API layer added, which is ordinary work | Best — the API already exists | Constrained by the platform's roadmap |

---

## 5. Advantages and disadvantages, in plain terms

**Option A** wins on the one resource this project is shortest of: *the developer's
attention*. One language means one set of idioms, one test runner, one deploy, and no
class of bug that exists only because two systems disagree about the shape of data.
Its real cost is coupling: if the product later needs a standalone API — for a native
app, or for an institution to integrate — that layer has to be built deliberately,
and the Server Action layer would be rewritten or bypassed. That cost is real but
**deferred**, and it is only payable if the product succeeds enough to need it.

**Option B** wins on architectural purity and on the future that might happen. It
loses on the present: two languages, two deployments, and cross-origin identity, in a
project whose single worst inherited defect (AUD-002) was an authorisation mistake.
Adding an origin boundary before authorisation is solid optimises the wrong risk.

**Option C** is genuinely attractive for the first two weeks — authentication, email
and file storage appear without being written — and that is precisely the danger. The
interesting parts of EDU-SHARE are taxonomy integrity, upload lifecycle, moderation
and download authorisation. Those do not shrink because a platform supplies a login;
they move somewhere they are harder to unit-test and harder to review in a diff. It
also carries the highest lock-in, in a project whose whole premise is that the data
should outlive its first implementation.

### 5.1 What all three options share

Worth stating plainly, because it bounds the decision: **all three use PostgreSQL and
a private S3-compatible bucket.** The database engine and the storage model are not
the interesting part of this choice, which makes the decision genuinely reversible —
the schema, the migrations, and the stored bytes all survive a change of framework.

---

## 6. Recommendation

> **Option A — an integrated full-stack TypeScript application on PostgreSQL with
> private S3-compatible object storage.**
>
> *Status: proposed. This recommendation has no effect until the owner approves it in
> `M2`.*

### 6.1 Why this one

1. **It matches the actual constraint.** The binding constraint is one developer's
   time across a degree programme, not scale. Option A removes an entire service, an
   entire language, an entire deploy pipeline, and the entire class of bugs that come
   from a client/server boundary.
2. **It closes the audit findings structurally rather than by discipline.** One
   request pipeline (AUD-004/016), one policy module (AUD-002), one schema owner
   (AUD-009/010), one storage layer (AUD-007/008). Every one of those is a *layer*,
   which is what the audit concluded was missing.
3. **The database and storage choices are the reversible part.** PostgreSQL is
   PostgreSQL and S3 is S3, whichever option is chosen. Choosing Option A does not
   foreclose Options B or C; choosing Option C would foreclose the others.
4. **It gives public pages for free.** Server rendering means a shared link to a
   resource renders for a logged-out reader, which is the whole of persona PR-01.
   A client-rendered SPA would have to add that back.
5. **It has the best free-tier story at this scale.** A hosting free tier, a
   PostgreSQL free tier, and 10 GB of free object storage with free egress are enough
   to run a real pilot, which is what the budget requires.
6. **It is the stack with the most available help.** For a solo developer working
   with AI assistance, a mainstream TypeScript stack means the assistant's knowledge
   of the ecosystem is at its most reliable — a real and legitimate engineering
   consideration, not a popularity contest.

### 6.2 Conditions attached to the recommendation

Approval of Option A is conditional on these constraints, which exist to keep the
reversibility described above honest:

| # | Condition | Protects against |
| --- | --- | --- |
| A-C1 | Framework-specific idioms are confined to the presentation and routing layer. Data access, validation, authorisation and storage go through ordinary modules that could be called from any Node server | Framework lock-in |
| A-C2 | No proprietary storage API is used directly; the storage layer is accessed through a single internal interface, and the implementation behind it is swappable | Storage lock-in |
| A-C3 | No runtime that blocks Node APIs is used for anything that touches files, hashing, or the database | Losing streaming downloads and file validation to an edge runtime |
| A-C4 | Every managed service is reachable by a standard protocol (SQL, S3) with a plain credentials configuration | Dependency on a vendor SDK |
| A-C5 | Authorisation lives in one module with tests, and is never expressed in the interface, in database policies, or in middleware alone | Re-creating AUD-002 |

### 6.3 What would justify revisiting this decision

Recorded now so that a later change is a decision rather than a drift:

- A **native mobile application** becomes a requirement → the API layer becomes
  necessary, and Option B's shape is adopted incrementally for mobile clients only.
- **Two or more co-developers** join → the single-deployable advantage weakens, and a
  separate service boundary can become useful for independent release cycles.
- **A managed platform demonstrably eliminates work** — for example, a
  moderation or notification service that would otherwise take a month to build —
  and its lock-in is accepted in writing.
- **Cost or a hard free-tier ceiling** is reached and a self-hosted container becomes
  cheaper overall.

---

## 7. The recommended architecture — part 1: the platform

Items 7.1–7.4 below specify the framework, language, backend structure and database.
Part 2 (§8) covers identity, storage, search and the cross-cutting concerns.

### 7.1 Frontend framework and rendering strategy

| Decision | Choice |
| --- | --- |
| Framework | **Next.js, App Router** |
| Rendering | React Server Components by default. Public pages — landing, browse, resource detail, search results — are **server-rendered**, so a shared link works for a signed-out visitor. Interactive islands are client components |
| Mutations | Server Actions for form submissions; Route Handlers for upload, download, and anything needing streaming or a non-form content type |
| Streaming | Used for listings and search so the shell paints before the data arrives |

**Why server rendering is not optional.** Persona PR-01 will not register to find out
whether the site is useful, and a shared resource link must open for a signed-out
reader. A purely client-rendered application would have to rebuild this later.

### 7.2 Language and type safety

- **TypeScript with `strict: true`**, plus `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`.
- **No `any`** in application code; `unknown` plus a narrowing parser at boundaries.
- The database schema is expressed in TypeScript, so a column change becomes a
  compile-time error at every use site.
- **Runtime validation at every external boundary** — request bodies, query
  parameters, form data, environment variables. Types describe the programme to the
  compiler; they guarantee nothing about what a client sends.
- Domain types are hand-written in front of the persistence layer, so a schema change
  is a deliberate change rather than a silent one.

### 7.3 Backend and API structure

One application, organised in layers with a fixed direction of dependency:

```
  app/                     routing, server components, route handlers
      └── actions/         validated mutations (Server Actions)
  domain/                  rules: authorisation, quotas, lifecycle, moderation
      ├── auth/            sessions, credentials, elevation
      ├── policy/          the single can() module
      ├── taxonomy/        institutions … subjects
      ├── resources/       upload lifecycle, metadata, visibility
      └── moderation/      reports, actions, audit
  data/                    typed queries and transactions (the only SQL)
  services/                storage, email, rate limiting, logging — behind interfaces
  lib/                     pure helpers: validation schemas, formatting, hashing
```

**The rule that matters:** a route handler or server component may call `domain/` and
`data/`, but never the storage or email services directly, and **never** the database
without going through `data/`. Authorisation is called in `domain/`, never in a
component.

### 7.4 Database choice and relational model

| Decision | Choice |
| --- | --- |
| Engine | **PostgreSQL 16 or newer** |
| Production | A managed provider on a free tier to begin (`D-002`) |
| Development and tests | A containerised PostgreSQL locally and in CI — identical engine, disposable data |
| Access | A typed query layer with explicit SQL-shaped queries, versioned migrations, and a committed migration history |
| Transactions | Required for any operation containing more than one write — the direct answer to AUD-014 |

**Why PostgreSQL rather than MySQL, when the inherited app used MySQL.** PostgreSQL
provides ranked full-text search with trigram support in the core (so the MVP needs no
external search engine), stricter constraint behaviour, numeric handling that does not
silently truncate, and `JSONB` for audit metadata. The schema is being redesigned
regardless, so there is no compatibility advantage in keeping MySQL, and the query
surface is small enough now that this choice is cheap now and expensive later.

The conceptual schema is specified in §8.

---

## 8. The recommended architecture — part 2: identity, storage, search and cross-cutting concerns

### 8.1 Authentication

| Decision | Choice |
| --- | --- |
| Method | **Email and password**; passkeys considered post-MVP |
| Password storage | Argon2id where the runtime supports it, otherwise `bcrypt` at a cost of at least 12. The chosen algorithm and parameters are recorded in the repository |
| Sessions | Server-side session records in the database, addressed by an opaque `HttpOnly`, `Secure`, `SameSite=Lax` cookie. **Not** a self-contained stateless token, so sign-out and revocation are immediate |
| Rotation and expiry | Session identifier rotated on sign-in and on privilege change; an idle timeout and an absolute lifetime, both configured and both tested |
| Verification | Email verification required before publishing |
| Reset | Single-use, hashed-at-rest token with a short expiry |
| Elevation | Role changes are administrator actions, never user input (§8.2) |
| Abuse control | Rate limiting and backoff per address and per account, with deliberately indistinguishable responses for an unknown address and a wrong password |

**Why a database-backed session rather than a stateless token.** Sign-out must take
effect immediately; a stolen credential must be revocable; a moderation decision must
be able to end a session. Stateless tokens turn revocation into someone else's
problem — and the inherited app's own lesson (AUD-002) is that identity mistakes are
expensive to undo.

### 8.2 Authorisation model

One module owns every access decision: **`can(actor, action, subject) -> boolean`**.

| Property | Requirement |
| --- | --- |
| **Deny by default** | An unknown action, or an absent actor, denies |
| **Called at the point of change** | In the domain layer — never in the component that renders the control |
| **Roles are data** | Read from the session and the database, never from request input (AUD-002) |
| **Ownership is explicit** | `resource.ownerId === actor.id` is a checked condition, not an assumption |
| **Existence is not disclosed** | An unauthorised request for a private resource returns *not found* |
| **Enumerated in tests** | The full role × route matrix is a test fixture, so a missing check fails the build |

### 8.3 Object storage

| Decision | Choice |
| --- | --- |
| Interface | An internal `ObjectStore` module exposing `put`, `signUpload`, `signDownload`, `head`, `delete` |
| Implementations | An S3-compatible production implementation, an in-memory implementation for tests, and a local filesystem implementation for offline development |
| Production target | A private S3-compatible bucket on a free tier to begin. Cloudflare R2's free tier includes 10 GB-month of storage and free egress (verified 2026-09-26) |
| Visibility | **Private.** No public bucket, no public object URL, at any time |
| Keys | Server-generated: a random identifier plus a validated extension. A user-supplied filename is metadata only and never becomes a path |
| Region | Chosen for proximity to the primary user base, so latency for PR-01 is tolerable |

---

### 8.4 Secure upload and download flow

**Upload — two phases, so no document bytes pass through the application server:**

1. **Initiate.** The client posts the intended metadata. The server authorises the
   actor, validates every field, checks the per-user quota, generates the storage key,
   writes a `pending` record, and returns a credential scoped to that single key with a
   short lifetime.
2. **Transfer.** The client uploads directly to the private bucket.
3. **Complete.** The client reports completion. The server then reads the object's
   **actual** size and content type back from storage, verifies them against the
   declared values and the allow-list, computes and stores a content hash, and promotes
   the record to `active`.

> **The server's own inspection at step 3 is the authoritative validation — never the
> client's report.** A client that lies about what it uploaded changes nothing.

Validation order: authentication → authorisation → quota → declared extension against
the allow-list → declared size against the limit → actual object size → sniffed content
type → content hash. **A failure at any step deletes the object**, so a rejected upload
never leaves residue.

**Download — authorise first, then issue a credential:**

1. The server authorises the request against the resource's visibility and the actor's
   relationship to it.
2. It writes an access-log entry.
3. It either streams the bytes or returns a redirect to a **single-key, short-lived**
   signed URL with `Content-Disposition: attachment`.

> **A signed URL is not authorisation.** It is a delivery mechanism. The decision is
> made *before* it is issued, the credential is scoped to one key, and it expires in
> seconds — so a leaked URL is not a standing grant.

**Abandoned uploads** are removed by a scheduled job that reconciles stored objects
against `pending` records older than a fixed window. This is the direct answer to the
inherited app's "write the file, then hope the insert succeeds" ordering (AUD-014).

### 8.5 Search and filtering

| Layer | MVP approach |
| --- | --- |
| Free text | PostgreSQL full-text search over title, description, subject and institution names, with a stored vector and a ranked query |
| Typo tolerance | Trigram similarity as a fallback when the full-text query returns nothing |
| Structured filters | Institution, programme, semester, subject, category, format, year |
| Ranking | Text relevance, then recency, then download count as a tiebreak |
| Pagination | Keyset pagination on the sort key — stable under concurrent inserts, unlike `OFFSET` |
| Deferred | A dedicated search engine is **not** used in the MVP |

**Why defer a dedicated engine.** The MVP corpus is small, PostgreSQL full-text search
is genuinely capable, and an external index adds a network dependency, a recurring
cost, and a second source of truth about which documents exist. The query interface is
written so the implementation behind it can change without touching the screens.

---

### 8.6 Validation and error handling

| Decision | Rule |
| --- | --- |
| Where validation happens | At every external boundary: request bodies, query parameters, form data, environment variables, and the results of any external call |
| How | A declarative schema per boundary, parsed to a typed value. Invalid input is a **handled** outcome, never an exception reaching a user |
| Error shape | One shape for every failure: a machine-readable code, a human-readable message, and the field it belongs to where applicable |
| What the user sees | What failed, what it affects, and what to do next — never a driver message, a stack trace, or a bare code |
| What the log receives | The full detail, with a correlation identifier that appears in the user-facing message so a report can be traced |
| Framework errors | One error boundary at the top, so an unexpected failure degrades a region rather than blanking the page |

### 8.7 Logging and observability

| Concern | Approach |
| --- | --- |
| Application logs | Structured records with a level, a request identifier, and no personal data or credentials |
| Security events | Written to `audit_events` in the database, not to the application log, because they are read by a human and retained deliberately |
| Request tracing | A correlation identifier generated per request, propagated to the error message and to every log line for that request |
| Health | A single endpoint reporting application liveness and database reachability |
| Metrics | Usage counters the operator actually acts on — storage bytes, resource count, report count — surfaced in the owner's view rather than exported to an observability stack |
| Deliberately absent | No distributed tracing, no metrics pipeline, no log aggregation service. There is one process and one developer |

### 8.8 Testing strategy

| Layer | Purpose | Gate |
| --- | --- | --- |
| Unit | Validation schemas, policy decisions, slug and ranking helpers, hashing | `G4` |
| Integration | Real database: uniqueness scopes, `RESTRICT` deletion, pagination stability, transaction rollback | `G5`, `G9` |
| Authorisation | Every role × every real route, allow **and** deny | `G7` |
| Storage security | Upload validation, download authorisation, credential expiry, traversal filenames, orphan cleanup | `G8` |
| End-to-end | Five primary journeys in a real browser on a mobile viewport | `G10` |
| Accessibility | Automated scan of the design route and the primary journeys | `G11` |
| Smoke | Sign in, browse, search, upload, download, report — against the deployed environment | `G13` |

The full gate list, and the milestone at which each begins to block work, is in
[IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) §16.

### 8.9 CI/CD

A single pipeline per pull request: install from the lockfile → type check → lint →
migrate a disposable database forward **and backward** → unit, integration,
authorisation and storage-security tests → production build → accessibility scan →
dependency audit → preview deploy. End-to-end tests run nightly and before every release.
Production deploys from a tagged commit in the main branch, never from a developer's
machine.

### 8.10 Deployment

| Aspect | Approach |
| --- | --- |
| Artefact | The application as a Node server, deployable either to a hosting platform or as a container |
| Configuration | Completely environment-driven, so the same artefact runs in every environment |
| Migrations | Applied as a discrete release step, never implicitly on application start-up |
| Preview | One preview environment per pull request, so a change is reviewed running, not just in a diff |
| Rollback | Redeploy the previous release; a migration is reversed only when it must be |

### 8.11 Environments, configuration and secrets

| Environment | Database | Storage | Purpose |
| --- | --- | --- | --- |
| Local | Containerised PostgreSQL | Local implementation of the storage interface | Development, offline-capable |
| Test | Disposable containerised PostgreSQL | In-memory storage implementation | CI, deterministic and credential-free |
| Preview | A separate managed database and bucket, or the test configuration | Object storage with a distinct prefix | Reviewing a change end to end |
| Production | Managed PostgreSQL | Private object storage | Real users |

**Rules.** No credential is ever committed — only a `.env.example` containing placeholder
**names**. Configuration is validated at start-up and **fails closed** when a required value
is missing. Production secrets live only in the platform's environment configuration. Test
environments use throwaway credentials, so the test suite never needs production access.

### 8.12 Backup and recovery

| Concern | Approach |
| --- | --- |
| Database | The provider's automated backups, with the retention period recorded rather than assumed |
| Verification | **A restore is performed and verified before release.** An unrestored backup is a claim, not a capability |
| Object storage | Documented honestly: the recovery approach and its limits are stated, including what is *not* covered |
| Reconciliation | A scheduled job compares staged objects against records, so a partial failure is discovered rather than accumulating |
| Deletion | Soft delete with a retention window, then purge — so an accidental deletion is recoverable within the window |

---


> This is a **conceptual** design, expressed as entities, keys and rules. It is not a
> migration, it is not executable, and no database has been created. Column lists are
> indicative and are expected to be refined during `M3` and `M6`.

## 9. Conceptual database design

### 9.1 Design rules

| # | Rule | Fixes |
| --- | --- | --- |
| R1 | Every uniqueness constraint is scoped to its parent — never global across entities that belong to different institutions | AUD-010 |
| R2 | Every fact lives in exactly one place; derived values are computed, not stored | AUD-009, DB-1, DB-2 |
| R3 | A resource's taxonomy path is expressed **once**: through its subject. Institution and programme are reached through the subject, not duplicated onto the resource | AUD-009 |
| R4 | Deletion behaviour is declared on every foreign key; nothing cascades implicitly | §8.5 of the audit |
| R5 | Content is soft-deleted; taxonomy is `RESTRICT`-protected | audit §6.5 |
| R6 | Every state-changing table carries `created_at` and, where mutable, `updated_at` | — |
| R7 | Every table that records an action carries the actor | — |
| R8 | Identifiers are opaque and non-sequential in any public URL | AUD-007 |

### 9.2 Required in the MVP

| Entity | Purpose | Key columns | Key constraints |
| --- | --- | --- | --- |
| `users` | Accounts | `id`, `email`, `password_hash`, `display_name`, `role`, `status`, `email_verified_at`, `institution_id`, `program_id`, `semester_number` | `email` unique (case-insensitive); `role` in (`user`,`moderator`,`admin`); `status` in (`active`,`restricted`,`deactivated`) |
| `sessions` | Server-side sessions | `id` (opaque), `user_id`, `expires_at`, `idle_expires_at`, `created_at`, `ip_hash`, `user_agent_family` | `user_id` → `users` on delete CASCADE (a deleted account's sessions die) |
| `institutions` | Institutions | `id`, `name`, `short_name`, `slug`, `country_code` | `slug` unique |
| `departments` | Academic units | `id`, `institution_id`, `name`, `slug` | unique (`institution_id`, `slug`) |
| `programs` | Programmes | `id`, `institution_id`, `department_id`, `name`, `slug` | unique (`institution_id`, `slug`) — **the AUD-010 fix** |
| `semesters` | Study periods | `number`, `label` | `number` 1–12, primary key |
| `subjects` | Subjects | `id`, `program_id`, `semester_number`, `name`, `slug`, `is_active` | unique (`program_id`, `semester_number`, `slug`) |
| `categories` | Academic types | `id`, `slug`, `name`, `sort_order` | `slug` unique; seven seeded rows |
| `resources` | Contributed items | `id`, `owner_id`, `title`, `description`, `subject_id`, `semester_number`, `category_id`, `visibility`, `status`, `storage_key`, `original_filename`, `byte_size`, `declared_mime`, `detected_mime`, `content_hash`, `download_count`, `published_at`, `created_at` | `owner_id` → `users` RESTRICT; `subject_id` → `subjects` RESTRICT; `category_id` → `categories` RESTRICT; `visibility` in (`public`,`institution`,`private`); `status` in (`pending`,`active`,`hidden`,`deleted`); unique (`content_hash`, `subject_id`) as a soft duplicate warning, not a hard block |
| `resource_access_events` | Download audit | `id`, `resource_id`, `actor_id`, `occurred_at`, `outcome` | Append-only; `actor_id` nullable for guests |
| `saved_resources` | The library | `user_id`, `resource_id`, `created_at` | Primary key (`user_id`, `resource_id`) — makes FR-LIB-02 true by construction |
| `reports` | Reports | `id`, `resource_id`, `reporter_id`, `reason_code`, `detail`, `status`, `created_at`, `resolved_at`, `resolved_by` | unique (`resource_id`, `reporter_id`) so one account cannot inflate the queue |
| `moderation_actions` | Moderation record | `id`, `resource_id`, `actor_id`, `action`, `reason_code`, `note`, `created_at`, `reversed_by`, `reversed_at` | `action` in (`hide`,`restore`,`delete`,`restrict_user`,`reinstate_user`); append-only |
| `audit_events` | Security-relevant log | `id`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata` (JSONB), `occurred_at` | Append-only; no update or delete path in application code |
| `institution_requests` | Missing-institution requests | `id`, `requester_id`, `proposed_name`, `detail`, `status`, `created_at` | `status` in (`open`,`accepted`,`rejected`) |

**Why `resources` no longer stores institution, department or programme.** Those are
reachable through `subject → program → institution`. Storing them again is exactly how
the inherited app produced two versions of the same truth; rule **R3** exists to make
that specific mistake unavailable.

### 9.3 Deferred entities

| Entity | Why deferred | What it costs to add later |
| --- | --- | --- |
| `resource_files` (multiple files per resource) | MVP stores one file; the interface does not need more yet | Low: the storage key moves from `resources` into a child table, and the resource keeps its identity |
| `resource_versions` | Needs real usage data to design honestly | Moderate |
| `tags` + `resource_tags` | Category plus subject already cover discovery | Low |
| `institution_follows` | Post-MVP (see `PRODUCT-REQUIREMENTS.md` §6.3) | Low |
| `notifications` (in-app) | Transactional email is enough for v1 | Low |
| `subject_interests` | Onboarding records a programme and semester; interests need a feed to be useful | Low |

### 9.4 Indexing

Indexes exist to make a specific query fast, so they are listed against the query they
serve. Every index must justify itself; an index nobody uses costs writes and storage.

| Index | Serves |
| --- | --- |
| `resources (status, published_at desc)` | The default listing and "recently added" |
| `resources (subject_id, status, published_at desc)` | Subject pages — the most common browse path |
| `resources (category_id, status)` | Category filters |
| `resources (owner_id, created_at desc)` | Upload history (`FR-CON-01`) |
| Full-text vector over title and description, with a GIN index | Search (`FR-DIS-02`) |
| Trigram index on subject and institution names | Typo-tolerant search (`FR-DIS-03`) |
| `saved_resources (user_id, created_at desc)` | The library (`FR-LIB-03`) |
| `reports (status, created_at)` | The moderator queue (`FR-MOD-09`) |
| `sessions (user_id)`, `sessions (expires_at)` | Session lookup and expiry sweeping |
| `audit_events (entity_type, entity_id, occurred_at desc)` | Entity history in the audit viewer |

**Deliberately absent:** no index on `download_count` until a sort by popularity is
proven to be slow, and no index on `visibility` alone, since it is always combined with
`status` in practice.

### 9.5 Deletion, retention and cascading

| Situation | Behaviour | Why |
| --- | --- | --- |
| Delete a resource | Soft delete: `status = 'deleted'`, retained for a fixed window, then the object and row are purged | Reversible mistakes are cheap; irreversible ones are not |
| Delete a taxonomy record | `RESTRICT` whenever anything references it | Prevents the silent loss of resources — the opposite of the inherited app's unflagged deletion |
| Delete an account | `deactivated`, sessions ended, public listing withdrawn; authored resources follow `D-008` | Attributing content to a deleted account is a policy decision, not a technical default |
| Delete a session | Hard delete | Sessions have no historical value |
| Delete an audit event | **Never.** No delete path exists in application code | An audit trail that can be edited is not an audit trail |
| Delete a stored object | Only through the storage interface, and only as a consequence of a soft-delete purge or a rejected upload | Keeps the database and the bucket reconcilable |

### 9.6 Authorisation boundaries per entity

The database enforces *integrity*. It does **not** enforce *access*: access is decided
in the policy module, and this table states which module owns which decision so that no
surface is left without an owner.

| Entity | Who may read | Who may write | Where the check lives |
| --- | --- | --- | --- |
| `institutions`, `departments`, `programs`, `semesters`, `subjects` | Anyone | Administrators only | Taxonomy domain module |
| `categories` | Anyone | Administrators only | Taxonomy domain module |
| `resources` | Per `visibility` | Owner, or an administrator; moderators may change `status` only | Resource domain module + policy |
| `saved_resources` | The owner only | The owner only | Library domain module |
| `reports` | The reporter (their own), and moderators/administrators | Reporter creates; moderators resolve | Moderation domain module |
| `moderation_actions`, `audit_events` | Administrators; a user may read their own events | Append-only, system-written | Moderation domain module |
| `users` | Public fields publicly; private fields to the owner and administrators | The owner for their own profile fields; role changes by administrators only | Account domain module |
| `sessions` | The owner may list their own | The owner and the system | Session module |

**The rule that ties this together:** a route that reads or writes one of these entities
must call the policy module for that entity. A route that does not is a defect, and the
authorisation matrix (gate `G7`) is what detects it.

---

## 10. Architecture decision record

### 10.1 ADR-001 — Application stack

| Field | Content |
| --- | --- |
| **Decision** | Adopt **Option A**: an integrated full-stack TypeScript application (Next.js, App Router) on PostgreSQL, with private S3-compatible object storage |
| **Status** | **Proposed** — requires owner approval in `M2` |
| **Date** | 2026-09-26 |
| **Deciders** | Chirayu Babu Jaysawal (owner), with this proposal as input |
| **Alternatives** | Option B (decoupled frontend and API), Option C (backend-as-a-service led), plus the five options rejected in §3.4 |

**Reasons.** One developer is the binding constraint, and Option A spends the fewest of
that developer's hours per feature. It closes the audit's findings as *layers* rather
than patches. It gives server-rendered public pages, which the primary persona requires
and a client-only application would have to add back. And its database and storage
choices are the portable ones, so the decision is reversible.

**Key trade-offs accepted.**

| Trade-off | Accepted because |
| --- | --- |
| Framework coupling in the mutation layer | Contained by condition `A-C1`; the cost is deferred, and payable only if the product succeeds |
| No standalone API for a future native client | A native client is not a v1 requirement, and adding an API layer later is ordinary work |
| One runtime for both rendering and server work | Simplifies deployment; condition `A-C3` prevents the loss of Node capabilities |
| More framework knowledge required than a plain HTTP server | Offset by abundant documentation and assistance |

**Known risks.**

| Risk | Mitigation |
| --- | --- |
| Free-tier limits reached (database storage, egress, invocations) | Quotas and monitoring from `M7`; storage and database are portable, so a provider change is configuration |
| Hosting plan terms restrict the use case | Verified during `M2` (`D-005`); the application must also run on a container host |
| Malware scanning unavailable on free tiers | Compensating controls in `M7`, recorded as `D-007` |
| Framework-specific features creeping into domain code | Condition `A-C1`, re-checked at `M10` |
| Text search outgrowing PostgreSQL | The query interface is replaceable; measured at `M10` |

**Decisions requiring approval.** `D-001` (stack), `D-002` (database provider),
`D-005` (hosting), plus `D-004`, `D-007`, `D-008`, `D-009`.

### 10.2 ADR-002 — PostgreSQL rather than MySQL

| Field | Content |
| --- | --- |
| **Decision** | PostgreSQL 16+ |
| **Status** | Proposed |
| **Rationale** | Ranked full-text search and trigram matching in the core engine, so the MVP needs no external search service; stricter constraint behaviour; `JSONB` for audit metadata; `numeric` without silent truncation |
| **Note** | The inherited app used MySQL, but its schema is being redesigned regardless — there is no migration sunk cost and no compatibility argument |

### 10.3 ADR-003 — Server-side sessions rather than stateless tokens

| Field | Content |
| --- | --- |
| **Decision** | Database-backed sessions addressed by an opaque `HttpOnly` cookie |
| **Status** | Proposed |
| **Rationale** | Immediate sign-out and revocation, including revocation by a moderation decision. Stateless tokens make revocation a problem to solve later |
| **Trade-off** | One database read per request. At this scale that is not a meaningful cost, and the session row can be cached in-process if it ever becomes one |

### 10.4 ADR-004 — No dedicated search engine in the MVP

| Field | Content |
| --- | --- |
| **Decision** | PostgreSQL full-text search with a trigram fallback; no Algolia, Typesense or Elasticsearch |
| **Status** | Proposed |
| **Rationale** | Adequate for the MVP corpus; no added cost; no second source of truth about which documents exist; no network dependency on the search path |
| **Revisit when** | Ranking quality is demonstrably why students cannot find resources, and the corpus justifies an external index |

### 10.5 ADR-005 — No AI feature in the MVP

| Field | Content |
| --- | --- |
| **Decision** | AI-assisted features are designed for but not built in v1 (see `PRODUCT-REQUIREMENTS.md` §6.5) |
| **Status** | Proposed |
| **Rationale** | No problem in the core loop needs a model more than it needs a good taxonomy, and the risk profile — cost, latency, false moderation — is poor for a first release |
| **Constraint if added later** | Model calls sit behind a server-side module with its own rate limit and cost ceiling; every suggestion requires human confirmation; no model output is written to the database unconfirmed |

---

## 11. Sources checked

Provider and platform facts used in this proposal were verified from official
documentation on **2026-09-26**. Prices, quotas and plan terms change; anything below
must be re-checked before it is relied on in a budget or a design decision.

> **A short route through these facts — and the decision each one supports — is in
> [DECISION-BRIEF.md](./DECISION-BRIEF.md).** Every figure there was re-checked on the same
> date, and the four facts added after this proposal was written are recorded in §11.1.

| Fact used | Value as documented | Source | Checked |
| --- | --- | --- | --- |
| Object storage free tier | 10 GB-month storage, 1 M Class A and 10 M Class B operations per month, egress free | `developers.cloudflare.com/r2/pricing/` | 2026-09-26 |
| Object storage paid rates | $0.015/GB-month; Class A $4.50 per million; Class B $0.36 per million | same | 2026-09-26 |
| Managed PostgreSQL free tier (Neon) | 100 projects, 100 compute-hours per project per month, 0.5 GB storage per project, scales to zero after 5 minutes idle | `neon.com/pricing` | 2026-09-26 |
| Neon paid entry rate | Compute from $0.106/CU-hour; storage $0.35/GB-month | same | 2026-09-26 |
| Managed PostgreSQL free tier (Supabase) | 500 MB database, 1 GB file storage, 5 GB egress, 50,000 monthly active users; free projects pause after 1 week of inactivity; limit of 2 active projects | `supabase.com/pricing` | 2026-09-26 |
| Supabase paid entry | From $25/month | same | 2026-09-26 |
| Hosting free tier (Vercel Hobby) | 100 GB fast data transfer, 1 M function invocations, 4 CPU-hours active CPU, 360 GB-hours provisioned memory, 45-minute build limit | `vercel.com/docs/plans/hobby` | 2026-09-26 |
| **Hosting plan restriction** | **"The Hobby plan restricts users to non-commercial, personal use only"** | `vercel.com/docs/plans/hobby`; `vercel.com/docs/limits/fair-use-guidelines` | 2026-09-26 |
| Hosting paid entry (Vercel Pro) | $20/month including $20 of usage credit; spend management with a hard limit | `vercel.com/pricing` | 2026-09-26 |
| Hosting free tier (Cloudflare Workers) | Free: 100,000 requests/day, **10 ms CPU per invocation**, 128 MB memory, 50 subrequests, 64 MiB worker size, 5 cron triggers, 100 Workers. Paid: $5/month minimum including 10 M requests and 30 M CPU-ms. **The free plan's CPU ceiling is below the 10–20 ms that the same documentation states for server-side rendering and authentication, so it is not a viable target for this architecture** | `developers.cloudflare.com/workers/platform/pricing/`; `developers.cloudflare.com/workers/platform/limits/` | 2026-09-26 |
| Container hosting (Fly.io) | **No free tier**; every organisation requires a credit card on file; egress to India $0.12/GB | `fly.io/docs/about/pricing/` | 2026-09-26 |
| CI allowance (GitHub Actions, private repository) | GitHub Free: 2,000 minutes and 500 MB storage per month; beyond that Linux 2-core is $0.006/minute. A budget can stop usage instead of billing it | `docs.github.com` billing reference, "Product usage included with each plan" | 2026-09-26 |
| Candidate authentication library (Better Auth) | **MIT licence** — "The MIT License (MIT), Copyright (c) 2024 - present, Bereket Engida" | `github.com/better-auth/better-auth` (LICENSE.md) | 2026-09-26 |
| Container hosting (Railway) | Free tier: 30-day trial with $5 credit, then $1/month; Hobby $5/month minimum usage with $5 of credits; object storage $0.015/GB-month with free egress | `railway.com/pricing` | 2026-09-26 |
| Container hosting (Render) | Hobby workspace $0/month plus compute; free instances exist with documented limitations; cheapest paid instance $7/month | `render.com/pricing` | 2026-09-26 |
| Transactional email free tier | 3,000 emails/month, 100/day, 3 domains, 30-day retention; Pro from $20/month | `resend.com/pricing` | 2026-09-26 |
| Framework version | Next.js 16.3.x current, 15.5.x maintained, with monthly security releases | `nextjs.org/blog` | 2026-09-26 |
| Query layer | TypeScript-first, SQL-shaped, supports PostgreSQL, includes migrations, zero runtime dependencies | `orm.drizzle.team/docs/overview` | 2026-09-26 |

### 11.1 Facts NOT verified, and therefore not relied upon

| Item | Status |
| --- | --- |
| The exact free-plan daily request allowance and CPU-time limit for Cloudflare Workers | **RESOLVED 2026-09-26** — verified and added to the table above: 100,000 requests/day and 10 ms CPU per invocation. The CPU ceiling is the deciding fact: it sits below what server rendering needs, so the Workers free plan is not a target for this architecture |
| The licence of any specific authentication or UI library | Partially resolved 2026-09-26: the candidate authentication library (Better Auth) is **MIT**. Any **other** library's licence is still confirmed and recorded at the point of adoption |
| Whether the hosting provider's non-commercial restriction accommodates this exact project | A judgement for the owner (`D-005`). The restriction is quoted above; an interpretation is deliberately **not** asserted here |
| Any price or quota not listed in the table above | Not verified, and not used anywhere in this proposal |
| Vercel Pro and Cloudflare Workers Paid prices, GitHub Actions minutes, Fly.io's absence of a free tier | Verified 2026-09-26 and added to the table above. These facts arrived **after** this proposal was written; they refine the `D-005` costing in [DECISION-BRIEF.md](./DECISION-BRIEF.md) and change no recommendation here |

### 11.2 How to re-verify cheaply

Prices and quotas are the fastest-changing facts in this document. Before relying on
any of them, open the source URL listed above and confirm the figure and the date. If a
figure has changed, it changes a decision — not just a table.

---

## 12. Summary of what this proposal asks the owner to decide

| Decision | Question | Proposal's recommendation | Blocks |
| --- | --- | --- | --- |
| `D-001` | Which architecture? | Option A (integrated TypeScript + PostgreSQL + private object storage) | `M3` |
| `D-002` | Which database provider, and is a paid tier acceptable? | A free-tier managed PostgreSQL to begin, with a container fallback | `M3` |
| `D-005` | Where does it run, given the non-commercial restriction on the free hosting plan? | A free tier if the use is judged non-commercial; otherwise a container host | `M11` |
| `D-004` | Open uploads or moderated? | Post-moderation: publish immediately, with reporting and a takedown path | `M7` |
| `D-007` | How is malware risk handled without paid scanning? | Document-only allow-list plus forced download disposition, recorded as a known limitation | `M7` |

Full decision list and options: [PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) §11.










