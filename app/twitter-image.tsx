import { ImageResponse } from "next/og";

// Share preview (WhatsApp / Instagram / X / Telegram) for the whole site.
export const runtime = "edge";
export const alt = "Random group chats — Instagram, Telegram & Discord groups";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const chip = (label: string, bg: string) => (
    <div
      style={{
        display: "flex",
        padding: "14px 28px",
        borderRadius: 999,
        fontSize: 30,
        fontWeight: 700,
        color: "#fff",
        background: bg,
      }}
    >
      {label}
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 90px",
          background: "linear-gradient(135deg, #0a0c14 0%, #1b1740 100%)",
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              width: 88,
              height: 88,
              borderRadius: 22,
              background: "linear-gradient(135deg, #6366f1, #d946ef)",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
            }}
          >
            💬
          </div>
          <div style={{ display: "flex", marginLeft: 24, fontSize: 40, fontWeight: 700 }}>Random group chats</div>
        </div>
        <div style={{ display: "flex", marginTop: 44, fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          Join random groups on Instagram, Telegram &amp; Discord
        </div>
        <div style={{ display: "flex", marginTop: 40 }}>
          {chip("Instagram", "linear-gradient(45deg, #f09433, #dc2743, #bc1888)")}
          <div style={{ display: "flex", width: 16 }} />
          {chip("Telegram", "#26a5e4")}
          <div style={{ display: "flex", width: 16 }} />
          {chip("Discord", "#5865f2")}
        </div>
      </div>
    ),
    size
  );
}
