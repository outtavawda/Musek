import type { Metadata, Viewport } from "next";
import "./globals.css";
import GlobalNotifications from "@/app/notifications/global-notifications";
import MobileAppNav from "@/components/mobile-app-nav";
import MusekPlaybackProvider from "@/components/music-playback-provider";
import PwaRegistration from "@/components/pwa-registration";
import PwaInstallPrompt from "@/components/pwa-install-prompt";
import NativeDeepLinkHandler from "@/components/native-deep-link-handler";

export const metadata: Metadata = {
  title: "YASUH — Music, creators & community",
  description: "Discover music, support artists and connect with creators on YASUH.",
  applicationName: "YASUH",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "YASUH" }
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MusekPlaybackProvider>
          {children}
          <MobileAppNav />
          <PwaRegistration />
          <PwaInstallPrompt />
          <NativeDeepLinkHandler />
        </MusekPlaybackProvider>
        <GlobalNotifications />
      </body>
    </html>
  );
}
