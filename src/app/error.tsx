/**
 * Route error boundary — an honest failure state with a retry, in the app's
 * voice. Never swallows the error silently: the digest is shown so a report
 * can reference it.
 */
"use client";

export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="hw-hero" style={{ gridTemplateColumns: "1fr" }}>
      <div className="hw-hero-copy">
        <p className="hw-eyebrow">
          runtime error{error.digest ? ` · digest ${error.digest}` : ""}
        </p>
        <h1>This page failed to render.</h1>
        <p>
          The live reads this page depends on may be momentarily unreachable.
          Nothing was signed and no funds moved.
        </p>
        <p>
          <button
            type="button"
            onClick={reset}
            className="hw-wallet-connect"
            style={{ cursor: "pointer" }}
          >
            Try again
          </button>
        </p>
      </div>
    </section>
  );
}
