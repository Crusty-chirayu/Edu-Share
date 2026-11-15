import Link from "next/link";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/logo";
import { DesktopNav, MobileTabs } from "@/components/nav-links";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSession } from "@/lib/auth/session";

/**
 * The application chrome.
 *
 * Server-rendered, because the account block depends on the session, which only
 * the server can read. Three things about it are deliberate:
 *
 *  1. **The brand is a link to `/` and the only link whose name contains
 *     "EDU-SHARE"** — the footer wordmark is text for exactly this reason. One
 *     element, one name, no ambiguity for a screen reader or a test.
 *  2. **The account block states the identity in words.** A monogram is a
 *     decoration beside the display name, never a substitute for it, and a
 *     session that came from the development adapter is labelled as such and
 *     not merely styled differently.
 *  3. **The search field is labelled "Find resources", not "Search".** The
 *     library has a field of its own called "Search"; two controls sharing one
 *     accessible name would make that field ambiguous on the very page where it
 *     matters most.
 */

export async function SiteHeader() {
  const session = await getSession();
  const monogram = session?.displayName.trim().charAt(0).toUpperCase() ?? "";

  return (
    <>
      <header className="topbar">
        <div className="shell topbar__inner">
          <Link href="/" className="brandmark" aria-label="EDU-SHARE — home">
            <Logo variant="full" size="md" />
          </Link>

          <DesktopNav />

          <form className="topbar__search" method="get" action="/browse" role="search">
            <span className="search">
              <Icon className="search__icon" name="search" size={16} />
              <input
                className="search__input"
                type="search"
                name="q"
                placeholder="Search the library"
                aria-label="Find resources"
                maxLength={120}
                autoComplete="off"
              />
            </span>
          </form>

          <div className="topbar__end">
            <ThemeToggle />

            {session ? (
              <>
                <span className="whome">
                  {monogram ? (
                    <span className="monogram" aria-hidden="true">
                      {monogram}
                    </span>
                  ) : null}
                  <span className="whome__text">
                    <span className="whome__name">{session.displayName}</span>
                    <span className="whome__role">{session.role}</span>
                  </span>
                </span>

                {session.isDevelopmentIdentity ? (
                  <span
                    className="badge badge--private"
                    title="Signed in through the local development adapter, not Supabase Auth"
                  >
                    Dev identity
                  </span>
                ) : null}

                {session.role === "admin" ? (
                  <Link href="/admin/moderation" className="btn btn--secondary btn--sm">
                    Admin
                  </Link>
                ) : null}

                <Link href="/profile" className="btn btn--ghost btn--sm">
                  Profile
                </Link>
                <SignOutButton />
              </>
            ) : (
              <Link href="/auth" className="btn btn--primary btn--sm">
                Sign in
              </Link>
            )}
          </div>
        </div>
      </header>

      <MobileTabs />
    </>
  );
}
