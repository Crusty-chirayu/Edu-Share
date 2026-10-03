"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";

interface Props {
  title: string;
  isPrivate: boolean;
}

export function ShareButton({ title, isPrivate }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  }

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: "var(--space-1)" }}>
      <button
        type="button"
        className="btn btn--secondary"
        onClick={handleShare}
        aria-label="Share resource link"
      >
        <Icon name="link" size={16} />
        {copied ? "Link copied!" : "Share"}
      </button>
      {isPrivate ? (
        <span className="hint" style={{ fontSize: "11px", color: "var(--c-ink-3)" }}>
          Only you can open this link
        </span>
      ) : null}
      {copied ? (
        <div className="toast" role="status" aria-live="polite">
          <Icon name="check" size={16} />
          <span>Link copied to clipboard</span>
        </div>
      ) : null}
    </div>
  );
}
