/**
 * `npm run test:e2e` — runs the browser suite against a provably local-only
 * server.
 *
 * This file is deliberately a thin entry point. The isolation rules, the
 * non-mutation fingerprinting, and the exit-code propagation all live in
 * `./e2e-runner`, where they are unit-tested. Keeping them out of here is what
 * makes them testable without launching a browser.
 *
 * The one safety property worth repeating: **this runner does not touch
 * `.env`.** An earlier version renamed it aside and wrote a stub, which could
 * lose the owner's configuration if the process was killed mid-run. Isolation
 * now happens entirely in the child process environment; see `./e2e-runner`.
 */

import { runE2e } from "./e2e-runner";

runE2e({ root: process.cwd(), argv: process.argv.slice(2) })
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error("[test:e2e] unexpected failure:", error);
    process.exitCode = 1;
  });
