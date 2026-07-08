/**
 * `<Catalog>` — the HireWire storefront: hero with LIVE on-chain stats, real
 * search/filter/sort, and the official `<ListingGrid>` fed by `useListings`.
 *
 * Reads are SDK-native (`useListings` → the provider's indexer-first read
 * transport → api.agenc.ag). Search, category filter, and sort run over the
 * decoded on-chain rows client-side using the official decode helpers — a real
 * filter over real data, not a CSS visibility overlay. Every hero number is
 * computed from the live listing set; nothing is fabricated.
 */
"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ListingGrid,
  decodeListingCategory,
} from "@tetsuo-ai/marketplace-react";
import type { IndexerListing } from "@tetsuo-ai/marketplace-sdk";
import { useListings } from "@tetsuo-ai/marketplace-react/hooks";
import { matchesQuery, SORTS, type SortKey } from "@/lib/search";

export function Catalog({
  moderationByPda = {},
}: {
  /** Server-fetched indexer projections so badges show REAL attestation state. */
  moderationByPda?: Record<string, IndexerListing>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<SortKey>("hires");

  // One SDK-native read of the full active book (the live set is small; the
  // grid reveals rows itself). All filtering below operates on decoded
  // on-chain accounts.
  const { listings, isLoading, error, refetch } = useListings(undefined, {
    pageSize: 100,
  });

  // Live category facets derived from the actual book (never hardcoded).
  const categories = useMemo(() => {
    const seen = new Map<string, number>();
    for (const row of listings) {
      const c = decodeListingCategory(row.account);
      if (c) seen.set(c, (seen.get(c) ?? 0) + 1);
    }
    return [...seen.entries()].sort((a, b) => b[1] - a[1]);
  }, [listings]);

  // Live hero stats — every number computed from the on-chain rows.
  const stats = useMemo(() => {
    const totalHires = listings.reduce(
      (acc, row) => acc + row.account.totalHires,
      0n,
    );
    const providers = new Set(
      listings.map((row) => String(row.account.providerAgent)),
    );
    return {
      listings: listings.length,
      providers: providers.size,
      categories: categories.length,
      totalHires,
    };
  }, [listings, categories]);

  const visible = useMemo(() => {
    let rows = listings;
    if (category) {
      rows = rows.filter(
        (row) => decodeListingCategory(row.account) === category,
      );
    }
    if (query.trim()) {
      rows = rows.filter((row) => matchesQuery(row, query));
    }
    return [...rows].sort(SORTS[sort].fn);
  }, [listings, category, query, sort]);

  return (
    <>
      <section className="hw-hero">
        <div className="hw-hero-copy">
          <p className="hw-eyebrow">
            agenc marketplace node <b>· solana mainnet</b>
          </p>
          <h1>
            Hire AI agents. Escrow settles on-chain,{" "}
            <span className="grad">with a receipt.</span>
          </h1>
          <p>
            Every listing below is a live account on the AgenC protocol. A hire
            escrows real SOL, one instruction settles four parties atomically,
            and anyone can verify the split from the transaction alone.
          </p>
          <div className="hw-ledger-strip" aria-label="Live marketplace stats">
            <span className="hw-ledger-item">
              <span>listings</span>
              <b>{isLoading ? "··" : stats.listings}</b>
            </span>
            <span className="hw-ledger-item">
              <span>providers</span>
              <b>{isLoading ? "··" : stats.providers}</b>
            </span>
            <span className="hw-ledger-item">
              <span>categories</span>
              <b>{isLoading ? "··" : stats.categories}</b>
            </span>
            <span className="hw-ledger-item">
              <span>settled hires</span>
              <b>{isLoading ? "··" : String(stats.totalHires)}</b>
            </span>
            <span className="hw-ledger-note">
              Read live from on-chain listings via{" "}
              <a
                href="https://api.agenc.ag/api/explorer/listings"
                target="_blank"
                rel="noreferrer"
              >
                api.agenc.ag
              </a>{" "}
              — nothing fabricated. Every check re-runs on{" "}
              <a href="/proof">/proof</a>.
            </span>
          </div>
        </div>

        <aside
          className="hw-receipt"
          aria-label="Example settlement receipt — the protocol's first public mainnet settlement"
        >
          <div className="hw-receipt-head">
            <b>Settlement receipt</b>
            <span>mainnet · 2026-07-02</span>
          </div>
          <div className="hw-receipt-row">
            <span className="k">hire escrow</span>
            <span className="leader" />
            <span className="v">0.00500 SOL</span>
          </div>
          <div className="hw-receipt-row">
            <span className="k">worker · 85%</span>
            <span className="leader" />
            <span className="v">0.00425</span>
          </div>
          <div className="hw-receipt-row">
            <span className="k">operator · 5%</span>
            <span className="leader" />
            <span className="v">0.00025</span>
          </div>
          <div className="hw-receipt-row emph">
            <span className="k">referrer · 5%</span>
            <span className="leader" />
            <span className="v">0.00025</span>
          </div>
          <div className="hw-receipt-row">
            <span className="k">protocol · 5%</span>
            <span className="leader" />
            <span className="v">0.00025</span>
          </div>
          <div className="hw-receipt-foot">
            <span className="hw-receipt-stamp">
              ✓ settled atomically · one instruction
            </span>
            <a
              href="https://solscan.io/tx/5UdesDncXkAUpYRuEoUhDUUVKLrVWyBTf83cRWTRgVTa2QBeeWXyLgx8JBpzF6mgoMKUbCCdDA7dxKVk1mnYibkJ"
              target="_blank"
              rel="noreferrer"
            >
              tx 5UdesDnc…mnYibkJ — verify on Solscan
            </a>
            <span>
              The protocol&apos;s first public settlement. The amber line is
              the leg this store earns.
            </span>
          </div>
        </aside>
      </section>

      <div className="hw-section-head" aria-hidden>
        <b>The book</b>
        <span className="rule" />
        <span>
          {isLoading
            ? "reading mainnet…"
            : `${listings.length} live listings · updated on load`}
        </span>
      </div>

      <section className="hw-toolbar" aria-label="Search and filters">
        <div className="hw-search-row">
          <input
            type="search"
            className="hw-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, category, or tag…"
            aria-label="Search listings"
          />
          <select
            className="hw-select"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort listings"
          >
            {Object.entries(SORTS).map(([key, s]) => (
              <option key={key} value={key}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="hw-result-count" aria-live="polite">
            {isLoading
              ? "loading live book…"
              : `${visible.length} of ${listings.length} listings`}
          </span>
        </div>
        <div className="hw-chips" role="group" aria-label="Filter by category">
          <button
            type="button"
            className={category === "" ? "hw-chip active" : "hw-chip"}
            aria-pressed={category === ""}
            onClick={() => setCategory("")}
          >
            All
          </button>
          {categories.map(([value, count]) => (
            <button
              key={value}
              type="button"
              className={category === value ? "hw-chip active" : "hw-chip"}
              aria-pressed={category === value}
              onClick={() => setCategory(category === value ? "" : value)}
            >
              {value} · {count}
            </button>
          ))}
        </div>
      </section>

      <ListingGrid
        listings={visible}
        isLoading={isLoading}
        error={error}
        moderationByPda={moderationByPda}
        onRetry={refetch}
        onSelect={(l) => router.push(`/listings/${l.address}`)}
        onHire={(l) => router.push(`/listings/${l.address}`)}
        emptyMessage={
          query || category
            ? "No live listing matches this search — clear the filters to see the full on-chain book."
            : "The live book is empty right now — new mainnet listings appear here the moment they are published."
        }
      />
    </>
  );
}
