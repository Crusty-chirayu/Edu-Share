# DECISION BRIEF — `M2` owner approval

**Purpose:** everything the owner needs in order to answer the twelve decisions in
[PRODUCT-REQUIREMENTS.md](./PRODUCT-REQUIREMENTS.md) §11, with the options, the
trade-offs, the verified costs, and a recommended default for each.

**Status:** prepared during a session in which the architecture was **not** approved, so
**no code, scaffold, dependency or migration was created**. This document replaces neither
the requirements nor the architecture proposal; it is the short path through them.

**Prepared:** 2026-09-26. **Every price and quota below was re-checked against the
provider's own documentation on that date** (§13).

---

## 1. The gate, stated plainly

`M1` is complete. `M2` is an approval gate. The work that follows it (`M3` onwards)
installs a stack, creates a database schema and writes the identity system — the three
areas where the inherited application failed. Approving the wrong one of those is
expensive to undo, which is why the plan stops here and asks.

Three decisions **BLOCK** unless answered:

| ID | Question in one line |
| --- | --- |
| `D-001` | Which architecture? |
| `D-002` | Which database, and is a paid tier ever acceptable? |
| `D-005` | Where does it run, given the free hosting plan is documented as personal-use only? |

Everything else (`D-003`, `D-004`, `D-006`–`D-012`) shapes scope and policy. Each already
has a recorded provisional default, so an unanswered one does not stop work — it is
carried forward and labelled provisional.

## 2. The fastest path through the gate

If you agree with the recommendations, **one message is enough**. Copy this, keep the
`[x]` on the option you want, and add a `Y` or `N` to the two commercial questions:

```
D-001 architecture ................. [x] A integrated TypeScript
D-002 database ..................... [x] A free managed PostgreSQL
      D-002a provider ............... [x] Neon (recommended)  [ ] Supabase  [ ] other: ___
      D-002b paid tier ever acceptable? ......... Y / N ___
D-005 hosting ...................... [ ] A Vercel Hobby (if personal/non-commercial)
                                     [ ] B container host (Railway Free -> $1/month)
      D-005a This is a personal, non-commercial project .......... Y / N ___
      D-005b Willing to pay up to $5/month if the free terms forbid it ... Y / N ___
      D-005c Is the platform ever intended to be monetised ...... Y / N ___

The architecture recommendation (Option A) is    APPROVED
The MVP scope in §6.2 is                         APPROVED
The role model in §5 (no self-selected roles) is APPROVED
May proceed to M3 once D-001, D-002 and D-005 are answered: YES
```

§11 has the full twelve-line block, including the scope and policy decisions.

## 3. What approval means, and what it does not

| Approval gives me | Approval does not give me |
| --- | --- |
| Permission to scaffold the application, configure tooling, and create the first reversible migration | Permission to deploy anywhere, or to create **any** paid resource |
| Permission to install the libraries the approved architecture names | A budget. Spending decisions remain separate (`D-002`, `D-005`) |
| A recorded set of defaults for the non-blocking decisions | Legal advice on the inherited data, the licence grant, or copyright policy |

**Standing safety rules that approval does not change:** no force-push, no rewriting
history, no inherited PHP source, no database dump, no secrets, no PII, no production
deploy without explicit approval, and no paid service enabled without a recorded decision.

---

## 4. Verified facts — re-checked 2026-09-26

These are the numbers the three blocking decisions turn on. All of them were read from
the provider's own documentation. Nothing here is an estimate, a projection or a
measurement of this application.

