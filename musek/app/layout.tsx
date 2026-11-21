import type { Metadata } from "next";
import "./globals.css";
import GlobalSocialButton from "./social/global-social-button";
import GlobalNotifications from "./notifications/global-notifications";

export const metadata: Metadata = {
  title: "MUSEK — Music, creators & community",
  description: "Discover music, support artists and connect with creators on MUSEK."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<GlobalSocialButton /><GlobalNotifications /></body>
    </html>
  );
}
