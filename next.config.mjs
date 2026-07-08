/**
 * Next.js config for the AgenC marketplace-store template.
 *
 * `transpilePackages` lists the AgenC workspace packages so Next compiles their
 * ESM + the `"use client"` section components correctly when this template is
 * consumed from a local tarball / linked checkout (a published install needs no
 * change — the list is harmless either way).
 *
 * `outputFileTracingRoot` pins the tracing root to THIS template so Next does
 * not climb to a parent monorepo lockfile (the AgenC workspace has several) and
 * mis-detect the workspace root. A standalone scaffold (via create-agenc-store)
 * has no parent lockfile and is unaffected.
 *
 * @type {import('next').NextConfig}
 */
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: here,
  transpilePackages: [
    "@tetsuo-ai/store-core",
    "@tetsuo-ai/marketplace-react",
    "@tetsuo-ai/marketplace-sdk",
  ],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // A marketplace signing real-SOL transactions must not be frameable
          // (clickjacking a Hire button = draining a wallet).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
