import Link from "next/link";

type IconName = "receipt" | "box" | "chart" | "building" | "lock" | "device";

function Icon({ name }: { name: IconName }) {
  const paths: Record<IconName, React.ReactNode> = {
    receipt: (
      <>
        <path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z" />
        <path d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
    box: (
      <>
        <path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9Z" />
        <path d="m3 7.5 9 4.5 9-4.5M12 12v9" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V4M4 20h16" />
        <path d="m7 15 4-5 3 3 5-7" />
      </>
    ),
    building: (
      <>
        <path d="M4 21V6l8-3 8 3v15" />
        <path d="M9 21v-5h6v5M8 9h.01M12 9h.01M16 9h.01M8 13h.01M16 13h.01" />
      </>
    ),
    lock: (
      <>
        <rect x="4" y="10" width="16" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" />
      </>
    ),
    device: (
      <>
        <rect x="7" y="2" width="10" height="20" rx="2" />
        <path d="M11 18h2" />
      </>
    ),
  };
  return (
    <span className="feature-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </svg>
    </span>
  );
}

const features: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "receipt",
    title: "Kasir yang tidak bikin antre panjang",
    body: "Cari produk, pilih member, atur diskon, terima bayar, lalu struk langsung dikirim ke email pembeli.",
  },
  {
    icon: "box",
    title: "Stok yang bisa dipercaya",
    body: "Tiap transaksi mengurangi stok secara aman. Riwayat mutasi tercatat, stok menipis muncul sebelum kehabisan.",
  },
  {
    icon: "chart",
    title: "Laporan tanpa drama",
    body: "Omzet harian, laba kotor, dan produk terlaris tersaji rapi. Ekspor CSV kalau perlu dibawa ke accountant.",
  },
  {
    icon: "building",
    title: "Satu dashboard untuk banyak klien",
    body: "Agensi memantau semua toko, mengundang kasir, dan memantau komisi referral dari satu tempat.",
  },
  {
    icon: "lock",
    title: "Akses yang jelas dan teraudit",
    body: "Peran owner, manager, dan kasir dibedakan. Sesi perangkat bisa dicabut, setiap perubahan tercatat.",
  },
  {
    icon: "device",
    title: "Nyaman di HP dan tablet",
    body: "Pasang ke layar utama seperti aplikasi. Transaksi saat sinyal mati masuk antrean dan sinkron otomatis.",
  },
];

const plans = [
  {
    name: "Gratis",
    amount: "Rp0",
    period: "selamanya",
    features: ["1 outlet", "100 transaksi / bulan", "3 produk aktif", "Laporan dasar"],
    featured: false,
  },
  {
    name: "Pro",
    amount: "Rp199.000",
    period: "per outlet / bulan",
    features: ["Produk & stok tanpa batas", "Member otomatis dari email", "Struk cetak & email", "Laporan lengkap + CSV"],
    featured: true,
  },
  {
    name: "Agency",
    amount: "Rp499.000",
    period: "per bulan",
    features: ["Kelola banyak klien", "Laporan gabungan", "Kode referral + komisi 15%", "Prioritas pendampingan"],
    featured: false,
  },
];

const faqs = [
  {
    q: "Apakah bisa dipakai tanpa install aplikasi?",
    a: "Bisa. Kasirku berjalan di browser dan bisa ditambahkan ke layar utama HP atau tablet. Tidak perlu download dari play store, tidak perlu server sendiri.",
  },
  {
    q: "Bagaimana kalau dua kasir menjual produk yang sama bersamaan?",
    a: "Setiap pembayaran memakai transaksi database bersyarat: stok hanya berkurang kalau jumlahnya masih cukup. Kalau tidak, transaksi ditolak — stok tidak pernah minus.",
  },
  {
    q: "Kenapa agensi yang jadi pembeli utamanya?",
    a: "Karena agensi sudah dipercaya UMKM. Mereka bisa menyiapkan toko, melatih kasir, lalu mengelola banyak klien dari satu akun. Kami menyediakan dashboard dan komisi referral untuk model itu.",
  },
  {
    q: "Bisa pindah dari spreadsheet?",
    a: "Ya. Import produk lewat CSV, lalu ekspor laporan kapan saja. Paket setup Rp500.000 sudah termasuk bantuan import dan pelatihan singkat.",
  },
];

