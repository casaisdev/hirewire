/**
 * Real mainnet hire through THIS store's infrastructure, via the official
 * SDK's humanless checkout (the protocol's Path B):
 *
 *   hire_from_listing_humanless  -> escrows the listing price, stamps THIS
 *                                   store's referrer leg (BB8Co…, 250 bps)
 *   host + attest job spec       -> through this store's LIVE activation
 *                                   route (hirewire-mu.vercel.app)
 *   set_task_job_spec            -> pins the attested spec; task claimable
 *
 * Run:  node scripts/real-hire.mjs <path-to-burner-keypair.json>
 * The keypair is a throwaway funded with pocket SOL; never a personal key.
 */
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import {
  createKeyPairSignerFromBytes,
  createSolanaRpc,
} from "@solana/kit";
import {
  createMarketplaceClient,
  hireAndActivate,
  fetchMaybeServiceListing,
} from "@tetsuo-ai/marketplace-sdk";

const RPC_URL =
  "https://mainnet.helius-rpc.com/?api-key=187af9f1-7ece-4893-8687-e4b06e7d6ea3";
const STORE = "https://hirewire-mu.vercel.app";
const LISTING = "7dvA6Q97SSSJPtx7jwE3xP8wXpUNmaVfzhJwwJvQmjV4";
const REFERRER = "BB8CoUFLkmxyJmL5oDMWY5eoi5AWJTyN2ZhgHZXjQQC3";

const keypairPath = process.argv[2] ?? "../burner-keypair.json";
const raw = JSON.parse(readFileSync(keypairPath, "utf8"));
const buyerSigner = await createKeyPairSignerFromBytes(Uint8Array.from(raw));
console.log("buyer:", buyerSigner.address);

const rpc = createSolanaRpc(RPC_URL);
const balance = await rpc.getBalance(buyerSigner.address).send();
console.log("balance:", Number(balance.value) / 1e9, "SOL");
if (Number(balance.value) < 15_000_000) {
  throw new Error("Fund the burner with at least 0.015 SOL first.");
}

const client = createMarketplaceClient({
  rpcUrl: RPC_URL,
  signer: buyerSigner,
});

// Fresh CAS guards from chain.
const current = await fetchMaybeServiceListing(rpc, LISTING);
if (!current.exists) throw new Error("listing not found");
console.log(
  "listing price:",
  Number(current.data.price) / 1e9,
  "SOL · version:",
  current.data.version,
);

// The moderator whose LISTING record the hire gate consumes — resolved by
// THIS store's live activation route (never hardcoded).
const modRes = await fetch(
  `${STORE}/api/agenc/activate-job-spec?listing=${LISTING}`,
);
const { moderator } = await modRes.json();
console.log("moderator (via store route):", moderator);

const taskId = Uint8Array.from(randomBytes(32));

const result = await hireAndActivate(client, {
  hire: {
    listing: LISTING,
    taskId,
    expectedPrice: current.data.price,
    expectedVersion: current.data.version,
    reviewWindowSecs: 604_800n,
    listingSpecHash: new Uint8Array(current.data.specHash),
    moderator,
    referrer: REFERRER, // the demand-side leg — THIS store's earning wallet
    referrerFeeBps: 250,
  },
  jobSpec: {
    title: "Store flow verification hire",
    brief:
      "Verification hire placed through the HireWire marketplace node. Run the store-flow E2E service once and report the result.",
    deliverables: ["One store-flow E2E run report"],
    acceptanceCriteria: ["The run report covers the checkout flow status"],
  },
  // Host + attest through THIS STORE'S live activation route — the same
  // backend the browser checkout uses.
  hostAndModerateJobSpec: async (input) => {
    const body = {
      taskPda: String(input.taskPda),
      taskId: Buffer.from(taskId).toString("hex"),
      listing: LISTING,
      jobSpec: input.jobSpec,
      hireSignature: input.hireSignature,
      referrerInjected: input.referrerInjected,
    };
    const res = await fetch(`${STORE}/api/agenc/activate-job-spec`, {
      method: "POST",
      headers: { "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify(body),
    });
    const out = await res.json().catch(() => null);
    if (!res.ok || !out) {
      throw new Error(`activation route ${res.status}: ${JSON.stringify(out)}`);
    }
    console.log("job spec hosted:", out.jobSpecUri);
    console.log("moderation attested:", out.moderationAttested);
    return {
      jobSpecHash: Uint8Array.from(Buffer.from(out.jobSpecHashHex, "hex")),
      jobSpecUri: out.jobSpecUri,
      moderationAttested: out.moderationAttested === true,
      moderator: out.moderator,
    };
  },
  rpcUrl: RPC_URL,
});

console.log("\n=== HIRE LANDED ===");
console.log("task PDA:", String(result.taskPda));
console.log("hire signature:", result.hireSignature ?? "(see explorer)");
console.log("activation signature:", result.activationSignature ?? "");
console.log(
  "explorer:",
  `https://solscan.io/account/${String(result.taskPda)}`,
);
