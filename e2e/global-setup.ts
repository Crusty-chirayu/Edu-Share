import { readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import postgres from "postgres";

/**
 * Suite-level setup and teardown: the guarantee that a browser run leaves nothing
 * behind.
 *
 * ## Why this exists
 *
 * Two cleanup bugs were found by measuring residue after a real run:
 *
 *  1. `afterEach` cleanup is not sufficient on its own. A test that fails before it
 *     records its id, or a run that is interrupted, leaves rows behind — and those
 *     rows then break the database integration suites, which assume a clean
 *     disposable database. This sweep is unconditional and runs last.
 *  2. Matching stored objects by the run id does not work. Storage keys are
 *     `resources/<ownerId>/<uuid>.<ext>`, so a run id embedded in a *title* never
 *     appears in an object path. The previous matcher therefore removed nothing.
 *     The correct rule is "anything that did not exist before the run started",
 *     which is what the snapshot below implements.
 *
 * ## Safety
 *
 * The database sweep is deliberately narrow: it deletes only rows whose title
 * begins with the suite's own prefix, so a developer's real content is never
 * touched. The connection is refused outright unless it points at loopback, so
 * this can never run against a hosted project even by accident.
 */

const RUN_PREFIX = "e2e-";
const STORAGE_ROOT = path.join(process.cwd(), ".local", "storage");

function isLoopback(connectionString: string): boolean {
  try {
    const host = new URL(connectionString).hostname;
    return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
  } catch {
    return false;
  }
}

function storageFiles(dir: string): string[] {
  const found: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...storageFiles(full));
    else found.push(full);
  }
  return found;
}

/**
 * The routes every journey visits first. In dev mode the *first* request to a
 * route pays Next's compile cost for it, and on a contended or virus-scanning
 * host that single request can exceed the suite's per-test budget — the test
 * then reports a timeout against a page that was compiling normally, which
 * reads like a product failure and is not one.
 *
 * Paying that cost once here, before any test starts its clock, is the whole
 * point: no assertion is relaxed, no timeout is raised, and the journeys still
 * navigate exactly as they did. The requests are plain GETs and create nothing,
 * so they cannot affect the storage snapshot or the residue sweep.
 *
 * The `00000000-…` ids are syntactically valid UUIDs that match no row, so the
 * dynamic routes compile and answer 404 — which is also the state `not-found`
 * renders from, so the landing boundary is compiled as well.
 */
const WARM_ROUTES = [
  "/",
  "/browse",
  "/auth",
  "/upload",
  "/manage",
  "/saved",
  "/profile",
  "/about",
  "/help",
  "/terms",
  "/privacy",
  "/acceptable-use",
  "/resources/00000000-0000-0000-0000-000000000000",
  "/manage/00000000-0000-0000-0000-000000000000",
];

/**
 * The costs a GET cannot pay: the mutating route handlers.
 *
 * `next dev` compiles a route on its first request, and several of these compile
 * for 2–20s on this host — more than the suite's per-assertion budget, and more
 * than most of a single test's allowance. Left cold, that cost lands inside a
 * test and surfaces as "Test timeout exceeded" against a page that was
 * compiling perfectly normally.
 *
 * Every entry here mirrors a request a test **actually makes**, and each one
 * declares the outcome it expects. That expectation is not decoration: it is how
 * a warm-up that has drifted from the real journey gets caught. A warm-up that
 * warms an endpoint no test touches is worse than none, because it reports
 * confidence about a path nobody exercised.
 */
const WARM_MUTATIONS: ReadonlyArray<{
  /** What a test does that requires this route to be warm. */
  why: string;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: string;
  contentType?: string;
  /**
   * True when the endpoint must **refuse** an anonymous caller. Then any 2xx is a
   * bug in the app's authorisation and is reported loudly. False when the
   * endpoint legitimately answers an anonymous request — the development adapter
   * signs anyone in by design, so a 200 here is correct and a refusal is not.
   */
  mustRefuse: boolean;
}> = [
  {
    // Every auth journey signs in through this form, and `AuthForm` starts on the
    // "sign in" intent, so this is the endpoint the suite hits — not `sign-up`.
    // Warming `sign-up` instead compiled a different module and left the one the
    // tests use cold, which is the exact failure this table exists to prevent.
    why: "every authenticated journey signs in here (e2e/helpers.ts signIn)",
    path: "/api/auth/sign-in",
    body: JSON.stringify({ displayName: "E2E warm-up", email: "e2e-warmup@example.test" }),
    contentType: "application/json",
    mustRefuse: false,
  },
  {
    // `SignOutButton` POSTs here, and the "signing out ends the session" journey
    // clicks it. Distinct module from sign-in, so it compiles separately.
    why: "the sign-out journey clicks the header button",
    path: "/api/auth/sign-out",
    mustRefuse: false,
  },
  {
    // public-journeys asserts an anonymous PATCH is refused; lifecycle edits a
    // profile through the same route. Compiling it here keeps that assertion
    // measuring authorisation rather than compilation.
    why: "public-journeys asserts an anonymous PATCH is refused",
    path: "/api/profile",
    method: "PATCH",
    body: JSON.stringify({ displayName: "E2E warm-up" }),
    contentType: "application/json",
    mustRefuse: true,
  },
  {
    // The edit journey submits this form, and `deleteResource` in e2e/helpers.ts
    // calls it during teardown — so it compiles inside a test twice over.
    why: "the edit journey saves changes, and teardown deletes by this route",
    path: "/api/resources/00000000-0000-4000-8000-000000000000",
    method: "DELETE",
    mustRefuse: true,
  },
  {
    // Five lifecycle assertions read bytes back through this route. It exports
    // `GET` and nothing else, so warming it with a POST would have answered 405
    // — a route that compiles but a path no test takes. The method has to match
    // the request the tests actually make.
    why: "the download journeys verify byte-for-byte round trips",
    path: "/api/resources/00000000-0000-4000-8000-000000000000/download",
    method: "GET",
    mustRefuse: true,
  },
  {
    why: "an upload is the first step of every lifecycle journey",
    path: "/api/resources",
    method: "POST",
    mustRefuse: true,
  },
  {
    why: "the save/unsave journey toggles a bookmark twice",
    path: "/api/bookmarks",
    body: JSON.stringify({ resourceId: "00000000-0000-4000-8000-000000000000" }),
    contentType: "application/json",
    mustRefuse: true,
  },
];