| Fact | Value as documented | Source |
| --- | --- | --- |
| Vercel Hobby | $0. 100 GB fast data transfer, 1 M edge requests, 1 M function invocations, **4 CPU-hours** active CPU, 360 GB-hours provisioned memory, 10 GB fast origin transfer | `vercel.com/docs/plans/hobby` |
| Vercel Hobby, commercial restriction | **"As stated in the fair use guidelines, the Hobby plan restricts users to non-commercial, personal use only."** Exceeding an allowance means waiting up to 30 days, because a Hobby account **cannot purchase additional usage** | same |
| Vercel Pro | $20/month including $20 of usage credit, flat-rate CDN, spend management with a hard limit | `vercel.com/pricing` |
| Neon Free | $0. 100 projects, **100 CU-hours/month per project**, **0.5 GB storage per project**, sizes up to 2 CU (8 GB RAM), 10 branches/project, **scale-to-zero after 5 minutes idle**, 5 GB object storage included, 1-day log retention, community support | `neon.com/pricing` |
| Neon paid entry | Launch: $0.106 per CU-hour, $0.35 per GB-month; documented typical spend $15/month | same |
| Supabase Free | $0. **500 MB database**, 1 GB file storage, 5 GB egress, 5 GB cached egress, 50,000 MAU, shared CPU / 500 MB RAM, **paused after 1 week of inactivity**, limit of **2 active projects**, 1-day log retention | `supabase.com/pricing` |
| Supabase Pro | from $25/month: 8 GB disk, 250 GB egress, 100 GB file storage, 7-day backups and logs | same |
| Cloudflare R2 free | **10 GB-month** storage, 1 M Class A, 10 M Class B operations, **egress free**; free tier applies to Standard storage only; usage rounds **up** to the next billing unit; unauthorised (401) requests are not charged | `developers.cloudflare.com/r2/pricing/` |
| Cloudflare R2 paid | $0.015/GB-month; Class A $4.50 per million; Class B $0.36 per million | same |
| Cloudflare Workers free | **100,000 requests/day**, **10 ms CPU per invocation**, 128 MB memory, 50 subrequests, 64 MiB worker size, 5 cron triggers, 100 Workers | `developers.cloudflare.com/workers/platform/pricing/` and `/limits/` |
| Cloudflare Workers paid | $5/month minimum: 10 M requests included, 30 M CPU-ms included | same |
| Railway | **Free**: $0 after a 30-day $5-credit trial, then **$1/month** — 1 project, 1 vCPU / 0.5 GB RAM per service, 0.5 GB volume, 1 replica, **cron jobs during the trial only**, community support. **Hobby $5/month** minimum including $5 of credits, 5 GB storage, 7-day logs | `railway.com/pricing` |
| Railway usage rates | CPU ≈ $20 per vCPU-month, memory ≈ $10 per GB-month, egress $0.05/GB, object storage $0.015/GB-month with free egress | same |
| Render | Hobby workspace **$0/month** plus compute. Free instance: 512 MB RAM, less than 1 CPU, documented limitations apply. Cheapest paid instance **$7/month** (512 MB). 500 build minutes/month then $5 per 1,000; 7-day log retention; 5 GB bandwidth included | `render.com/pricing` |
| Fly.io | **No free tier.** Every organisation requires a credit card on file. Stopped machines are still billed for their root filesystem. Egress to India $0.12/GB | `fly.io/docs/about/pricing/` |
| Resend | Free: **3,000 emails/month**, 100/day, 3 domains, 1 webhook endpoint, 30-day retention. Pro $20/month | `resend.com/pricing` |
| GitHub Actions, private repo | **2,000 minutes and 500 MB storage per month** on GitHub Free (3,000 on Pro/Team). Public repositories are free. Beyond the allowance, Linux 2-core is $0.006/minute. A budget can be set to **stop usage** at the limit | `docs.github.com` billing reference |
| Better Auth (candidate auth library) | **MIT licence** — "The MIT License (MIT), Copyright (c) 2024 - present, Bereket Engida" | `raw.githubusercontent.com/better-auth/better-auth/main/LICENSE.md` |
| Next.js | 16.3.x current, 15.5.x maintained, monthly security releases (as recorded in the proposal) | `nextjs.org/blog` |

### 4.1 What changed since the `M1` documents were written

Recorded so that the two sets of figures are not read as contradicting each other. None
of these changes a recommendation; three of them close gaps the documents had flagged.

