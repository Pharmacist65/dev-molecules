import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";

import "@/styles/molevren-fonts.css";
import "./globals.css";

const title = "Molevren — Pharmaceutical Molecular Atlas & Academy";
const description =
  "Explore medicines from structure to effect in a bilingual pharmaceutical molecular atlas and academy.";

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0B1324",
};

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    requestHeaders.get("host") ||
    "localhost:3000";
  const forwardedProto = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const socialImage = new URL("/brand/molevren-og-1200x630.png", metadataBase).toString();

  return {
    metadataBase,
    title,
    description,
    applicationName: "Molevren",
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/brand/molevren-favicon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
      other: [
        {
          rel: "mask-icon",
          url: "/brand/molevren-mask-icon.svg",
          color: "#FF8A00",
        },
      ],
    },
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Molevren",
      locale: "tr_TR",
      alternateLocale: ["en_US"],
      images: [{ url: socialImage, width: 1200, height: 630, alt: "Molevren Pharmaceutical Molecular Atlas & Academy" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
