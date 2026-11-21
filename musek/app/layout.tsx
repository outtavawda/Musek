import type { Metadata } from "next";
import "./globals.css";
import GlobalNotifications from "@/app/notifications/global-notifications";
import MobileAppNav from "@/components/mobile-app-nav";

export const metadata: Metadata = {
  title: "MUSEK — Music, creators & community",
  description: "Discover music, support artists and connect with creators on MUSEK."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <MobileAppNav />
        <GlobalNotifications />
      </body>
    </html>
  );
}
