/* Service worker dasar. Offline-first antrean transaksi menyusul di phase 2. */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/* Seluruh request saat ini jaringan dulu (network-first). Tidak ada cache data
   transaksi agar tidak ada saldo/stok yang basi. */
self.addEventListener("fetch", () => {});
