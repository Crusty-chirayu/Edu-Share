"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";

/**
 * A transient confirmation.
 *
 * The gesture it acknowledges is exactly the one people repeat — a filter
 * applied, a resource saved, a form stored — and it never asks the reader to
 * dismiss it. It *is* announced: `role="status"` means a screen reader says
 * "Saved to your shelf" once, politely, without stealing focus from whatever
 * the person is doing next.
 */

export function Toast({
  message,
  onDone,
  duration = 2600,
}: {
  message: string;
  onDone: () => void;
  duration?: number;
}) {
  const [visible, setVisible] = useState(true);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVisible(false);
      onDoneRef.current();
    }, duration);
    return () => window.clearTimeout(timer);
  }, [duration, message]);

  if (!visible) return null;

  return (
    <p className="toast" role="status">
      <Icon className="toast__icon" name="check" size={16} />
      {message}
    </p>
  );
}

/** The state every component that shows a toast needs, so none of them invents one. */
export function useToast(): {
  message: string | null;
  show: (message: string) => void;
  clear: () => void;
} {
  const [message, setMessage] = useState<string | null>(null);
  return {
    message,
    show: (next: string) => setMessage(next),
    clear: () => setMessage(null),
  };
}
