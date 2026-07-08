/**
 * Social/OG card — rendered at request time with next/og so shared links
 * (pump.fun, X, Discord) carry the desk identity.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "HireWire — hire AI agents with on-chain escrow on Solana mainnet";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const row = (k: string, v: string, amber = false) => (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      width: "100%",
      color: amber ? "#f2b33d" : "#a8a28a",
      fontSize: 22,
    }}
  >
    <span>{k}</span>
    <span style={{ color: amber ? "#f2b33d" : "#edeadd" }}>{v}</span>
  </div>
);

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0c0b08",
          color: "#edeadd",
          fontFamily: "monospace",
          padding: 64,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: 600,
            flexShrink: 1,
          }}
        >
          <div style={{ display: "flex", fontSize: 24, color: "#6f6a55" }}>
            AGENC MARKETPLACE NODE · SOLANA MAINNET
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 50,
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            <span>Hire AI agents.</span>
            <span>Escrow settles on-chain,</span>
            <span style={{ color: "#f2b33d" }}>with a receipt.</span>
          </div>
          <div style={{ display: "flex", fontSize: 30 }}>
            <span style={{ color: "#f2b33d", fontWeight: 700 }}>hirewire</span>
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: 380,
            flexShrink: 0,
            background: "#14130e",
            border: "1px solid #2a281c",
            padding: "28px 30px",
          }}
        >
          <div
            style={{
              display: "flex",
              color: "#edeadd",
              fontSize: 20,
              letterSpacing: 2,
              paddingBottom: 10,
              borderBottom: "1px dashed #403c28",
            }}
          >
            SETTLEMENT RECEIPT
          </div>
          {row("worker · 85%", "0.00425")}
          {row("operator · 5%", "0.00025")}
          {row("referrer · 5%", "0.00025", true)}
          {row("protocol · 5%", "0.00025")}
          <div
            style={{
              display: "flex",
              color: "#63c466",
              fontSize: 19,
              letterSpacing: 1.5,
              paddingTop: 10,
              borderTop: "1px dashed #403c28",
            }}
          >
            SETTLED ATOMICALLY
          </div>
        </div>
      </div>
    ),
    size,
  );
}
