/**
 * Root layout — mounts `<Providers>` (AgenC context + Wallet Standard signer
 * bridge) above the branded `<HireWireShell>` (header/nav/wallet control +
 * referral-disclosure footer). SSR-safe: the shell is a thin client boundary;
 * pages render on the server.
 *
 * Typefaces (self-hosted at build via next/font): IBM Plex Mono carries the
 * display voice — on this site the content itself is addresses, hashes, and
 * lamports, so the headline face is the data face. IBM Plex Sans carries body
 * copy.
 */
import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { storeMetadata } from "@tetsuo-ai/store-core/seo";
import { storeConfig, seoContext } from "@/lib/config";
import { Providers } from "@/lib/providers";
import { HireWireShell } from "@/components/shell";
import "./globals.css";

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = storeMetadata(seoContext);

// An AgenC store renders the LIVE on-chain book through a client provider;
// there is nothing to statically prerender. Render every route dynamically.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plexMono.variable} ${plexSans.variable}`}>
      <body>
        <Providers>
          <HireWireShell referrerFeeBps={storeConfig.referrer.feeBps}>
            {children}
          </HireWireShell>
        </Providers>
      </body>
    </html>
  );
}
