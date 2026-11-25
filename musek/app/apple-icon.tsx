import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: "100%", height: "100%", display: "flex", alignItems: "center",
      justifyContent: "center", borderRadius: 38, background: "#080711",
      color: "#f5eaff", fontSize: 116, fontWeight: 900,
      backgroundImage: "linear-gradient(135deg, #9333ea, #080711 72%)",
      letterSpacing: "-0.08em"
    }}>
      Y
    </div>,
    { ...size }
  );
}
