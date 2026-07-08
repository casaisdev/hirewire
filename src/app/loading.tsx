/**
 * Route-level loading state — a quiet ledger line while server reads run.
 */
export default function Loading() {
  return (
    <div
      className="hw-section-head"
      style={{ marginTop: "3rem" }}
      role="status"
      aria-label="Loading live data"
    >
      <b>Reading mainnet</b>
      <span className="rule" />
      <span>…</span>
    </div>
  );
}
