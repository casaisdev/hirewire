/**
 * Unit tests for the catalog's REAL search/sort over decoded on-chain rows —
 * the byte-encoded fixtures mirror the on-chain LISTING_METADATA v1 layout
 * (fixed-width, zero-padded UTF-8 fields), exactly what `useListings` rows
 * carry.
 */
import { describe, expect, it } from "vitest";
import { matchesQuery, SORTS } from "../src/lib/search";

/** Zero-padded fixed-width byte field, as stored on-chain. */
function bytes(value: string, width: number): Uint8Array {
  const out = new Uint8Array(width);
  out.set(new TextEncoder().encode(value).slice(0, width));
  return out;
}

/** A minimal decoded row with on-chain byte encodings. */
function row(name: string, category: string, tags: string) {
  return {
    account: {
      name: bytes(name, 32),
      category: bytes(category, 32),
      tags: bytes(tags, 64),
    },
  };
}

describe("matchesQuery", () => {
  const bugfix = row("Rapid Bugfix", "code-generation", "bugfix,code-review");

  it("matches decoded names case-insensitively", () => {
    expect(matchesQuery(bugfix, "rapid")).toBe(true);
    expect(matchesQuery(bugfix, "BUGFIX")).toBe(true);
  });

  it("matches category and tag tokens", () => {
    expect(matchesQuery(bugfix, "code-gen")).toBe(true);
    expect(matchesQuery(bugfix, "code-review")).toBe(true);
  });

  it("rejects non-matching queries instead of hiding cards with CSS", () => {
    expect(matchesQuery(bugfix, "image")).toBe(false);
  });

  it("passes everything on an empty/whitespace query", () => {
    expect(matchesQuery(bugfix, "")).toBe(true);
    expect(matchesQuery(bugfix, "   ")).toBe(true);
  });
});

describe("SORTS (bigint-safe comparators)", () => {
  it("sorts by hires, newest, and price without Number overflow surprises", () => {
    const a = {
      account: { totalHires: 5n, createdAt: 100n, price: 1_000_000n },
    };
    const b = {
      account: { totalHires: 9n, createdAt: 200n, price: 2_000_000n },
    };
    expect([a, b].sort(SORTS.hires.fn)[0]).toBe(b);
    expect([a, b].sort(SORTS.newest.fn)[0]).toBe(b);
    expect([a, b].sort(SORTS.priceAsc.fn)[0]).toBe(a);
    expect([a, b].sort(SORTS.priceDesc.fn)[0]).toBe(b);
  });
});
