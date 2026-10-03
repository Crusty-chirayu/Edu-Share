/**
 * Loading placeholders.
 *
 * A skeleton, not a spinner: the shape of what is coming is already known, and
 * drawing it stops the page jumping when the data lands. The bars are
 * decorative and hidden from assistive technology; the wrapper announces the
 * wait exactly once, so a screen reader hears "Loading the library" instead of
 * twenty empty rectangles.
 *
 * Deliberately built from `.skel-*` rather than from the real record markup: a
 * placeholder that reuses `.record` can be mistaken for content — by a person
 * skimming, and by a test asserting on the DOM.
 */

export function ListSkeleton({ label, rows = 4 }: { label: string; rows?: number }) {
  return (
    <div className="stack" role="status" aria-busy="true">
      <span className="vh">{label}</span>
      <div className="skel-stack" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div className="skel skel--record" key={index} />
        ))}
      </div>
    </div>
  );
}

export function BlockSkeleton({ label, blocks = 2 }: { label: string; blocks?: number }) {
  return (
    <div className="stack" role="status" aria-busy="true">
      <span className="vh">{label}</span>
      <div className="skel-stack" aria-hidden="true">
        {Array.from({ length: blocks }, (_, index) => (
          <div className="skel skel--block" key={index} />
        ))}
      </div>
    </div>
  );
}

/** A title-shaped bar, for a page whose heading is part of the wait. */
export function TitleSkeleton({ label }: { label: string }) {
  return (
    <span className="vh" role="status" aria-busy="true">
      {label}
    </span>
  );
}