async function warmMutations(origin: string): Promise<void> {
  for (const mutation of WARM_MUTATIONS) {
    const started = Date.now();
    const method = mutation.method ?? "POST";
    try {
      const response = await fetch(`${origin}${mutation.path}`, {
        method,
        headers: mutation.contentType ? { "Content-Type": mutation.contentType } : {},
        ...(mutation.body ? { body: mutation.body } : {}),
      });
      const elapsed = Date.now() - started;
      console.log(
        `[e2e]   ${method} ${mutation.path} compiled in ${elapsed}ms (status ${response.status})`,
      );

      if (mutation.mustRefuse && response.ok) {
        // An anonymous write was accepted. That is a defect in the product's
        // authorisation, and a warm-up that noticed it here — before any test
        // asserted it — is the only reason to have the expectation at all.
        console.error(
          `[e2e] warm-up ${method} ${mutation.path} was ACCEPTED (${response.status}) ` +
            `by an anonymous caller; it was meant to be refused`,
        );
      }
      if (!mutation.mustRefuse && !response.ok) {
        // The development adapter is meant to sign anyone in, so a refusal here
        // means the warm-up no longer matches the path the tests take.
        console.error(
          `[e2e] warm-up ${method} ${mutation.path} was refused (${response.status}); ` +
            `the tests expect this route to accept an anonymous request`,
        );
      }
    } catch (error) {
      console.error(`[e2e] warm-up ${method} failed for ${mutation.path}:`, error);
    }
  }
}

async function warmRoutes(origin: string): Promise<void> {
  const started = Date.now();
  let warmed = 0;
  for (const route of WARM_ROUTES) {
    const routeStarted = Date.now();
    try {
      // Redirects are followed on purpose: an unauthenticated GET of a protected
      // route warms both the route itself and the /auth page it lands on.
      await fetch(`${origin}${route}`, { redirect: "follow" });
      warmed += 1;
    } catch (error) {
      // A cold route must never fail the suite on its own — say so and let the
      // test decide whether the app is actually broken.
      console.error(`[e2e] warm-up request failed for ${route}:`, error);
    }
    const elapsed = Date.now() - routeStarted;
    if (elapsed > 2_000) console.log(`[e2e]   ${route} compiled in ${elapsed}ms`);
  }
  console.log(`[e2e] warmed ${warmed}/${WARM_ROUTES.length} route(s) in ${Date.now() - started}ms`);
}

export default async function globalSetup(): Promise<() => Promise<void>> {
  // Snapshot before Playwright starts the dev server, so "new object" is a
  // reliable definition of "created by this run".
  const before = new Set(storageFiles(STORAGE_ROOT));

  // Playwright launches `webServer` and waits for its health URL *before*
  // calling this hook, so the dev server is already answering here. The origin
  // comes from `baseURL`, which the config derives from `E2E_PORT`, so a warm-up
  // can never target a different server than the tests will.
  const origin =
    process.env["PLAYWRIGHT_BASE_URL"] ?? `http://127.0.0.1:${process.env["E2E_PORT"] ?? 3000}`;
  await warmRoutes(origin);
  await warmMutations(origin);

  return async function globalTeardown(): Promise<void> {
    const connectionString = process.env["DATABASE_URL"] ?? "";
    if (connectionString && isLoopback(connectionString)) {
      const sql = postgres(connectionString, { max: 1, connect_timeout: 5 });
      try {
        await sql.begin(async (tx) => {
          await tx`DELETE FROM bookmarks WHERE resource_id IN (SELECT id FROM resources WHERE title LIKE ${`${RUN_PREFIX}%`})`;
          await tx`DELETE FROM resources WHERE title LIKE ${`${RUN_PREFIX}%`}`;
          await tx`DELETE FROM profiles WHERE display_name LIKE 'E2E%' AND id NOT IN (SELECT owner_id FROM resources)`;
        });
      } catch (error) {
        // A failed sweep must not be reported as a passing run: say so loudly.
        console.error("[e2e] database sweep failed:", error);
      } finally {
        await sql.end({ timeout: 5 });
      }
    } else if (connectionString) {
      console.error(
        "[e2e] refusing to sweep: DATABASE_URL is not loopback. No database was touched.",
      );
    }

    const removed = storageFiles(STORAGE_ROOT).filter((file) => !before.has(file));
    for (const file of removed) rmSync(file, { force: true });
    if (removed.length > 0) console.log(`[e2e] removed ${removed.length} storage object(s)`);
  };
}
