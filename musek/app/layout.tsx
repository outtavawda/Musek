import type { Metadata, Viewport } from "next";
import "./globals.css";
import GlobalNotifications from "@/app/notifications/global-notifications";
import MobileAppNav from "@/components/mobile-app-nav";
import MusekPlaybackProvider from "@/components/music-playback-provider";

export const metadata: Metadata = {
  title: "MUSEK — Music, creators & community",
  description: "Discover music, support artists and connect with creators on MUSEK.",
  applicationName: "MUSEK",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "MUSEK" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#080711" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MusekPlaybackProvider>
          {children}
          <MobileAppNav />
        </MusekPlaybackProvider>
        <GlobalNotifications />
      </body>
    </html>
  );
}
