/**
 * `/` — the storefront root. SSR: emits the store-level schema.org JSON-LD
 * (`Store`/`WebSite`) for search + agent crawlers, checks the deployed
 * surface, then renders the client `<Catalog>` (live hero stats + real
 * search/filter/sort + the official grid).
 */
import { storeJsonLd, jsonLdScript } from "@tetsuo-ai/store-core/seo";
import type { IndexerListing } from "@tetsuo-ai/marketplace-sdk";
import { SurfaceNotDeployedSection } from "@/lib/sections";
import { seoContext, storeConfig } from "@/lib/config";
import { loadDeployedSurface } from "@/lib/store";
import { Catalog } from "./catalog";

// Always render fresh against the live book; do not cache the catalog page.
export const dynamic = "force-dynamic";

/**
 * The indexer projection per listing PDA (`metadataValid`/`metadataIssues`),
 * fetched server-side so the grid's moderation badges show the listings' REAL
 * attestation state instead of the honest-but-uninformed "pending" fallback.
 * A failed read returns {} — badges degrade to "pending", never invent state.
 */
async function loadModerationProjections(): Promise<
  Record<string, IndexerListing>
> {
  try {
    const res = await fetch(
      `${storeConfig.api.baseUrl}/api/explorer/listings?limit=100`,
      { cache: "no-store" },
    );
    const body = (await res.json()) as {
      success?: boolean;
      items?: IndexerListing[];
    };
    if (!res.ok || body.success !== true) return {};
    return Object.fromEntries((body.items ?? []).map((i) => [i.pda, i]));
  } catch {
    return {};
  }
}

export default async function CatalogPage() {
  const [surface, moderationByPda] = await Promise.all([
    loadDeployedSurface(),
    loadModerationProjections(),
  ]);
  const jsonLd = storeJsonLd(seoContext);

  return (
    <>
      <script
        type="application/ld+json"
        // schema.org JSON-LD for the storefront root.
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />
      {surface.deployed || surface.reason !== "mainnet-not-enabled" ? (
        <Catalog moderationByPda={moderationByPda} />
      ) : (
        <SurfaceNotDeployedSection surface={surface} />
      )}
    </>
  );
}
