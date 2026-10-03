"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icon";

/**
 * Primary navigation, in two shapes.
 *
 * The **bottom tab bar** is justified on a phone and nowhere else: below the
 * desktop breakpoint the top bar cannot carry four links without crowding the
 * account block, a thumb reaches the bottom of the screen and not the top, and
 * there is no hover to reveal anything. Each item carries an icon *and* its
 * label, so the bar is legible in a screenshot and usable with images off.
 *
 * The two landmarks deliberately have different names. Two navigation regions
 * sharing one accessible name is a defect: a screen-reader user cycling
 * landmarks cannot tell which one they are in.
 */

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

export const PRIMARY: readonly NavItem[] = [
  { href: "/browse", label: "Library", icon: "grid" },
  { href: "/saved", label: "Saved", icon: "bookmark" },
  { href: "/manage", label: "My uploads", icon: "upload" },
];

export const MOBILE_TABS: readonly NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/browse", label: "Browse", icon: "grid" },
  { href: "/upload", label: "Upload", icon: "upload" },
  { href: "/saved", label: "Saved", icon: "bookmark" },
  { href: "/profile", label: "Me", icon: "user" },
];

/** Detail and edit pages light up their section rather than going dark. */
function isActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (pathname.startsWith(`${href}/`)) return true;
  return href === "/browse" && pathname.startsWith("/resources/");
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav className="topbar__nav" aria-label="Primary">
      {PRIMARY.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="navlink"
          aria-current={isActive(pathname, item.href) ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav className="tabbar" aria-label="Primary, compact">
      {MOBILE_TABS.map((item) => {
        const isUpload = item.href === "/upload";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`tabbar__item${isUpload ? " tabbar__item--upload" : ""}`}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            <Icon name={item.icon} size={isUpload ? 22 : 20} />
            <span className="tabbar__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
