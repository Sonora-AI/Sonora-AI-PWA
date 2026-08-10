import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonora AI",
  description: "AI-powered vocal production and microtonal tuning workstation.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
