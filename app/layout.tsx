import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Kasirku — Kasir & stok untuk UMKM", template: "%s | Kasirku" },
  description: "Aplikasi kasir dan stok untuk UMKM, dikelola dari satu dashboard oleh agensi.",
  applicationName: "Kasirku",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
