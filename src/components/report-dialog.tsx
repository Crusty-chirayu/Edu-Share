"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/icon";

interface Props {
  resourceId: string;
  isAuthenticated: boolean;
}

export function ReportDialog({ resourceId, isAuthenticated }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [category, setCategory] = useState("academic_integrity");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function open() {
    setError(null);
    setSuccess(false);
    dialogRef.current?.showModal();
  }

  function close() {
    dialogRef.current?.close();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/resources/${resourceId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, details: details || undefined }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error?.message ?? "Failed to submit report");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        onClick={open}
        aria-label="Report this resource"
      >
        <Icon name="alert" size={14} />
        Report
      </button>

      <dialog
        ref={dialogRef}
        className="dialog"
        onCancel={(e) => {
          if (submitting) e.preventDefault();
        }}
      >
        <div className="dialog__body">
          <h2 className="dialog__title">Report resource</h2>

          {!isAuthenticated ? (
            <div>
              <p className="dialog__text">You must be signed in to submit a report for review.</p>
              <div className="dialog__actions">
                <button type="button" className="btn btn--ghost" onClick={close}>
                  Cancel
                </button>
                <a href={`/auth?next=/resources/${resourceId}`} className="btn btn--primary">
                  Sign in to continue
                </a>
              </div>
            </div>
          ) : success ? (
            <div>
              <div className="alert alert--info">
                <p className="alert__title">Report submitted</p>
                <p>Your report has been recorded for review.</p>
              </div>
              <div className="dialog__actions" style={{ marginTop: "var(--space-4)" }}>
                <button type="button" className="btn btn--primary" onClick={close}>
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="stack">
              <p className="dialog__text">
                Identify concerns regarding copyright, academic integrity, or inaccurate content.
              </p>

              {error ? (
                <div className="err" role="alert">
                  {error}
                </div>
              ) : null}

              <div className="field">
                <label className="label" htmlFor="report-category">
                  Reason for report
                </label>
                <select
                  id="report-category"
                  className="select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={submitting}
                >
                  <option value="academic_integrity">
                    Academic integrity violation / exam leak
                  </option>
                  <option value="copyright">Copyright infringement</option>
                  <option value="spam">Spam or commercial promotion</option>
                  <option value="incorrect_content">Incorrect or misleading content</option>
                  <option value="other">Other issue</option>
                </select>
              </div>

              <div className="field">
                <label className="label" htmlFor="report-details">
                  Additional details (optional)
                </label>
                <textarea
                  id="report-details"
                  className="textarea"
                  rows={3}
                  maxLength={2000}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide context or links if relevant..."
                  disabled={submitting}
                />
              </div>

              <div className="dialog__actions">
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={close}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn--danger" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit report"}
                </button>
              </div>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