| # | Item | Status |
| --- | --- | --- |
| 1 | **Cloudflare Workers free-plan limits** | The architecture proposal listed these as **NOT verified**. They are now verified: 100,000 requests/day and **10 ms CPU per invocation**. The consequence is recorded in §7.2 — that CPU ceiling is below what server rendering needs |
| 2 | **Railway Free plan detail** | The roadmap recorded "30-day trial with $5 credit, then $1/month". The caps are now recorded too: 1 project, 0.5 GB RAM, 1 replica, and **cron jobs are trial-only** — which matters, because the roadmap contains scheduled jobs |
| 3 | **Fly.io** | Not previously evaluated as a free option. It has **no free tier** and requires a credit card, so it is eliminated as a free choice |
| 4 | **Better Auth licence** | The proposal flagged "the licence of any specific authentication or UI library" as unverified. For this candidate it is now confirmed **MIT** |
| 5 | **Vercel Pro price** | Not previously recorded: **$20/month**. It is the cost of the compliant Vercel path, and it is not to be enabled without your decision |
| 6 | **GitHub Actions allowance** | Not previously recorded: private repositories include 2,000 minutes/month. This bounds CI cost, and a budget can stop usage rather than bill it |
| 7 | **Neon wording** | The proposal said "100 compute-hours per project per month"; the current page says **100 CU-hours**, the same quantity renamed. Neon's free plan also now documents 10 branches/project, a 2 CU size ceiling, and 5 GB of included object storage |
| 8 | **R2 caveats** | Two details worth knowing before relying on it: the free allowance applies to **Standard** storage only, and usage rounds **up** to the next billing unit |

---

## 5. `D-001` — which architecture?

**Recommendation: Option A, unchanged from the proposal.** Nothing found in this session's
verification argues against it.

| Option | What it is | Monthly cost | Why you might choose it | What it costs you |
| --- | --- | --- | --- | --- |
| **A — integrated TypeScript** | One Next.js application that renders the pages *and* holds the server logic; PostgreSQL; private object storage | $0 with the free tiers | One language, one deployable, one test suite. Public resource pages render for a signed-out visitor. The fewest places for a security decision to be forgotten | Framework coupling. Moving to a separate API later means rewriting the mutation layer — not the database or the stored files |
| **B — decoupled API** | A React/Next front end calling a separate FastAPI or Node service | $0, but two services to keep alive | A hard contract boundary; reusable by a future mobile app; Python's data ecosystem later | Two languages, two dependency trees, two pipelines, two surfaces to secure — for one developer. Session handling has to cross an origin boundary, which is where those bugs live |
| **C — BaaS-led** | Supabase supplies database, auth, storage and row-level policies; the app is mostly a front end | $0 | The fastest working login, and policies give defence in depth at the data layer | The interesting logic (taxonomy integrity, moderation, upload lifecycle, rate limits) ends up in SQL policies that are hard to unit-test and hard to review, or back in server code anyway — two sources of truth. Free projects pause after 1 week idle |

**Why A survives scrutiny.** All three options use **the same PostgreSQL and the same
S3-compatible object storage**, so those are not part of this choice at all — the schema,
the migrations and the stored bytes survive a change of framework. What is being decided is
how many services, languages and deploy pipelines one developer must hold in their head
while also being a student. The architecture also attaches five conditions (`A-C1`–`A-C5`)
that keep the decision reversible, including confining framework-specific idioms to the
routing and presentation layer.

**Reversal cost:** low before `M3` (nothing has been built), high after `M5` (identity and
authorisation would be rewritten). That asymmetry is the whole reason for this gate.

**If you want Option B or C**, say so and expect a revised architecture document before
`M3`, not a revised plan after it.

---

## 6. `D-002` — which database, and is a paid tier ever acceptable?

**Recommendation: A — a free managed PostgreSQL, with Neon as the default provider and
Supabase recorded as the fallback.** Two answers are needed: the provider, and whether a
paid tier is ever allowed. The second one is the more important of the two.

The database is the smallest free allowance in this whole design, which is exactly why it
is worth deciding deliberately rather than discovering later.

| | Neon Free | Supabase Free |
| --- | --- | --- |
| Database storage | **0.5 GB** per project | **500 MB** per database |
| Compute | 100 CU-hours/month per project; sizes up to 2 CU (8 GB RAM) | Shared CPU, 500 MB RAM |
| When idle | **Scales to zero after 5 minutes, then resumes automatically** | **Paused after 1 week of inactivity** — a human resumes it |
| Projects | 100 | 2 active |
| Branches (useful for preview environments) | 10 per project | Not offered |
| Included extras | 5 GB S3-compatible object storage, instant restore, 1-day logs | 1 GB file storage, 5 GB egress, 50,000 MAU, 1-day logs |
| Paid entry | Launch: $0.106/CU-hour, $0.35/GB-month (typical spend documented as $15/month) | Pro: from $25/month |

