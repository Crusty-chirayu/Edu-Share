import { Icon, type IconName } from "@/components/icon";

/**
 * An inline message.
 *
 * `role` is not a choice the caller makes casually: a failure that arrives in
 * response to an action is an `alert` (announced immediately), anything else
 * is a `status` (announced politely, once). A tone never travels alone —
 * every alert carries a title and, where there is one, the action that
 * resolves it.
 */

export type AlertTone = "info" | "success" | "warning" | "error";

const TONE_ICON: Record<AlertTone, IconName> = {
  info: "info",
  success: "check",
  warning: "alert",
  error: "alert",
};

export function Alert({
  tone = "info",
  title,
  children,
  actions,
  live = false,
  id,
}: {
  tone?: AlertTone;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  /** `true` → role="alert". Use only for a response to the reader's own action. */
  live?: boolean;
  id?: string;
}) {
  return (
    <div className={`alert alert--${tone}`} role={live ? "alert" : "status"} id={id}>
      <Icon className="alert__icon" name={TONE_ICON[tone]} size={18} />
      <div className="alert__body">
        <p className="alert__title">{title}</p>
        {children}
        {actions ? <div className="alert__actions">{actions}</div> : null}
      </div>
    </div>
  );
}