export default function HomePage() {
  return (
    <>
      <header className="site-header">
        <div className="container">
          <nav className="nav">
            <Link href="/" className="logo">
              <span className="logo-mark">K</span>
              Kasirku
            </Link>
            <div className="nav-links">
              <Link href="#fitur">Fitur</Link>
              <Link href="#cara">Cara kerja</Link>
              <Link href="#studi">Contoh penggunaan</Link>
              <Link href="#harga">Harga</Link>
            </div>
            <div className="nav-cta">
              <Link href="/login" className="small muted">Masuk</Link>
              <Link href="/register" className="btn btn-primary btn-sm">Mulai gratis</Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="container hero">
          <div className="hero-copy">
            <span className="eyebrow">Kasir & stok untuk UMKM Indonesia</span>
            <h1>Counter rapi, stok pasti, <mark>laporan langsung jadi.</mark></h1>
            <p>
              Kasirku membantu kedai dan warung menjual lebih cepat tanpa spreadsheet berantakan.
              Agensi bisa mengelola banyak klien dari satu dashboard — dan mendapat komisi dari setiap referral.
            </p>
            <div className="toolbar">
              <Link href="/register" className="btn btn-primary">Buat toko gratis →</Link>
              <Link href="#fitur" className="btn btn-ghost">Lihat fiturnya</Link>
            </div>
            <p className="hero-note">Tanpa kartu kredit. Bisa dipakai dalam 5 menit.</p>
          </div>

          <div className="mock" aria-hidden="true">
            <div className="mock-bar">
              <i></i><i></i><i></i><span>Kasir · Kopi Senja</span>
            </div>
            <div className="mock-body">
              <div className="mock-left">
                <div className="mock-title">Produk</div>
                <div className="mock-search">Cari nama atau SKU…</div>
                <div className="mock-item"><span>Kopi Americano <b>18rb</b></span><span className="plus">+</span></div>
                <div className="mock-item"><span>Kopi Latte <b>22rb</b></span><span className="plus">+</span></div>
                <div className="mock-item"><span>Croissant <b>15rb</b></span><span className="plus">+</span></div>
                <div className="mock-item"><span>Teh Hangat <b>8rb</b></span><span className="plus">+</span></div>
              </div>
              <div className="mock-right">
                <div className="mock-title">Keranjang</div>
                <div className="mock-cart-row"><span>2× Americano</span><span>36.000</span></div>
                <div className="mock-cart-row"><span>1× Croissant</span><span>15.000</span></div>
                <div className="mock-total"><span>Total</span><span>51.000</span></div>
                <div className="mock-pay">Bayar 51.000</div>
                <p className="small muted" style={{ fontSize: 10, marginTop: 12 }}>Stok otomatis berkurang setelah bayar.</p>
              </div>
            </div>
            <div className="mock-foot">
              <span>Omzet <b>Rp306.000</b></span>
              <span>Transaksi <b>8</b></span>
              <span>Stok menipis <b>1</b></span>
            </div>
          </div>
        </section>

        <div className="container">
          <div className="stat-strip">
            <div><b>5 menit</b><span>siap pakai sejak daftar</span></div>
            <div><b>0 panci</b><span>tanpa server & install ribet</span></div>
            <div><b>1 dashboard</b><span>untuk semua toko klien</span></div>
          </div>
        </div>

        <section className="container section" id="fitur">
          <div className="section-head">
            <span className="section-index">01 / Fitur</span>
            <div>
              <h2>Yang benar-benar dipakai setiap hari</h2>
              <p className="section-lead">Bukan daftar fitur untuk brosur. Ini alur yang kasir dan owner jalani dari pagi sampai tutup toko.</p>
            </div>
          </div>
          <div className="feature-list">
            {features.map((feature) => (
              <article className="feature-item" key={feature.title}>
                <Icon name={feature.icon} />
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="container section" id="cara">
          <div className="section-head">
            <span className="section-index">02 / Cara kerja</span>
            <div>
              <h2>Tiga langkah, selesai</h2>
              <p className="section-lead">Tidak perlu tim IT. Tidak perlu migrasi besar-besaran.</p>
            </div>
          </div>
          <div className="steps">
            <article className="step">
              <span className="step-num">LANGKAH 01</span>
              <h3>Daftar & buat toko</h3>
              <p>Isi nama toko. Outlet “Kasir Utama” langsung siap dipakai tanpa konfigurasi tambahan.</p>
            </article>
            <article className="step">
              <span className="step-num">LANGKAH 02</span>
              <h3>Masukkan produk</h3>
              <p>Isi harga, modal, dan stok awal. Datanya banyak? Import lewat CSV dengan contoh yang sudah disediakan.</p>
            </article>
            <article className="step">
              <span className="step-num">LANGKAH 03</span>
              <h3>Buka kasir & jualan</h3>
              <p>Cari produk, terima pembayaran, stok otomatis berkurang. Laporan langsung terisi sendiri.</p>
            </article>
          </div>
        </section>

        <section className="container section" id="studi">
          <div className="section-head">
            <span className="section-index">03 / Contoh</span>
            <div>
              <h2>Lihat seperti apa dipakainya</h2>
              <p className="section-lead">Skenario dari data demo yang bisa langsung kamu buka dan tunjukkan ke klien.</p>
            </div>
          </div>
          <div className="cases">
            <article className="case-row">
              <h3>Kopi Senja</h3>
              <p>Empat produk, delapan transaksi. Stok Kue Coklat masuk panel “stok menipis” begitu menyentuh batas minimum.</p>
              <div className="case-metric"><b>Rp306rb</b><span>omzet demo</span></div>
            </article>
            <article className="case-row">
              <h3>Baju Rapi</h3>
              <p>Tote bag tinggal dua potong. Kasir memberi peringatan, owner tinggal klik “+ Stok” dan mutasi tercatat otomatis.</p>
              <div className="case-metric"><b>2 pcs</b><span>stok menipis</span></div>
            </article>
            <article className="case-row">
              <h3>Agensi Kreatif</h3>
              <p>Satu akun memantau tiga klien. Kode <strong>RANI15</strong> memberi komisi 15% dari omzet referral yang masuk.</p>
              <div className="case-metric"><b>15%</b><span>komisi referral</span></div>
            </article>
          </div>
          <p className="disclaimer">Angka di atas berasal dari data seed demo, bukan klaim klien nyata — sengaja kami transparankan untuk material portofolio.</p>
        </section>

        <section className="container section" id="faq">
          <div className="faq">
            <div>
              <span className="section-index">04 / Pertanyaan</span>
              <h2>Yang biasanya ditanya calon pembeli</h2>
              <p className="section-lead">Kalau ada yang belum terjawab, aku bisa bantu jelaskan langsung saat demo.</p>
            </div>
            <div>
              {faqs.map((faq) => (
                <details key={faq.q}>
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="container section" id="harga">
          <div className="section-head">
            <span className="section-index">05 / Harga</span>
            <div>
              <h2>Harga jelas, tanpa biaya tersembunyi</h2>
              <p className="section-lead">Mulai gratis. Naik paket saat transaksi sudah berjalan.</p>
            </div>
          </div>
          <div className="pricing">
            {plans.map((plan) => (
              <article className={`price-card${plan.featured ? " featured" : ""}`} key={plan.name}>
                <span className="price-name">{plan.name}</span>
                <div className="price-amount">{plan.amount} <small>/ {plan.period}</small></div>
                <ul className="price-features">
                  {plan.features.map((item) => <li key={item}>{item}</li>)}
                </ul>
                <Link href="/register" className={`btn ${plan.featured ? "btn-accent" : "btn-ghost"}`}>
                  Pilih {plan.name}
                </Link>
              </article>
            ))}
          </div>
          <div className="setup-note">
            <span><b>Butuh bantuan mulai?</b> Paket setup Rp500.000 mencakup import produk dan pelatihan kasir.</span>
            <span className="small muted">Gratis untuk 5 klien pertama agensi.</span>
          </div>
        </section>

        <section className="container section">
          <div className="cta-band">
            <div>
              <h2>Coba Kasirku 5 menit, bukan 5 hari.</h2>
              <p>Buat toko gratis. Kalau cocok, naik paket saat transaksi sudah berjalan.</p>
            </div>
            <Link href="/register" className="btn btn-accent btn-sm">Buat toko gratis →</Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container footer-inner">
          <div><strong>Kasirku</strong> · dibuat untuk UMKM Indonesia.</div>
          <div>
            <Link href="/login">Masuk</Link> &nbsp;·&nbsp; <Link href="/register">Daftar</Link> &nbsp;·&nbsp; <Link href="#harga">Harga</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
