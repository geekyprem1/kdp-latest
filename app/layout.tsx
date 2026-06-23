import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KDF Mafia — The Fastest Way to Build a KDP Business",
  description:
    "KDF Mafia is the fastest way to build a KDP business. Research niches, generate KDP-ready books, covers, and launch kits with AI.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
