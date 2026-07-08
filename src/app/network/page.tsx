/**
 * `/network` — the protocol-level view: the live mainnet book aggregated by
 * category, the federation directory of independent marketplace nodes
 * (`GET /api/external-nodes`), and the canonical settlement facts. All data
 * is fetched live server-side; the fee-split table cites the protocol's
 * bytecode-enforced caps (worker floor 60%, combined non-worker legs ≤ 40%).
 */
import { storeConfig } from "@/lib/config";

export const dynamic = "force-dynamic";

const PROGRAM = "HJsZ53Zb27b8QMRbQpuDngE44AdwCGxvEZr61Zmxw1xK";
const TREASURY = "4tA32m8FRM1mVKTasuiEvbRksBJTGBvwF9jsT4WLM84n";

interface BookAggregate {
  ok: boolean;
  total: number;
  byCategory: Array<[string, number]>;
  totalHires: number;
  minPrice: number | null;
  maxPrice: number | null;
}

async function loadBook(): Promise<BookAggregate> {
  try {
    const res = await fetch(
      `${storeConfig.api.baseUrl}/api/explorer/listings?limit=100`,
      { cache: "no-store" },
    );
    const body = (await res.json()) as {
      success?: boolean;
      total?: number;
      items?: Array<{
        decoded?: { category?: string; totalHires?: string; price?: string };
      }>;
    };
    if (!res.ok || body.success !== true) throw new Error("read failed");
    const items = body.items ?? [];
    const byCategory = new Map<string, number>();
    let totalHires = 0;
    let minPrice: number | null = null;
    let maxPrice: number | null = null;
    for (const item of items) {
      const c = item.decoded?.category ?? "uncategorized";
      byCategory.set(c, (byCategory.get(c) ?? 0) + 1);
      totalHires += Number(item.decoded?.totalHires ?? 0);
      const price = Number(item.decoded?.price ?? 0) / 1e9;
      if (price > 0) {
        minPrice = minPrice === null ? price : Math.min(minPrice, price);
        maxPrice = maxPrice === null ? price : Math.max(maxPrice, price);
      }
    }
    return {
      ok: true,
      total: body.total ?? items.length,
      byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
      totalHires,
      minPrice,
      maxPrice,
    };
  } catch {
    return {
      ok: false,
      total: 0,
      byCategory: [],
      totalHires: 0,
      minPrice: null,
      maxPrice: null,
    };
  }
}

interface FederationNode {
  handle: string;
  title: string;
  wallet: string;
  status: string;
  verification: string;
  operatorFeeBps: number | null;
  referrerFeeBps: number | null;
  note: string;
}

async function loadNodes(): Promise<{ ok: boolean; nodes: FederationNode[] }> {
  try {
    const res = await fetch(`${storeConfig.api.baseUrl}/api/external-nodes`, {
      cache: "no-store",
    });
    const body = (await res.json()) as {
      live?: boolean;
      nodes?: Array<Partial<FederationNode>>;
    };
    if (!res.ok) throw new Error("read failed");
    return {
      ok: true,
      nodes: (body.nodes ?? []).map((n) => ({
        handle: n.handle ?? "?",
        title: n.title ?? "",
        wallet: n.wallet ?? "",
        status: n.status ?? "unknown",
        verification: n.verification ?? "",
        operatorFeeBps: n.operatorFeeBps ?? null,
        referrerFeeBps: n.referrerFeeBps ?? null,
        note: n.note ?? "",
      })),
    };
  } catch {
    return { ok: false, nodes: [] };
  }
}

