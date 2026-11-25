import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "YASUH — Music, Creators & Community",
    short_name: "YASUH",
    description: "Discover independent music, support artists and connect with creators.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#080711",
    theme_color: "#080711",
    orientation: "portrait-primary",
    icons: [{ src: "/musek-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }]
  };
}
