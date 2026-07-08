/**
 * Live integration tests against the hosted services the store depends on —
 * the runnable version of the bounty's proof deliverables. These hit the real
 * network (mainnet read API + attestation service); run them with the rest of
 * the suite (`npm test`) or standalone before deploying.
 */
import { describe, expect, it } from "vitest";

const API = "https://api.agenc.ag";

describe("api.agenc.ag (public read API — bounty proof)", () => {
  it("GET /api/explorer/listings answers success:true with real mainnet listings", async () => {
    const res = await fetch(`${API}/api/explorer/listings?limit=3`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      success: boolean;
      total: number;
      items: Array<{
        pda: string;
        decoded?: { name?: string; category?: string; price?: string };
        metadataValid?: boolean;
      }>;
    };
    expect(body.success).toBe(true);
    expect(body.total).toBeGreaterThan(0);
    expect(body.items.length).toBeGreaterThan(0);
    // Real decoded on-chain accounts, not mocks: PDAs are base58, prices are
    // u64 decimal strings.
    for (const item of body.items) {
      expect(item.pda).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
      expect(item.decoded?.name).toBeTruthy();
      expect(item.decoded?.price).toMatch(/^\d+$/);
    }
  }, 30_000);

  it("GET /api/explorer/listings/:pda/hires answers the house envelope", async () => {
    const listings = (await (
      await fetch(`${API}/api/explorer/listings?limit=1`)
    ).json()) as { items: Array<{ pda: string }> };
    const pda = listings.items[0]?.pda;
    expect(pda).toBeTruthy();
    const res = await fetch(`${API}/api/explorer/listings/${pda}/hires`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; items: unknown[] };
    expect(body.success).toBe(true);
    expect(Array.isArray(body.items)).toBe(true);
  }, 30_000);
});

describe("attest.agenc.ag (moderation attestation — bounty requirement)", () => {
  it("GET /v1/info is up on mainnet and names its moderator pubkey", async () => {
    const res = await fetch("https://attest.agenc.ag/v1/info");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      cluster: string;
      moderator: string;
      signerConfigured: boolean;
    };
    expect(body.ok).toBe(true);
    expect(body.cluster).toBe("mainnet");
    expect(body.signerConfigured).toBe(true);
    expect(body.moderator).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
  }, 30_000);
});