**Why Neon is the better free default here:** its idle behaviour is transparent. A
scale-to-zero database wakes on the next query; a *paused* Supabase project serves
nothing until someone opens the dashboard and resumes it, which for a public platform
visited sporadically means the site appears broken and the owner fixes it by hand. Both
free tiers hold roughly the same amount of data, so pause behaviour and branch support
decide it, not capacity.

**The honest limit.** 0.5 GB is about **500,000 rows of roughly 1 KB** — arithmetic, not a
measurement, and it ignores index and write-ahead-log overhead. This design already keeps
documents *out* of the database precisely so that only metadata occupies that space. The
rows that will grow without bound are the log and audit tables, which is why `D-010`
(retention) is a decision and not a default: at 90 days, the growth is bounded; at
"indefinite", the free tier is exhausted on a schedule you cannot see.

**Note that both free tiers are ~0.5 GB.** Moving between them is not an escape from the
ceiling — only a change of scenery. The genuine options when the ceiling is reached are to
prune aggressively, or to pay.

**On a paid tier.** The roadmap's rule is that nothing paid is enabled during development,
and that is what I recommend:

| Answer | Consequence |
| --- | --- |
| **"No paid tier, ever"** | Then the retention policy and the object-storage split are not preferences; they are load-bearing. Reaching the ceiling means pruning, not paying, and the platform's growth is capped by them |
| **"Yes, if it is later needed"** (recommended) | Work continues on the free tier with no subscription. If the ceiling is genuinely reached, the step is one provider decision of $15–25/month, taken by you, not by me |

**The switch is configuration, not migration, by design.** Both providers speak plain SQL
over a standard connection string, the schema is owned by versioned migrations, and every
service is reachable without a vendor SDK (`A-C4`). Changing provider is a connection
string, a `pg_dump` and a restore — a documented, testable procedure, not a rewrite.

### 6.1 One thing worth evaluating later, not deciding now

Neon's pricing page also advertises **S3-compatible object storage with 5 GB included per
project** and a managed authentication offering. If both are real and standards-compliant,
they would collapse three providers into one. I did **not** verify the S3 interface, the
data-transfer terms or the migration path, so this is recorded as an **option to assess at
`M7`** — not a reason to change `D-001`, `D-002` or the Cloudflare R2 recommendation, and
not something I would adopt before its terms are read properly.

---

## 7. `D-005` — where does it run?

This is the only blocking decision that is **not an engineering question**. It is a
question about the platform's legal character, and the answer determines which free plans
the project is allowed to use at all.

### 7.1 The problem, in the provider's own words

> "As stated in the fair use guidelines, the Hobby plan restricts users to
> non-commercial, personal use only."
> — `vercel.com/docs/plans/hobby`, checked 2026-09-26

Two further facts from the same documentation make this sharper: a Hobby account
**cannot purchase additional usage**, and exceeding an allowance generally means
**waiting up to 30 days** before the feature works again. So the free Vercel path is not
only restricted in purpose — if it is exceeded, it degrades into a broken site rather than
into a bill.

I am deliberately **not** interpreting whether this specific project counts as "personal
use". That is a judgement with consequences for you, not for me, and the architecture
proposal already declines to assert it. What I can do is lay out what each answer costs.

### 7.2 The real options, with their actual numbers

