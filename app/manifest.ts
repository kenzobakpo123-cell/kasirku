import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kasirku — Kasir & Stok UMKM",
    short_name: "Kasirku",
    description: "Kasir cepat, stok terkontrol, laporan siap pakai.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f5f1",
    theme_color: "#0f352b",
    lang: "id",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