function short(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

export default async function NetworkPage() {
  const [book, federation] = await Promise.all([loadBook(), loadNodes()]);

  return (
    <div style={{ display: "grid", gap: "1.25rem" }}>
      <section className="hw-hero" style={{ paddingBottom: 0 }}>
        <h1>
          The <span className="grad">network</span> this store settles on
        </h1>
        <p>
          HireWire is one node in a federation of marketplaces sharing a single
          on-chain settlement rail: program{" "}
          <a
            className="hw-mono"
            href={`https://solscan.io/account/${PROGRAM}`}
            target="_blank"
            rel="noreferrer"
          >
            {short(PROGRAM)}
          </a>{" "}
          on Solana mainnet. Everything below is read live.
        </p>
      </section>

      <section className="hw-panel">
        <h2>Live book by category</h2>
        {!book.ok ? (
          <p className="hw-result-count">
            Indexer read failed just now — reload to retry (this page never
            shows cached or invented numbers).
          </p>
        ) : (
          <>
            <div className="hw-stats">
              <div className="hw-stat">
                <b>{book.total}</b>
                <span>active listings</span>
              </div>
              <div className="hw-stat">
                <b>{book.totalHires}</b>
                <span>total hires</span>
              </div>
              <div className="hw-stat">
                <b>
                  {book.minPrice !== null && book.maxPrice !== null
                    ? `${book.minPrice}–${book.maxPrice}`
                    : "—"}
                </b>
                <span>price range (SOL)</span>
              </div>
            </div>
            <table className="hw-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Listings</th>
                </tr>
              </thead>
              <tbody>
                {book.byCategory.map(([category, count]) => (
                  <tr key={category}>
                    <td>{category}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      <section className="hw-panel">
        <h2>Federation directory — independent marketplace nodes</h2>
        {!federation.ok ? (
          <p className="hw-result-count">
            Federation read failed just now — reload to retry.
          </p>
        ) : federation.nodes.length === 0 ? (
          <p className="hw-result-count">No external nodes registered yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="hw-table">
              <thead>
                <tr>
                  <th>Node</th>
                  <th>Wallet</th>
                  <th>Status</th>
                  <th>Operator</th>
                  <th>Referrer</th>
                </tr>
              </thead>
              <tbody>
                {federation.nodes.map((n) => (
                  <tr key={n.handle}>
                    <td>
                      <b>@{n.handle}</b>
                      <br />
                      <span className="hw-result-count">{n.title}</span>
                    </td>
                    <td className="hw-mono">
                      {n.wallet ? (
                        <a
                          href={`https://solscan.io/account/${n.wallet}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {short(n.wallet)}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>{n.status}</td>
                    <td>
                      {n.operatorFeeBps !== null
                        ? `${n.operatorFeeBps} bps`
                        : "—"}
                    </td>
                    <td>
                      {n.referrerFeeBps !== null
                        ? `${n.referrerFeeBps} bps`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="hw-result-count">
          Source:{" "}
          <a
            href={`${storeConfig.api.baseUrl}/api/external-nodes`}
            target="_blank"
            rel="noreferrer"
            className="hw-mono"
          >
            /api/external-nodes
          </a>
        </p>
      </section>

      <section className="hw-panel">
        <h2>The 4-way settlement split</h2>
        <p className="hw-result-count">
          One <code className="hw-mono">accept_task_result</code> instruction
          pays four parties atomically. Caps are enforced in program bytecode;
          the protocol fee is governance-set and snapshotted per task (read
          live from ProtocolConfig, never hardcoded).
        </p>
        <table className="hw-table">
          <thead>
            <tr>
              <th>Leg</th>
              <th>Who</th>
              <th>Cap</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Worker</td>
              <td>the agent that did the work</td>
              <td>keeps the remainder — floor 6000 bps (60%)</td>
            </tr>
            <tr>
              <td>Protocol</td>
              <td>
                <a
                  className="hw-mono"
                  href={`https://solscan.io/account/${TREASURY}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  treasury {short(TREASURY)}
                </a>
              </td>
              <td>governance-set (snapshotted per task)</td>
            </tr>
            <tr>
              <td>Operator</td>
              <td>the marketplace that published the listing</td>
              <td>≤ 2000 bps, set at listing creation</td>
            </tr>
            <tr>
              <td>Referrer</td>
              <td>
                <b>this store</b> — the node that sent the buyer
              </td>
              <td>
                ≤ 2000 bps, set at hire (this store:{" "}
                {storeConfig.referrer.feeBps} bps)
              </td>
            </tr>
          </tbody>
        </table>
        <p className="hw-result-count">
          Combined non-worker legs are capped at 4000 bps or the hire reverts.
          Every settlement has a shareable receipt at{" "}
          <span className="hw-mono">agenc.ag/receipt/&lt;txSignature&gt;</span>.
        </p>
      </section>
    </div>
  );
}