| Option | Cost | Fit for this application | Catch |
| --- | --- | --- | --- |
| **Vercel Hobby** | **$0** | Best-in-class for the approved framework. Deploys a Next.js app with no configuration | Documented as **non-commercial, personal use only**. Cannot buy extra usage; limits pause instead of billing |
| **Vercel Pro** | **$20/month** | The same, with no restriction question | A real monthly cost for a pilot. Not enabled without your explicit decision |
| **Railway Free → $1/month** | **$0, then $1** | Runs the same application as a container. 1 vCPU, 0.5 GB RAM, 1 replica — enough for a pilot, tight for comfort | **Cron jobs are trial-only.** Scheduled work must be triggered externally. Only 1 project |
| **Railway Hobby** | **$5/month** minimum, credits included | Comfortable: 5 GB storage, 7-day logs, 50 projects, cron support | A subscription, so your decision |
| **Render (Hobby workspace + free instance)** | **$0** | The same container model. 512 MB RAM, under 1 CPU | Free compute is documented as carrying limitations and is framed for personal projects and prototypes. The cheapest paid instance is $7/month |
| **Cloudflare Workers (free)** | **$0** | Globally distributed, no non-commercial clause, R2 already in the same account | **Not viable for this architecture.** The free plan allows **10 ms of CPU per invocation**, and Cloudflare's own documentation states that authentication and server-side rendering "typically use 10–20 ms". Server-rendered public pages are a core requirement, and the architecture forbids runtimes that block Node APIs for file work (`A-C3`) |
| **Cloudflare Workers (paid)** | **$5/month** | 30 M CPU-ms included, so the CPU problem goes away | Still a different runtime from the approved one (`OpenNext`) — a second thing to validate rather than a free swap. A subscription, so your decision |
| **Fly.io** | no free tier | — | **Every organisation requires a credit card on file.** Egress to India is $0.12/GB, the most expensive option listed here for this audience |
| **A self-hosted server** | more than any option above, in money or time | — | Rejected in the proposal, and the verification above does not reopen it |

### 7.3 The recommendation, stated as a decision rule

You do not need to pick a host today. You need to answer **one** question, because the
answer chooses the host for you:

> **Is this a personal, non-commercial project, or is it a public service that may one day
> be monetised?**

| Your answer | Then | Cost | Consequence for `M3` |
| --- | --- | --- | --- |
| **Personal and non-commercial** | Start on **Vercel Hobby**, and **ask Vercel in writing** whether a publicly reachable student resource platform sits inside their Hobby terms, before launch | **$0** | `M3` builds the same application; a container configuration is added but not required yet |
| **Unsure, or it may become public or commercial** | Take the **container path**: Railway Free → **$1/month**, with Render's free instance as the alternative | **≤ $1/month** | `M3` produces a **container-ready artefact** from its first commit — one Dockerfile plus environment-driven configuration, both of which the architecture already requires |
| **Commercial or funded** | **Railway Hobby $5/month** or **Vercel Pro $20/month** | $5–20/month | The same container-ready artefact |

**My recommendation: answer "unsure" unless you are certain, and take the container path.**
One dollar a month removes a legal question from a student project's critical path, and it
buys something concrete — an application that can move between hosts without a rewrite. The
extra work inside `M3` is small, because the approved architecture already demands
environment-driven configuration and standard protocols (`A-C4`).

**What I will not do:** interpret the clause on your behalf, create a paid resource,
subscribe to anything, or deploy anywhere. Nothing in `M3`–`M10` requires a deploy, so this
decision can be recorded now and *used* at `M11`.

### 7.4 The one implementation note that follows from this

Whichever host is chosen, the roadmap contains **scheduled jobs** — log retention purge,
storage-to-database reconciliation, orphan cleanup. On Railway's free plan cron jobs are
trial-only, and on Vercel Hobby scheduled invocations consume the same constrained
allowance. The zero-cost answer already exists: a **scheduled GitHub Actions workflow**
(2,000 included minutes/month on a private repository), or a **Cloudflare Cron Trigger** in
the same account as R2. This is recorded now so that `M7` and `M9` design the job as a
callable command triggered externally, rather than assuming a platform scheduler exists.

---

## 8. The other nine decisions

**I am not proposing a change to any recorded default.** Each one is cheap to reverse at
the milestone that uses it, which is why none of them blocks `M3`.

