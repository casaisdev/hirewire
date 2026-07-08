/**
 * `/proof` — live, server-rendered verification of every bounty-relevant
 * integration surface. Nothing on this page is cached or hardcoded: each
 * check runs a real request at render time against the hosted services, and
 * a failing check renders as FAIL (honest state, never faked green).
 *
 * Checks:
 *  1. The public read API (api.agenc.ag/api/explorer/listings) answers with
 *     real mainnet listings — the literal bounty deliverable.
 *  2. The moderation attestation service (attest.agenc.ag/v1/info) is up and
 *     names its moderator pubkey.
 *  3. This store's package pins vs the protocol's live published version
 *     matrix (agenc.ag/api/versions).
 *  4. The store's own signed manifest + config disclosure (referrer wallet).
 */
import { storeConfig } from "@/lib/config";
import { buildVersionRows, type VersionRow } from "@/lib/versions";
import pkg from "../../../package.json";

export const dynamic = "force-dynamic";

interface ListingsProbe {
  ok: boolean;
  status: number;
  total: number | null;
  sample: Array<{ pda: string; name: string; category: string }>;
}

async function probeListings(): Promise<ListingsProbe> {
  try {
    const res = await fetch(
      `${storeConfig.api.baseUrl}/api/explorer/listings?limit=3`,
      { cache: "no-store" },
    );
    const body = (await res.json()) as {
      success?: boolean;
      total?: number;
      items?: Array<{
        pda: string;
        decoded?: { name?: string; category?: string };
      }>;
    };
    return {
      ok: res.ok && body.success === true,
      status: res.status,
      total: body.total ?? null,
      sample: (body.items ?? []).map((i) => ({
        pda: i.pda,
        name: i.decoded?.name ?? "?",
        category: i.decoded?.category ?? "?",
      })),
    };
  } catch {
    return { ok: false, status: 0, total: null, sample: [] };
  }
}

interface AttestProbe {
  ok: boolean;
  moderator: string | null;
  service: string | null;
  cluster: string | null;
  policyHash: string | null;
}

async function probeAttest(): Promise<AttestProbe> {
  const endpoint =
    storeConfig.moderation?.attestorEndpoint ?? "https://attest.agenc.ag";
  try {
    const res = await fetch(`${endpoint}/v1/info`, { cache: "no-store" });
    const body = (await res.json()) as {
      ok?: boolean;
      moderator?: string;
      service?: string;
      cluster?: string;
      policyHash?: string;
    };
    return {
      ok: res.ok && body.ok === true && !!body.moderator,
      moderator: body.moderator ?? null,
      service: body.service ?? null,
      cluster: body.cluster ?? null,
      policyHash: body.policyHash ?? null,
    };
  } catch {
    return {
      ok: false,
      moderator: null,
      service: null,
      cluster: null,
      policyHash: null,
    };
  }
}

async function probeVersions(): Promise<{
  ok: boolean;
  rows: VersionRow[];
}> {
  const deps = pkg.dependencies as Record<string, string>;
  const tracked = [
    "@tetsuo-ai/store-core",
    "@tetsuo-ai/marketplace-react",
    "@tetsuo-ai/marketplace-sdk",
  ];
  let published: Array<{
    package: string;
    supported?: string;
    current?: string;
  }> = [];
  try {
    const res = await fetch("https://agenc.ag/api/versions", {
      cache: "no-store",
    });
    const body = (await res.json()) as { packages?: typeof published };
    published = body.packages ?? [];
  } catch {
    // rows render with the live matrix unavailable; the declared pins still show
  }
  const rows = buildVersionRows(deps, published, tracked);
  return { ok: rows.every((r) => r.ok), rows };
}

function Verdict({ ok }: { ok: boolean }) {
  return ok ? (
    <span className="hw-panel-ok">PASS</span>
  ) : (
    <span className="hw-panel-fail">FAIL</span>
  );
}

