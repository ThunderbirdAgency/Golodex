import type { Metadata } from "next";
import { GOOGLE_FONTS_HREF } from "@/lib/themes";
import { env } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: {
    default: "Golodex — the modern rolodex",
    template: "%s · Golodex",
  },
  description:
    "One beautiful link for your business. Capture leads, book calls, and land in your customer's phone book — built for real estate, mortgage, and service professionals.",
  openGraph: { type: "website", siteName: "Golodex" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect so the first paint of a themed page is not font-blocked. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      </head>
      <body>{children}</body>
    </html>
  );
}