| ID | Question | Recommended answer | Reversible? | Needed by |
| --- | --- | --- | --- | --- |
| `D-003` | Is "AI-assisted" in scope for v1? | **Post-MVP only.** The architectural constraint (`ADR-005`) is already recorded | Low — nothing is built | `M3` only in the sense that the constraint is honoured |
| `D-004` | Open uploads, or moderated first? | **Post-moderation**, with reporting and a fast takedown path | Low — changes the publish path, not the data model | `M7` |
| `D-006` | Can a moderator permanently delete? | **No — hide only.** Permanent deletion is an administrator action | Low, but the blast radius of the alternative is not | `M9` |
| `D-007` | Malware handling without paid scanning | **Compensating controls**, with the limitation stated openly on the policy pages | Medium — a scanner is a later addition | `M7` |
| `D-008` | What happens to resources when an account closes? | **Retain with attribution**; anonymise the display name on request; soft-delete, then purge after a fixed window | Low | `M7` |
| `D-009` | What personal data is collected? | **Minimal** — email, display name, academic context | Medium — collecting more later is easy; collecting less after a leak is not | `M5` |
| `D-010` | Log and audit retention | **90 days** for access logs; moderation audit records kept longer | Low, and it is the single most useful lever on database growth | `M7` |
| `D-011` | What licence do contributors grant? | **Narrow, revocable, non-exclusive** — the right to store, display and distribute within the platform | Medium — it is text shown at upload and must be consistent | `M7` |
| `D-012` | Takedown response window | **72 hours**, stated publicly | Low, but it is a promise, so it should be one you can keep during exams | `M9` |

---

## 9. What this costs, and what would make it cost something

### 9.1 The recommended path

| Service | Plan | Monthly cost | What would move it off $0 |
| --- | --- | --- | --- |
| Application hosting | Vercel Hobby, or Railway Free → $1 | **$0 – $1** | Exceeding Hobby's allowances, or needing Railway's cron jobs and extra storage |
| Managed PostgreSQL | Neon Free | **$0** | Database storage approaching 0.5 GB, or exhausting 100 CU-hours in a month |
| Object storage | Cloudflare R2 free tier | **$0** | Exceeding 10 GB-month of storage or 1 M Class A operations |
| Transactional email | Resend free | **$0** | Exceeding 3,000 emails/month or 100/day |
| CI | GitHub Actions, private repo | **$0** | Exceeding 2,000 minutes/month |
| **Total** | | **$0 – $1** | |

Nothing is subscribed to, and no card is required, for the entire implementation
(`M3`–`M10`). A custom domain is optional — every host above provides a subdomain — and no
domain price is quoted here because none was verified.

### 9.2 The three thresholds that actually matter

| # | Threshold | What it looks like | Cheapest correct response |
| --- | --- | --- | --- |
| 1 | **Database storage 0.5 GB** | The smallest allowance in the design, and it grows silently | Enforce the `D-010` retention policy, then prune; only then consider a provider or plan change. Note that the alternative provider's free tier is also ~0.5 GB |
| 2 | **Object storage 10 GB** | ~10 GB of documents is a large corpus for a pilot | Overage is genuinely cheap on R2 — $0.015/GB-month, so even 20 GB totals cents. A per-user upload quota (`M7`) is the real control |
| 3 | **Email 3,000/month, 100/day** | Verification and reset messages are the only frequent ones | Keep it transactional only. The next tier is $20/month, so a per-recipient daily ceiling matters more than the monthly total |

**A rule I will follow without being asked:** if a paid plan is ever enabled, a spending
limit and an alert are configured **in the same session**, and the decision is recorded in
the checkpoint. A free tier is an allowance, not an entitlement.

---

## 10. Questions only you can answer — not engineering

These are listed separately because I cannot answer any of them from the repository, and
guessing at them is exactly the kind of thing that should not be invented.

| # | Question | Why it is yours | What I need back |
| --- | --- | --- | --- |
| 1 | Is the platform "personal, non-commercial use"? | It is a judgement about your project's character, with consequences that fall on you | Yes / No / unsure (`D-005a`) |
| 2 | Are you willing to pay up to about $5/month if the free terms forbid the use? | A budget is an owner's decision, never an assistant's | Yes / No (`D-005b`) |
| 3 | Will this ever be monetised? | It changes hosting terms, the legal posture, and moderation obligations | Yes / No / don't know |
| 4 | **Was the inherited application ever deployed publicly, and whose personal data is in its dump?** | It determines whether a data-protection disclosure obligation exists, and to whom | Ask the original author and record the answer |
| 5 | Have the credentials in that dump been rotated? | Those people's passwords are still in use elsewhere | Confirm it has been requested |
| 6 | Who is the data controller named on a privacy notice? | It must name a real person or entity, not a placeholder | A name, before `M5` publishes a policy page |
| 7 | May the platform display an institution's name, and does anything need that institution's approval? | A third party's identity is not mine to grant | Yes / No / not yet |

