"use client";

import { useRef, useState } from "react";

/**
 * A confirmation for a destructive action.
 *
 * Built on a real `<dialog>` opened with `showModal()`, which is what makes the
 * accessible behaviour free rather than approximated: focus moves into the
 * dialog and stays there, `Esc` cancels, focus returns to the trigger on close,
 * and the page behind it cannot be scrolled into an inconsistent state.
 *
 * The browser's own `confirm()` is never used: it cannot be styled, it blocks
 * the whole tab, and it names nothing — so the reader is asked to confirm a
 * deletion that is described only as "this".
 *
 * While the request is in flight the dialog refuses to close. A destructive
 * action that can be dismissed into silence is one where nobody learns whether
 * it happened.
 */

export function ConfirmDialog({
  id,
  title,
  confirmLabel,
  pendingLabel,
  onConfirm,
  tone = "danger",
  triggerLabel,
  triggerIcon,
  children,
  className,
}: {
  id: string;
  title: string;
  confirmLabel: string;
  pendingLabel: string;
  /** Reports its own failure through the returned string, or `null` on success. */
  onConfirm: () => Promise<string | null>;
  tone?: "danger" | "primary";
  triggerLabel: string;
  triggerIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open(): void {
    setError(null);
    dialogRef.current?.showModal();
  }

  function close(): void {
    dialogRef.current?.close();
  }

  async function confirm(): Promise<void> {
    setPending(true);
    setError(null);
    const failure = await onConfirm();
    setPending(false);
    if (failure) {
      setError(failure);
      return;
    }
    close();
  }

  return (
    <>
      <button
        type="button"
        className={`btn btn--${tone === "danger" ? "quiet-danger" : "primary"}`}
        onClick={open}
      >
        {triggerIcon}
        {triggerLabel}
      </button>

      <dialog
        className={className ? `dialog ${className}` : "dialog"}
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <div className="dialog__body">
          <h2 className="dialog__title" id={`${id}-title`}>
            {title}
          </h2>
          {children ? <div className="dialog__text">{children}</div> : null}

          {error ? (
            <p className="err" role="alert">
              {error}
            </p>
          ) : null}

          <div className="dialog__actions">
            <button type="button" className="btn btn--ghost" onClick={close} disabled={pending}>
              Cancel
            </button>
            <button
              type="button"
              className={`btn btn--${tone === "danger" ? "danger" : "primary"}`}
              onClick={() => void confirm()}
              disabled={pending}
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
