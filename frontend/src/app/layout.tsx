import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "DocVault — Sovereign Document Intelligence",
  description:
    "Enterprise-grade encrypted document vault with local OCR intelligence, expiry tracking and grounded RAG AI search.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* Google Identity Services SDK — required for One-Tap & Sign-In With Google */}
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="beforeInteractive"
        />
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