**What I will never do on your behalf:** invent a budget, state that a use is
non-commercial, agree to provider terms, promise a takedown window, or set a legal policy.

---

## 11. Copy-pasteable answer block

This extends §11.3 of the requirements document with the two commercial questions that
`D-005` turns on. Copy the block, keep the `[x]` on your choice, and return it.

```
D-001 architecture ................. [x] A integrated TypeScript   [ ] B decoupled API   [ ] C BaaS-led
D-002 database ..................... [x] A free managed PostgreSQL  [ ] B self-hosted     [ ] C paid from start
      D-002a provider ............... [x] Neon (recommended)        [ ] Supabase          [ ] other: ______
      D-002b paid tier ever? ........ [x] only if needed later      [ ] never             [ ] now
D-003 AI scope ..................... [x] A post-MVP only           [ ] B in v1           [ ] C never
D-004 content policy ............... [ ] A pre-moderated           [x] B post-moderated  [ ] C restricted
D-005 hosting ...................... [x] A Vercel Hobby if personal/non-commercial
                                     [x] B container host (Railway Free -> $1/mo) if unsure
      D-005a personal, non-commercial project ........... Y / N ___
      D-005b willing to pay up to $5/month if needed .... Y / N ___
      D-005c ever intended to be monetised .............. Y / N ___
D-006 moderator power .............. [x] A hide only               [ ] B hide and permanently delete
D-007 malware handling ............. [x] A compensating controls    [ ] B pay for scanning
D-008 resource after account closes  [x] A retain with attribution  [ ] B anonymise       [ ] C remove
D-009 personal data collected ...... [x] A minimal                 [ ] B extended
D-010 log retention ................ [x] A 90 days                 [ ] B 30 days         [ ] C other: ___
D-011 contributor licence grant .... [x] A narrow and revocable     [ ] B broader         [ ] C none
D-012 takedown response window ..... [x] A 72 hours                 [ ] B 24 hours        [ ] C 7 days

Please also confirm:
  [ ] The architecture recommendation (Option A) is    APPROVED / NEEDS REVISION
  [ ] The MVP scope in §6.2 of the requirements is     APPROVED / see comments
  [ ] The role model in §5 (no self-selected roles) is APPROVED
  [ ] May I proceed to M3 once D-001, D-002 and D-005 are answered?   YES / NO
```

**If you would rather not read anything else:** answer `D-001`, `D-002b`, `D-005a`,
`D-005b`, and the four confirmations at the bottom. Those five answers unblock `M3`, and
every other decision keeps the provisional default recorded against it.

---

## 12. What happens the moment you approve

So that approval has a visible consequence rather than a vague one, this is the exact
sequence I will follow. Every step ends in something verifiable, and I will report the
command output rather than a claim.

