import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MUSEK — Music, creators & community",
  description: "Discover music, support artists and connect with creators on MUSEK."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
