import type { Metadata } from "next";

import { bodyFont, displayFont, monoFont } from "@/app/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Mock IPL Auction",
    template: "%s | Mock IPL Auction",
  },
  description:
    "Realtime mock IPL auction platform for admins and team captains.",
  applicationName: "Mock IPL Auction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