| # | Step | How it is verified |
| --- | --- | --- |
| 1 | Record your answers in `docs/CONTINUATION-CHECKPOINT.md`, mark `M2` complete in `docs/DEVELOPMENT-STATUS.md`, and commit | The commit itself, and the answers are readable in the repository |
| 2 | Initialise the application: Next.js with the App Router, TypeScript `strict` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`, and a pinned Node LTS | `npm run typecheck` passes on an empty project; the lockfile is committed |
| 3 | Create the source structure from the architecture (`app/`, `domain/`, `data/`, `services/`, `lib/`) with the dependency-direction rule written down where the code can see it | The structure exists, and the rule is in the README and an ADR |
| 4 | Environment-variable schema, validated at start-up and **failing closed**, with a `.env.example` holding placeholder **names** only | Deliberately delete a required variable: the app must refuse to start with a clear message, not a stack trace |
| 5 | A containerised PostgreSQL locally, the query layer, and the migration tool | `db:migrate` applies and **`db:migrate` reverses** against a disposable database |
| 6 | Test runners wired and nearly empty: unit and integration tests, plus an end-to-end smoke test | `npm test` and `npm run test:e2e` run and pass |
| 7 | CI on every pull request: install from the lockfile, type check, lint, migrate forward **and backward**, unit and integration tests, production build, dependency audit | A green workflow, plus a workflow that fails when a type error is deliberately introduced |
| 8 | Health endpoint, structured logging with a per-request correlation identifier, and one top-level error boundary | The health endpoint reports application liveness and database reachability |
| 9 | Record `ADR-001` as **accepted** — it is "proposed" today and stays proposed until your approval — and write README setup steps that work from a clean clone | A fresh clone reaches a running application by following the documented steps alone |
| 10 | If `D-005` is the container path: a Dockerfile, standalone output, `PORT` binding and graceful shutdown | The container builds and runs, and the application is unchanged between the two paths |

**What `M3` explicitly does not include:** no product features, no product schema beyond a
reversible baseline, no deployment, no paid resource, and no real user data. The roadmap's
stage gate is that no feature work begins until a fresh clone builds and tests from the
documentation alone, and the migration reverses cleanly.

**Time and risk.** `M3` is tooling, and tooling churns. The mitigation recorded in the
roadmap is to pin exact versions and commit the lockfile, and to accept a managed-database
fallback if a container runtime is unavailable on your machine — which matters on Windows,
and will be settled in the first minutes of `M3` rather than assumed.

---

## 13. Verification log

**Method.** Every figure in §4 was read from the provider's own documentation on
**2026-09-26**, and the source URL is recorded beside it. Where a figure differs from the
`M1` documents, the difference is listed in §4.1 rather than silently corrected. No figure
in this brief is estimated, projected or measured from this application.

**Re-checked on this date:** Vercel Hobby allowances and the non-commercial clause; Vercel
Pro price; Neon free and paid rates; Supabase free and paid allowances; Cloudflare R2 free
and paid rates; Cloudflare Workers free and paid allowances and limits; Railway plans,
limits and usage rates; Render workspace and compute prices; Fly.io pricing; Resend free
and paid allowances; GitHub Actions included minutes and rates; the Better Auth licence.

**Still not verified, and therefore not relied upon anywhere in this brief:**

| Item | Why it is not relied upon |
| --- | --- |
| The exact limitations on Render's free instance, and whether free Postgres instances expire | The pricing page states that limitations apply without enumerating them in the retrieved text. Re-check before depending on it |
| Neon's S3-compatible object storage interface and its data-transfer terms | Advertised alongside the free tier, but the interface was not verified. Recorded as an option to assess at `M7` only (§6.1) |
| Licences of authentication or UI libraries other than Better Auth | Not verified. Any library adopted gets its licence confirmed and recorded at the point of adoption |
| Domain registration prices | No domain is required — every host provides a subdomain |
| Whether an education or non-profit discount exists for the email or hosting services | Resend's pricing page poses the question in its FAQ; the answer was not retrievable, and no discount is assumed. Worth an email if the pilot grows |
| Vercel's interpretation of the Hobby clause for this specific project | A judgement for the owner, and worth obtaining **in writing** if Hobby is chosen |
| Any price or quota not listed in §4 | Not verified, and not used |

**These figures expire.** Prices and plan terms change without notice, so every one of them
must be re-checked before `M11` — the same rule the architecture proposal already applies
to its own tables.

---

## 14. What this brief deliberately does not do

| Not done | Why |
| --- | --- |
| Approve anything | Only you can approve. This document exists because you have not |
| Create, subscribe to, or configure any service | No account, no project, no resource, no card |
| Write or scaffold any code | The gate has not passed. The repository is documentation only, and remains so |
| Assert that the platform is non-commercial | That is a judgement with consequences for you, not for me |
| Give legal advice | Rows 4–7 of §10 are questions for you and, where relevant, a professional |
| Invent a decision, a budget, or a policy | Every recommendation above traces to a document in this repository or to a source in §13 |
| Replace the five `M1` documents | It is a route through them: §1 is the gate, §4 is the facts, §5–§8 are the decisions, §12 is what happens next |

**Next action, and the only next action:** answer the block in §11. On approval, `M3` begins
per §12 and [IMPLEMENTATION-ROADMAP.md](./IMPLEMENTATION-ROADMAP.md) §7.
