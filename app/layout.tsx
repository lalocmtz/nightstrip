import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Audiowide, Outfit } from "next/font/google";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://nightstrip.com";
const siteTitle = "NIGHTSTRIP — The paid-rank ad board";
const siteDescription =
  "Buy your rank on NIGHTSTRIP. Two independent paid-rank ad boards — Casino Row for tipsters and sports, Red District for creators. Outbid to climb and stay ranked until someone beats you. Crypto payments via NOWPayments.";

const display = Audiowide({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const body = Outfit({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: "%s · NIGHTSTRIP" },
  description: siteDescription,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: "NIGHTSTRIP",
    url: "/",
    title: siteTitle,
    description: siteDescription,
    locale: "en_US",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: siteTitle }],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    creator: "@lalodtc",
    images: [{ url: "/twitter-image", alt: siteTitle }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "NIGHTSTRIP",
      url: siteUrl,
      description: siteDescription,
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "NIGHTSTRIP",
      url: siteUrl,
      logo: new URL("/icon.svg", siteUrl).toString(),
      sameAs: ["https://x.com/lalodtc"],
    },
  ];
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {children}
      </body>
    </html>
  );
}
