import Link from "next/link";

const features = [
  {
    icon: "🧾",
    title: "Kasir yang cepat",
    body: "Cari produk, susun keranjang, diskon, dan cetak struk 58 mm atau kirim lewat WhatsApp.",
  },
  {
    icon: "📦",
    title: "Stok selalu akurat",
    body: "Setiap penjualan otomatis mengurangi stok. Riwayat mutasi tercatat rapi, stok menipis langsung terlihat.",
  },
  {
    icon: "📊",
    title: "Laporan siap pakai",
    body: "Penjualan harian, produk terlaris, dan ekspor CSV — tanpa perlu buka spreadsheet lagi.",
  },
  {
    icon: "🏢",
    title: "Mode agensi",
    body: "Satu akun untuk kelola banyak toko klien. Laporan gabungan dan komisi referral sudah termasuk.",
  },
  {
    icon: "🔒",
    title: "Aman & teraudit",
    body: "Sesi per perangkat, hak akses kasir/manager/owner, dan log aktivitas untuk setiap perubahan.",
  },
  {
    icon: "📱",
    title: "Bisa dipasang di HP",
    body: "Buka di browser, pasang sebagai aplikasi. Kasir tetap nyaman dipakai di tablet counter.",
  },
];

const plans = [
  {
    name: "Gratis",
    amount: "Rp0",
    period: "selamanya",
    features: ["1 outlet", "100 transaksi / bulan", "3 produk", "Laporan dasar"],
    popular: false,
  },
  {
    name: "Pro",
    amount: "Rp199.000",
    period: "per outlet / bulan",
    features: ["Stok tanpa batas", "Multi-kasir", "Struk & laporan lengkap", "Ekspor CSV"],
    popular: true,
  },
  {
    name: "Agency",
    amount: "Rp499.000",
    period: "per bulan",
    features: ["Kelola banyak klien", "Laporan gabungan", "White-label", "Komisi referral 15%"],
    popular: false,
  },
];

