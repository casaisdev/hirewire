/**
 * Bounty-compliance tests over the validated store config: every assertion
 * here maps to an explicit bounty requirement. `defineStore` already fails
 * the build on invalid config; these tests pin the SPECIFIC required values
 * so a drive-by edit cannot silently break a deliverable.
 */
import { describe, expect, it } from "vitest";
import storeConfig from "../agenc.config";
import pkg from "../package.json";

describe("agenc.config.ts (bounty deliverables)", () => {
  it("targets Solana mainnet with the explicit real-funds opt-in", () => {
    expect(storeConfig.network).toBe("mainnet");
    expect(storeConfig.allowMainnet).toBe(true);
  });

  it("uses api.agenc.ag as the public read API", () => {
    expect(storeConfig.api.baseUrl).toBe("https://api.agenc.ag");
  });

  it("pins attest.agenc.ag as the moderation attestation service", () => {
    expect(storeConfig.moderation?.attestorEndpoint).toBe(
      "https://attest.agenc.ag",
    );
  });

  it("configures a referrer wallet with a valid fee (routes hires to the store)", () => {
    // Base58 pubkey shape (32-byte ed25519 key encodes to 32–44 chars).
    expect(storeConfig.referrer.wallet).toMatch(
      /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    );
    expect(storeConfig.referrer.feeBps).toBeGreaterThan(0);
    // Protocol cap for the referrer leg is 2000 bps.
    expect(storeConfig.referrer.feeBps).toBeLessThanOrEqual(2000);
  });

  it("keeps the standing referral disclosure on", () => {
    expect(storeConfig.branding.poweredBy).toBe(true);
  });

  it("gates unattested listings (fail-closed curation)", () => {
    expect(storeConfig.curation?.requireModeration).toBe(true);
  });
});

describe("package pins (bounty-required official packages)", () => {
  const deps = pkg.dependencies as Record<string, string>;

  it("depends on all three required @tetsuo-ai packages", () => {
    expect(deps["@tetsuo-ai/store-core"]).toBeDefined();
    expect(deps["@tetsuo-ai/marketplace-react"]).toBeDefined();
    expect(deps["@tetsuo-ai/marketplace-sdk"]).toBeDefined();
  });

  it("pins marketplace-sdk to the post-flag-day wire (^0.11.0)", () => {
    expect(deps["@tetsuo-ai/marketplace-sdk"]).toBe("^0.11.0");
  });

  it("pins marketplace-react to the supported 0.4.x line", () => {
    expect(deps["@tetsuo-ai/marketplace-react"]).toBe("^0.4.0");
  });
});
