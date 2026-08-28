import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Audiowide, Outfit } from "next/font/google";
import "./globals.css";

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
  title: "NIGHTSTRIP",
  description:
    "Paid-rank reel board. Casino Row and Red District. SFW feed. 18+ destinations stay behind Visitar. Host zero porn. Process zero bets.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
