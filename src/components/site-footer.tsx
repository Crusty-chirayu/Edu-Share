import Link from "next/link";
import { Icon } from "@/components/icon";
import { Logo } from "@/components/logo";
import { CREATOR, POLICIES, SITE } from "@/lib/site";

/**
 * The footer.
 *
 * Four link groups plus the attribution block, because a footer is where a
 * reader looks for the things the top bar has no room for: the rules, the
 * support route, and the person accountable for the site.
 *
 * Two deliberate choices:
 *
 *  - **The wordmark is not a link.** The banner already carries the one home
 *    link, and a second link with the same accessible name would make "the
 *    brand link" ambiguous.
 *  - **There is no "Sign in" link here.** The header owns the account
 *    control in both states; a second identical link in the footer would give
 *    the page two links with the same name, which is the same ambiguity in a
 *    different place. The account column points at the things a signed-in
 *    reader wants instead.
 */

const PRODUCT = [
  { href: "/browse", label: "Library" },
  { href: "/saved", label: "Saved" },
  { href: "/manage", label: "My uploads" },
  { href: "/upload", label: "Upload a resource" },
] as const;

const ACCOUNT = [
  { href: "/auth?intent=sign-up", label: "Create an account" },
  { href: "/profile", label: "Profile" },
  { href: "/help#account", label: "Account help" },
] as const;

const LEARN = [
  { href: "/about", label: "About the project" },
  { href: "/about#how-it-works", label: "How it works" },
  { href: "/about#who-it-is-for", label: "Who it is for" },
  { href: "/help", label: "Help and support" },
] as const;

const DEVELOPERS = [
  { href: "/api/health", label: "Service health", external: false },
  { href: "https://github.com/Crusty-chirayu/Edu-Share", label: "Source code", external: true },
] as const;

export function SiteFooter() {
  return (
    <footer className="footer">
      <div className="shell footer__grid">
        <div className="footer__about">
          <span className="brandmark">
            <Logo variant="full" size="sm" />
          </span>
          <p className="footer__tagline">{SITE.tagline}</p>
          <p className="footer__note">
            A shared academic library. Resources are filed under the institution and subject they
            belong to, and the person who uploads one decides whether the whole campus or only they
            can read it.
          </p>
        </div>

        <nav className="footer__col" aria-labelledby="foot-product">
          <h2 className="footer__coltitle" id="foot-product">
            Product
          </h2>
          <ul className="footer__links">
            {PRODUCT.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer__col" aria-labelledby="foot-account">
          <h2 className="footer__coltitle" id="foot-account">
            Account
          </h2>
          <ul className="footer__links">
            {ACCOUNT.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer__col" aria-labelledby="foot-learn">
          <h2 className="footer__coltitle" id="foot-learn">
            Learn
          </h2>
          <ul className="footer__links">
            {LEARN.map((link) => (
              <li key={link.href}>
                <Link href={link.href}>{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav className="footer__col" aria-labelledby="foot-policy">
          <h2 className="footer__coltitle" id="foot-policy">
            Policy
          </h2>
          <ul className="footer__links">
            {POLICIES.map((policy) => (
              <li key={policy.href}>
                <Link href={policy.href}>{policy.title}</Link>
              </li>
            ))}
            {DEVELOPERS.map((link) => (
              <li key={link.href}>
                {link.external ? (
                  <a href={link.href} rel="noreferrer noopener" target="_blank">
                    {link.label}
                    <Icon name="external" size={12} className="crumbs__sep" />
                    <span className="vh"> (opens in a new tab)</span>
                  </a>
                ) : (
                  <Link href={link.href}>{link.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="shell footer__bottom">
        <p className="credit">
          <span>
            © {new Date().getFullYear()} {SITE.name}
          </span>
          <span>
            Built by <span className="credit__name">{CREATOR.name}</span> · {CREATOR.role}
          </span>
          <span className="vh">External profiles of {CREATOR.name}:</span>
          <span className="credit__links">
            {CREATOR.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                rel="noreferrer noopener"
                target="_blank"
                aria-label={`${CREATOR.name} on ${link.label} (opens in a new tab)`}
              >
                {link.label}
              </a>
            ))}
          </span>
        </p>
        <p className="footer__note">Independent academic project · no advertising · no tracking</p>
      </div>
    </footer>
  );
}
