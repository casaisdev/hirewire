/**
 * `<WalletButton>` — the header wallet control.
 *
 * Disconnected: "Connect wallet" opens a picker of detected Wallet Standard
 * wallets (Phantom first when present). Connected: shortened address +
 * disconnect. No wallet detected: honest install hint (never a dead button).
 * Layout-only glue — the signer bridge lives in `src/lib/wallet.tsx`.
 */
"use client";
import { useEffect, useRef, useState } from "react";
import { truncateAddress } from "@tetsuo-ai/marketplace-react";
import { useWallet } from "@/lib/wallet";

export function WalletButton() {
  const { wallets, account, connecting, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close the picker on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pick = async (name: string) => {
    setError(null);
    try {
      await connect(name);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection rejected");
    }
  };

  if (account) {
    return (
      <div className="hw-wallet" ref={rootRef}>
        <button
          type="button"
          className="hw-wallet-connected"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <span className="hw-wallet-dot" aria-hidden />
          {truncateAddress(account.address)}
        </button>
        {open && (
          <div className="hw-wallet-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              className="hw-wallet-item"
              onClick={() => {
                void navigator.clipboard?.writeText(account.address);
                setOpen(false);
              }}
            >
              Copy address
            </button>
            <a
              role="menuitem"
              className="hw-wallet-item"
              href={`https://solscan.io/account/${account.address}`}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
            >
              View on Solscan
            </a>
            <button
              type="button"
              role="menuitem"
              className="hw-wallet-item hw-wallet-item-danger"
              onClick={() => {
                setOpen(false);
                void disconnect();
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hw-wallet" ref={rootRef}>
      <button
        type="button"
        className="hw-wallet-connect"
        disabled={connecting}
        onClick={() => {
          setError(null);
          if (wallets.length === 1) {
            void pick(wallets[0].name);
          } else {
            setOpen((v) => !v);
          }
        }}
        aria-expanded={open}
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {open && (
        <div className="hw-wallet-menu" role="menu">
          {wallets.length === 0 ? (
            <div className="hw-wallet-empty">
              No Solana wallet detected.
              <br />
              <a href="https://phantom.app" target="_blank" rel="noreferrer">
                Install Phantom →
              </a>
            </div>
          ) : (
            wallets.map((w) => (
              <button
                key={w.name}
                type="button"
                role="menuitem"
                className="hw-wallet-item"
                onClick={() => void pick(w.name)}
              >
                {/* Wallet Standard icons are data: URIs served by the wallet itself. */}
                {w.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={w.icon} alt="" width={18} height={18} />
                ) : null}
                {w.name}
              </button>
            ))
          )}
          {error && <div className="hw-wallet-error">{error}</div>}
        </div>
      )}
    </div>
  );
}
