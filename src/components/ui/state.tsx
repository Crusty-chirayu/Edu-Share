import { Icon, type IconName } from "@/components/icon";

/**
 * The one empty / error / unavailable surface.
 *
 * Every screen that can show "nothing" shows this, and every use of it must
 * answer one question: **what can the reader do next?** A state with no action
 * is a dead end, which is why `actions` is part of the shape rather than an
 * optional flourish — the type allows it to be omitted only so that a *found*
 * empty list can still say "you have nothing here yet, and that is fine".
 *
 * The heading level is configurable because the same component appears under
 * an `h1` on a page and inside a section on the dashboard; a fixed level would
 * break the document outline in one of those two places.
 */

export function State({
  icon = "info",
  title,
  children,
  actions,
  level = 2,
  plain = false,
  tone,
}: {
  icon?: IconName;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  level?: 1 | 2 | 3;
  /** A solid surface reads as a result; a dashed one reads as "nothing yet". */
  plain?: boolean;
  tone?: "error" | "warning";
}) {
  const Heading = level === 1 ? "h1" : level === 3 ? "h3" : "h2";
  return (
    <div className={`state${plain ? " state--plain" : ""}`}>
      <Icon
        className="state__icon"
        name={icon}
        size={28}
        style={tone === "error" ? { color: "var(--c-danger)" } : undefined}
      />
      <Heading className="state__title">{title}</Heading>
      {children ? <div className="state__body">{children}</div> : null}
      {actions ? <div className="state__actions">{actions}</div> : null}
    </div>
  );
}
