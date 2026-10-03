import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  /**
   * Development-only: the hostnames the dev server will serve its own assets to.
   *
   * Without this, Next.js 15.5 logs a "Cross origin request detected" warning for
   * every `/_next/*` request whenever the browser is not on `localhost` — which
   * includes the entire Playwright suite, since Playwright browses `127.0.0.1` to
   * avoid Windows' IPv6-first `localhost` resolution. The warning is
   * forward-looking (a future major version will require the setting) rather than
   * a failure, but leaving it in place trains everyone to ignore dev-server output,
   * and the two hostnames below are the addresses a local developer or test
   * actually uses.
   *
   * It is a list of exact hostnames, not a wildcard, and it has no effect in
   * production: Next.js only consults this in development.
   */
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
