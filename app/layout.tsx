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
  icons: {
    icon: "https://www.iplt20.com/assets/images/IPL_LOGO_CORPORATE_2024.png",
    shortcut: "https://www.iplt20.com/assets/images/IPL_LOGO_CORPORATE_2024.png",
    apple: "https://www.iplt20.com/assets/images/IPL_LOGO_CORPORATE_2024.png",
  },
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
