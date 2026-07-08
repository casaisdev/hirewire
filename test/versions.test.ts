/**
 * Unit tests for the /proof pin-containment rule. A wrong verdict here would
 * quietly misreport bounty compliance, so the rule fails closed on anything
 * it does not understand.
 */
import { describe, expect, it } from "vitest";
import { buildVersionRows, pinWithinSupportedRange } from "../src/lib/versions";

describe("pinWithinSupportedRange", () => {
  it("accepts pins inside multi-minor ranges", () => {
    expect(pinWithinSupportedRange("^0.10.0", "0.8.x - 0.10.x")).toBe(true);
    expect(pinWithinSupportedRange("^0.8.0", "0.8.x - 0.10.x")).toBe(true);
    expect(pinWithinSupportedRange("^0.6.0", "0.5.x - 0.6.x")).toBe(true);
  });

  it("accepts exact single-minor ranges", () => {
    expect(pinWithinSupportedRange("^0.4.0", "0.4.x")).toBe(true);
  });

  it("rejects pins outside the range (the flag-day trap competitors hit)", () => {
    // sdk ^0.8.0 was correct pre-flag-day; a matrix moving to 0.10.x-only
    // must flip this to FAIL.
    expect(pinWithinSupportedRange("^0.7.0", "0.8.x - 0.10.x")).toBe(false);
    expect(pinWithinSupportedRange("^0.11.0", "0.8.x - 0.10.x")).toBe(false);
    expect(pinWithinSupportedRange("^0.3.0", "0.4.x")).toBe(false);
  });

  it("fails closed on unknown shapes", () => {
    expect(pinWithinSupportedRange("^0.10.0", null)).toBe(false);
    expect(pinWithinSupportedRange("^0.10.0", "")).toBe(false);
    expect(pinWithinSupportedRange("^0.10.0", "latest")).toBe(false);
    expect(pinWithinSupportedRange("^1.2.0", "0.8.x - 0.10.x")).toBe(false);
    expect(pinWithinSupportedRange("—", "0.8.x - 0.10.x")).toBe(false);
  });
});

describe("buildVersionRows", () => {
  it("joins declared deps with the live matrix and verdicts each row", () => {
    const rows = buildVersionRows(
      { "@tetsuo-ai/marketplace-sdk": "^0.10.0" },
      [
        {
          package: "@tetsuo-ai/marketplace-sdk",
          supported: "0.8.x - 0.10.x",
          current: "0.10.0",
        },
      ],
      ["@tetsuo-ai/marketplace-sdk", "@tetsuo-ai/store-core"],
    );
    expect(rows[0]).toMatchObject({ ok: true, current: "0.10.0" });
    // Untracked-in-matrix package: declared shows, verdict fails closed.
    expect(rows[1]).toMatchObject({ name: "@tetsuo-ai/store-core", ok: false });
  });
});
