/**
 * `<HiresPanel>` — server-rendered on-chain hire history for one listing,
 * read live from the hosted indexer (`GET /api/explorer/listings/:pda/hires`).
 * Every row is a real HireRecord account; empty history renders the honest
 * empty state (never fabricated activity).
 */
import { storeConfig } from "@/lib/config";

interface IndexerHireItem {
  taskPda: string;
  hireRecordPda: string;
  buyer: string;
  listing: string;
  price: string;
  slot: number;
  signature: string;
}

function short(addr: string): string {
  return addr.length > 12 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function sol(lamports: string): string {
  const n = Number(lamports) / 1e9;
  return `${n.toLocaleString("en-US", { maximumFractionDigits: 6 })} SOL`;
}

export async function HiresPanel({ pda }: { pda: string }) {
  let items: IndexerHireItem[] = [];
  let failed = false;
  try {
    const res = await fetch(
      `${storeConfig.api.baseUrl}/api/explorer/listings/${pda}/hires`,
      { cache: "no-store" },
    );
    const body = (await res.json()) as {
      success?: boolean;
      items?: IndexerHireItem[];
    };
    if (!res.ok || body.success !== true) failed = true;
    items = body.items ?? [];
  } catch {
    failed = true;
  }

  return (
    <section className="hw-panel" style={{ marginTop: "1.5rem" }}>
      <h2>On-chain hire history</h2>
      {failed ? (
        <p className="hw-result-count">
          The indexer read failed just now — this panel only ever shows real
          HireRecord accounts, so it stays empty rather than guessing. Retry by
          reloading.
        </p>
      ) : items.length === 0 ? (
        <p className="hw-result-count">
          No settled hires recorded for this listing yet — history appears here
          the moment a real HireRecord lands on-chain.
        </p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="hw-table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Buyer</th>
                <th>Price</th>
                <th>Slot</th>
                <th>Tx</th>
              </tr>
            </thead>
            <tbody>
              {items.map((h) => (
                <tr key={h.hireRecordPda}>
                  <td className="hw-mono">
                    <a
                      href={`https://solscan.io/account/${h.taskPda}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {short(h.taskPda)}
                    </a>
                  </td>
                  <td className="hw-mono">
                    <a
                      href={`https://solscan.io/account/${h.buyer}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {short(h.buyer)}
                    </a>
                  </td>
                  <td>{sol(h.price)}</td>
                  <td className="hw-mono">{h.slot || "—"}</td>
                  <td className="hw-mono">
                    {h.signature ? (
                      <a
                        href={`https://solscan.io/tx/${h.signature}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {short(h.signature)}
                      </a>
                    ) : (
                      "—"
                    )}
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
          href={`${storeConfig.api.baseUrl}/api/explorer/listings/${pda}/hires`}
          target="_blank"
          rel="noreferrer"
          className="hw-mono"
        >
          /api/explorer/listings/{short(pda)}/hires
        </a>{" "}
        · machine-readable agent card:{" "}
        <a href={`/api/agent-card/${pda}`} className="hw-mono">
          /api/agent-card/{short(pda)}
        </a>
      </p>
    </section>
  );
}