export default async function ProofPage() {
  const [listings, attest, versions] = await Promise.all([
    probeListings(),
    probeAttest(),
    probeVersions(),
  ]);
  const renderedAt = new Date().toISOString();

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section className="hw-hero" style={{ paddingBottom: 0 }}>
        <h1>
          Live <span className="grad">proof</span>
        </h1>
        <p>
          Every check below ran server-side at <b>{renderedAt}</b> — reload the
          page and they run again. A failing service renders FAIL; nothing here
          is cached, mocked, or hardcoded.
        </p>
      </section>

      <section className="hw-panel">
        <h2>
          1 · Public read API — api.agenc.ag <Verdict ok={listings.ok} />
        </h2>
        <p className="hw-result-count">
          <code className="hw-mono">
            GET {storeConfig.api.baseUrl}/api/explorer/listings
          </code>{" "}
          → HTTP {listings.status || "unreachable"}
          {listings.total !== null &&
            ` · ${listings.total} live mainnet listings`}
        </p>
        {listings.sample.length > 0 && (
          <table className="hw-table">
            <thead>
              <tr>
                <th>Listing PDA</th>
                <th>Name</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {listings.sample.map((s) => (
                <tr key={s.pda}>
                  <td className="hw-mono">
                    <a href={`/listings/${s.pda}`}>{s.pda}</a>
                  </td>
                  <td>{s.name}</td>
                  <td>{s.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <pre className="hw-code">
          curl -s &quot;https://api.agenc.ag/api/explorer/listings?limit=3&quot;
        </pre>
      </section>

      <section className="hw-panel">
        <h2>
          2 · Moderation attestation — attest.agenc.ag{" "}
          <Verdict ok={attest.ok} />
        </h2>
        <p className="hw-result-count">
          Service <b>{attest.service ?? "unreachable"}</b> on{" "}
          <b>{attest.cluster ?? "?"}</b>. The moderator pubkey below is what
          hires made through this store name at the P1.2 gates — resolved live
          from the service, never hardcoded.
        </p>
        <p className="hw-mono">moderator: {attest.moderator ?? "—"}</p>
        <p className="hw-mono">policyHash: {attest.policyHash ?? "—"}</p>
        <pre className="hw-code">curl -s https://attest.agenc.ag/v1/info</pre>
      </section>

      <section className="hw-panel">
        <h2>
          3 · Package pins vs the live version matrix{" "}
          <Verdict ok={versions.ok} />
        </h2>
        <table className="hw-table">
          <thead>
            <tr>
              <th>Package</th>
              <th>This store pins</th>
              <th>Supported (live)</th>
              <th>Current (live)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {versions.rows.map((r) => (
              <tr key={r.name}>
                <td className="hw-mono">{r.name}</td>
                <td className="hw-mono">{r.declared}</td>
                <td className="hw-mono">{r.supported ?? "unreachable"}</td>
                <td className="hw-mono">{r.current ?? "—"}</td>
                <td>
                  <Verdict ok={r.ok} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hw-result-count">
          Live matrix:{" "}
          <a
            href="https://agenc.ag/api/versions"
            target="_blank"
            rel="noreferrer"
            className="hw-mono"
          >
            agenc.ag/api/versions
          </a>{" "}
          (schema agenc.versions.v1).
        </p>
      </section>

      <section className="hw-panel">
        <h2>4 · Store configuration disclosure</h2>
        <table className="hw-table">
          <tbody>
            <tr>
              <td>Network</td>
              <td className="hw-mono">{storeConfig.network} (allowMainnet)</td>
            </tr>
            <tr>
              <td>Read API</td>
              <td className="hw-mono">{storeConfig.api.baseUrl}</td>
            </tr>
            <tr>
              <td>Attestation</td>
              <td className="hw-mono">
                {storeConfig.moderation?.attestorEndpoint ??
                  "https://attest.agenc.ag (default)"}
              </td>
            </tr>
            <tr>
              <td>Referrer wallet (agenc.config.ts)</td>
              <td className="hw-mono">
                <a
                  href={`https://solscan.io/account/${storeConfig.referrer.wallet}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  {storeConfig.referrer.wallet}
                </a>{" "}
                @ {storeConfig.referrer.feeBps} bps
              </td>
            </tr>
            <tr>
              <td>Signed store manifest</td>
              <td className="hw-mono">
                <a href="/.well-known/agenc-store.json">
                  /.well-known/agenc-store.json
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}
