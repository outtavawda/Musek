import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 38,
      background: "#fbf8f0"
    }}>
      <svg width="142" height="142" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2c477" />
            <stop offset="52%" stopColor="#c69a35" />
            <stop offset="100%" stopColor="#8f6818" />
          </linearGradient>
        </defs>
        <path d="M256 458s-145-126-145-252a145 145 0 1 1 290 0c0 126-145 252-145 252Z" fill="url(#gold)" />
        <circle cx="256" cy="206" r="55" fill="#fbf8f0" />
      </svg>
    </div>,
    { ...size }
  );
}