export default function HomePage() {
  return (
    <>
      <header className="container">
        <nav className="nav">
          <Link href="/" className="logo">
            <span className="logo-mark">K</span>
            Kasirku
          </Link>
          <div className="nav-links">
            <Link href="#fitur">Fitur</Link>
            <Link href="#cara">Cara kerja</Link>
            <Link href="#studi">Studi kasus</Link>
            <Link href="#harga">Harga</Link>
            <Link href="/login">Masuk</Link>
            <Link href="/register" className="btn btn-primary btn-sm">
              Mulai gratis
            </Link>
          </div>
        </nav>
      </header>

      <main>
        <section className="container hero">
          <span className="eyebrow">Untuk UMKM & agensi yang mendampinginya</span>
          <h1>Kasir beres, stok terkontrol, laporan langsung jadi.</h1>
          <p>
            Kasirku bikin warung dan kedai bisa jualan lebih cepat tanpa spreadsheet berantakan. Agensi
            bisa kelola banyak klien dari satu dashboard — dan dapat komisi dari setiap referral.
          </p>
          <div className="toolbar">
            <Link href="/register" className="btn btn-primary">
              Buat toko gratis →
            </Link>
            <Link href="#fitur" className="btn btn-ghost">
              Lihat fitur
            </Link>
          </div>
          <p className="small muted">Tanpa kartu kredit. Siap dipakai dalam 5 menit.</p>
        </section>

        <section className="container section" id="fitur">
          <h2>Satu aplikasi, semua yang counter butuh</h2>
          <p className="section-lead">Fokus pada hal yang bikin pemilik toko tidur tenang.</p>
          <div className="grid grid-3">
            {features.map((feature) => (
              <div className="card feature" key={feature.title}>
                <div className="icon" aria-hidden="true">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container section" id="cara">
          <h2>Mulai dalam 3 langkah</h2>
          <p className="section-lead">Tidak perlu install, tidak perlu server sendiri.</p>
          <div className="grid grid-3">
            {[
              ["1", "Daftar & buat toko", "Isi nama toko. outlet Kasir Utama langsung siap dipakai."],
              ["2", "Masukkan produk", "Nama, harga, modal, dan stok awal. Bisa import lewat CSV."],
              ["3", "Buka kasir & jualan", "Cari produk, terima bayar, stok otomatis berkurang."],
            ].map(([step, title, body]) => (
              <div className="card feature" key={step}>
                <span className="badge badge-ok">{step}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container section" id="studi">
          <h2>Contoh penggunaan nyata</h2>
          <p className="section-lead">Skenario demo yang bisa langsung kamu tunjukkan ke klien.</p>
          <div className="grid grid-3">
            <div className="card feature">
              <div className="icon" aria-hidden="true">☕</div>
              <h3>Kopi Senja</h3>
              <p>4 produk, 8 transaksi dalam 12 hari. Stok Kue Coklat otomatis masuk panel “stok menipis”.</p>
            </div>
            <div className="card feature">
              <div className="icon" aria-hidden="true">👕</div>
              <h3>Baju Rapi</h3>
              <p>Tote bag tinggal 2 pcs. Kasir langsung dapat peringatan, owner tinggal restock dari halaman Produk.</p>
            </div>
            <div className="card feature">
              <div className="icon" aria-hidden="true">🤝</div>
              <h3>Agensi Kreatif</h3>
              <p>Satu akun memantau 3 klien. Kode <strong>RANI15</strong> memberi komisi 15% dari omzet referral.</p>
            </div>
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>
            Angka di atas berasal dari data seed demo, bukan klaim klien nyata — transparan untuk material portofolio.
          </p>
        </section>

        <section className="container section" id="faq">
          <h2>Pertanyaan yang sering muncul</h2>
          <div className="grid grid-2">
            <div className="card">
              <h3>Bisa dipakai di HP?</h3>
              <p className="small muted">Bisa. Buka di browser, lalu “Tambah ke layar utama”. Antrean transaksi offline otomatis sinkron saat sinyal kembali.</p>
            </div>
            <div className="card">
              <h3>Bagaimana kalau stok habis barengan?</h3>
              <p className="small muted">Setiap pembayaran memakai transaksi database bersyarat: stok hanya berkurang kalau masih cukup. Tidak bisa minus.</p>
            </div>
            <div className="card">
              <h3>Agensi dapat apa?</h3>
              <p className="small muted">Dashboard gabungan semua klien, kode referral dengan komisi, dan akses multi-toko dari satu akun.</p>
            </div>
            <div className="card">
              <h3>Bisa pindah dari spreadsheet?</h3>
              <p className="small muted">Ya. Import produk lewat CSV, ekspor laporan kapan saja. Pendampingan import masuk paket setup.</p>
            </div>
          </div>
        </section>

        <section className="container section" id="harga">
          <h2>Harga yang jelas</h2>
          <p className="section-lead">Mulai gratis. Naik paket saat transaksi kamu bertambah.</p>
          <div className="grid grid-3">
            {plans.map((plan) => (
              <div className={`card price${plan.popular ? " popular" : ""}`} key={plan.name}>
                {plan.popular ? <span className="tag">Paling dipilih</span> : null}
                <h3>{plan.name}</h3>
                <div className="amount">
                  {plan.amount} <small>/ {plan.period}</small>
                </div>
                <ul>
                  {plan.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link href="/register" className={`btn ${plan.popular ? "btn-primary" : "btn-ghost"}`}>
                  Pilih {plan.name}
                </Link>
              </div>
            ))}
          </div>
          <p className="notice" style={{ marginTop: 18 }}>
            Butuh bantuan import produk dan pelatihan kasir? Paket setup Rp500.000 — gratis untuk 5 klien pertama.
          </p>
        </section>

        <section className="container section">
          <div className="card" style={{ textAlign: "center", padding: 44 }}>
            <span className="eyebrow">Mulai hari ini</span>
            <h2 style={{ fontSize: 30, margin: "0 0 10px" }}>Coba Kasirku 5 menit, bukan 5 hari.</h2>
            <p className="section-lead">Buat toko gratis. Kalau cocok, naik paket saat transaksi sudah berjalan.</p>
            <Link href="/register" className="btn btn-primary">Buat toko gratis →</Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} Kasirku. Dibuat untuk UMKM Indonesia.</div>
      </footer>
    </>
  );
}
