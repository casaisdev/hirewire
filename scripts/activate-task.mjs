/**
 * Activate the funded task from scripts/real-hire.mjs: canonicalize the job
 * spec, obtain the CLEAN task-moderation attestation from attest.agenc.ag
 * (which records the on-chain v2 moderation record), host the canonical JSON
 * as a static file of this store, and pin it with set_task_job_spec so the
 * task becomes claimable by workers.
 *
 * Run:  node scripts/activate-task.mjs <path-to-burner-keypair.json>
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import {
  createMarketplaceClient,
  values,
} from "@tetsuo-ai/marketplace-sdk";

const RPC_URL =
  "https://mainnet.helius-rpc.com/?api-key=187af9f1-7ece-4893-8687-e4b06e7d6ea3";
const TASK = "4uvNjBVPduegpGXHMGnBEDSKD5s47SMXnc7AuE1jatBe";
const LISTING = "7dvA6Q97SSSJPtx7jwE3xP8wXpUNmaVfzhJwwJvQmjV4";
const STORE = "https://hirewire-mu.vercel.app";

const keypairPath = process.argv[2] ?? "../burner-keypair.json";
const raw = JSON.parse(readFileSync(keypairPath, "utf8"));
const buyerSigner = await createKeyPairSignerFromBytes(Uint8Array.from(raw));
console.log("buyer:", buyerSigner.address);

// The exact spec from the hire (content-addressed; hash is the integrity).
const jobSpec = {
  schema: "agenc.store.jobSpec.v1",
  taskPda: TASK,
  listing: LISTING,
  title: "Store flow verification hire",
  brief:
    "Verification hire placed through the HireWire marketplace node. Run the store-flow E2E service once and report the result.",
  deliverables: ["One store-flow E2E run report"],
  acceptanceCriteria: ["The run report covers the checkout flow status"],
};

const { bytes, hex } = await values.canonicalJobSpecHash(jobSpec);
const canonicalJson = values.canonicalJobSpecJson(jobSpec);
console.log("jobSpecHash:", hex);

// Host the canonical JSON as a static file of the store (durable on Vercel).
mkdirSync("public/job-specs", { recursive: true });
writeFileSync(`public/job-specs/${hex}.json`, canonicalJson);
const jobSpecUri = `${STORE}/job-specs/${hex}.json`;
console.log("hosted at (push to serve):", jobSpecUri);

// CLEAN attestation from the hosted service — this also records the on-chain
// v2 task-moderation record the publish gate consumes.
const attRes = await fetch("https://attest.agenc.ag/v1/moderation/tasks", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    task: TASK,
    jobSpecHash: hex,
    spec: jobSpec,
    specUri: jobSpecUri,
  }),
});
const att = await attRes.json();
console.log("attestation:", JSON.stringify(att));
if (att.verdict !== "clean" || !att.moderator) {
  throw new Error(`moderation verdict: ${att.verdict}`);
}

const client = createMarketplaceClient({
  rpcUrl: RPC_URL,
  signer: buyerSigner,
});

const signature = await client.setTaskJobSpec({
  task: TASK,
  creator: buyerSigner,
  jobSpecHash: bytes,
  jobSpecUri,
  moderator: att.moderator,
  moderatorIsAttestor: true,
});

console.log("\n=== TASK ACTIVATED ===");
console.log("set_task_job_spec signature:", String(signature));
console.log("task:", `https://solscan.io/account/${TASK}`);
