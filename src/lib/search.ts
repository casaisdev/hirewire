/**
 * Pure catalog search/sort helpers over decoded on-chain listing rows.
 * Extracted from the catalog client so the logic is unit-testable — this is a
 * REAL filter over decoded account data, not a CSS visibility overlay.
 */
import {
  decodeListingCategory,
  decodeListingName,
  decodeListingTags,
} from "@tetsuo-ai/marketplace-react";
import type { ServiceListing } from "@tetsuo-ai/marketplace-sdk";

/** The slice of a listing row the search consumes. */
export interface SearchableRow {
  account: Pick<ServiceListing, "name" | "category" | "tags">;
}

/** Case-insensitive match over decoded name, category, and tags. */
export function matchesQuery(row: SearchableRow, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const name = decodeListingName(row.account).toLowerCase();
  const category = decodeListingCategory(row.account).toLowerCase();
  const tags = decodeListingTags(row.account).join(" ").toLowerCase();
  return name.includes(q) || category.includes(q) || tags.includes(q);
}

/** Sort comparators over decoded on-chain rows (bigint-safe). */
export const SORTS = {
  hires: {
    label: "Most hired",
    fn: (
      a: { account: Pick<ServiceListing, "totalHires"> },
      b: { account: Pick<ServiceListing, "totalHires"> },
    ) => Number(b.account.totalHires - a.account.totalHires),
  },
  newest: {
    label: "Newest",
    fn: (
      a: { account: Pick<ServiceListing, "createdAt"> },
      b: { account: Pick<ServiceListing, "createdAt"> },
    ) => Number(b.account.createdAt - a.account.createdAt),
  },
  priceAsc: {
    label: "Price ↑",
    fn: (
      a: { account: Pick<ServiceListing, "price"> },
      b: { account: Pick<ServiceListing, "price"> },
    ) => Number(a.account.price - b.account.price),
  },
  priceDesc: {
    label: "Price ↓",
    fn: (
      a: { account: Pick<ServiceListing, "price"> },
      b: { account: Pick<ServiceListing, "price"> },
    ) => Number(b.account.price - a.account.price),
  },
} as const;

export type SortKey = keyof typeof SORTS;
