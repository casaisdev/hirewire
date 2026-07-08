/**
 * 404 — voiced like the rest of the desk: state the miss, point to the book.
 */
import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hw-hero" style={{ gridTemplateColumns: "1fr" }}>
      <div className="hw-hero-copy">
        <p className="hw-eyebrow">
          http 404 · <b>account not found</b>
        </p>
        <h1>Nothing at this address.</h1>
        <p>
          The page you asked for is not on this node. If you followed a listing
          link, the listing may have been closed on-chain.
        </p>
        <p>
          <Link href="/" style={{ color: "var(--amber)" }}>
            Back to the live book →
          </Link>
        </p>
      </div>
    </section>
  );
}
