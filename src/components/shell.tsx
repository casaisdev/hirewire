/**
 * `<HireWireShell>` — the branded app chrome: sticky header (wordmark + nav +
 * live wallet control), page container, and a footer that keeps the standing
 * referral disclosure via the official `<PoweredByAgenC>` mark linking /trust.
 *
 * Replaces the stock `StoreShell` for full design control. Layout only — every
 * protocol surface (hire, activation, earnings, moderation badges) still
 * renders through @tetsuo-ai/store-core + @tetsuo-ai/marketplace-react.
 */
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { PoweredByAgenC } from "@tetsuo-ai/marketplace-react";
import { WalletButton } from "./wallet-button";

const NAV = [
  { href: "/", label: "Catalog" },
  { href: "/network", label: "Network" },
  { href: "/dashboard", label: "My tasks" },
  { href: "/earnings", label: "Earnings" },
  { href: "/proof", label: "Proof" },
  { href: "/trust", label: "Trust" },
];

export function HireWireShell({
  children,
  referrerFeeBps,
}: {
  children: ReactNode;
  referrerFeeBps: number;
}) {
  const pathname = usePathname();

  return (
    <div className="hw-app">
      <header className="hw-header">
        <div className="hw-header-inner">
          <Link href="/" className="hw-brand" aria-label="HireWire home">
            <span className="hw-brand-mark" aria-hidden>
              ⌁
            </span>
            <span className="hw-brand-name">
              hire<em>wire</em>
            </span>
            <span className="hw-brand-tag">mainnet</span>
          </Link>
          <nav className="hw-nav" aria-label="Main">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={
                  pathname === item.href ? "hw-nav-link active" : "hw-nav-link"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <WalletButton />
        </div>
      </header>

      <main className="hw-main">{children}</main>

      <footer className="hw-footer">
        <div className="hw-footer-inner">
          <div className="hw-footer-col">
            <PoweredByAgenC href="/trust" newTab={false} />
            <p className="hw-footer-disclosure">
              HireWire is an independent AgenC marketplace node. Every hire made
              through this store routes a {(referrerFeeBps / 100).toFixed(1)}%
              on-chain referral fee to the store wallet via the protocol&apos;s
              atomic 4-way settlement split —{" "}
              <Link href="/trust">full disclosure</Link>.
            </p>
          </div>
          <div className="hw-footer-col hw-footer-links">
            <a href="https://agenc.ag" target="_blank" rel="noreferrer">
              AgenC protocol
            </a>
            <a
              href="https://api.agenc.ag/api/explorer/listings"
              target="_blank"
              rel="noreferrer"
            >
              Public read API
            </a>
            <a
              href="https://attest.agenc.ag/v1/info"
              target="_blank"
              rel="noreferrer"
            >
              Attestation service
            </a>
            <a
              href="https://solscan.io/account/HJsZ53Zb27b8QMRbQpuDngE44AdwCGxvEZr61Zmxw1xK"
              target="_blank"
              rel="noreferrer"
            >
              Program on Solscan
            </a>
            <Link href="/.well-known/agenc-store.json">Store manifest</Link>
            <Link href="/llms.txt">llms.txt</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
