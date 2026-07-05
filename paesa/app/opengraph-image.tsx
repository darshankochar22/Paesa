import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Social share card shown when a paesa.xyz link is posted (WhatsApp, X, iMessage…).
export const alt = "Paesa — Modern Accounting for Indian Business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Reuse the exact brand mark from app/icon.svg so the card never drifts from the logo.
  const iconSvg = await readFile(join(process.cwd(), "app/icon.svg"), "utf8");
  const iconSrc = `data:image/svg+xml;base64,${Buffer.from(iconSvg).toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: 90,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={iconSrc} width={84} height={84} alt="" />
          <div style={{ fontSize: 56, fontWeight: 700, color: "#0a0a0a", letterSpacing: -1 }}>
            Paesa
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 82,
              fontWeight: 700,
              color: "#0a0a0a",
              lineHeight: 1.05,
              letterSpacing: -3,
            }}
          >
            Modern accounting for Indian business.
          </div>
          <div style={{ fontSize: 34, color: "#71717a", lineHeight: 1.35 }}>
            Track every rupee, simplify GST, manage inventory and payroll — all in one place.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
