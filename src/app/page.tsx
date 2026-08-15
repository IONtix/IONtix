import Link from "next/link";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import {
  Search,
  Ticket,
  Activity,
  QrCode,
  TrendingUp,
  ShieldCheck,
  Zap,
  ArrowRight,
  Sparkles,
  MapPin,
  Calendar,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const events = await prisma.event.findMany({
    where: { isPublished: true },
    include: { categories: true },
    orderBy: { date: "asc" },
    take: 6,
  });

  // 12 Foto Olahraga Utama untuk Kolase Abstrak Penuh (Abstract Organic Mosaic)
  const sportsCollage = [
    {
      title: "Trail Run",
      image: "/hero/foto-1.jpg",
      aspect: "aspect-[3/4]",
      rotate: "-rotate-3",
      offset: "translate-y-8",
      rounded: "rounded-3xl",
    },
    {
      title: "Woodball",
      image: "/hero/foto-2.jpg",
      aspect: "aspect-square",
      rotate: "rotate-6",
      offset: "-translate-y-6",
      rounded: "rounded-[2.5rem]",
    },
    {
      title: "Renang & Aquathlon",
      image:
        "https://images.unsplash.com/photo-1600965962361-9035dbfd1c50?auto=format&fit=crop&w=800&q=80",
      aspect: "aspect-[4/5]",
      rotate: "-rotate-2",
      offset: "translate-y-12",
      rounded: "rounded-2xl",
    },
    {
      title: "Basket & Tim",
      image:
        "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=800&q=80",
      aspect: "aspect-[3/4]",
      rotate: "rotate-3",
      offset: "-translate-y-10",
      rounded: "rounded-[2rem]",
    },
    {
      title: "Triathlon & Ekstrem",
      image:
        "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=800&q=80",
      aspect: "aspect-square",
      rotate: "-rotate-6",
      offset: "translate-y-4",
      rounded: "rounded-3xl",
    },
    {
      title: "Senam & Yoga",
      image:
        "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
      aspect: "aspect-[4/5]",
      rotate: "rotate-4",
      offset: "-translate-y-4",
      rounded: "rounded-[2.5rem]",
    },
    {
      title: "Sepak Bola & Futsal",
      image: "/hero/foto-7.jpg",
      aspect: "aspect-[3/4]",
      rotate: "-rotate-4",
      offset: "translate-y-10",
      rounded: "rounded-2xl",
    },
    {
      title: "Tenis Lapangan",
      image:
        "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=800&q=80",
      aspect: "aspect-square",
      rotate: "rotate-6",
      offset: "-translate-y-12",
      rounded: "rounded-[2rem]",
    },
    {
      title: "Voli & Pantai",
      image: "/hero/foto-9.jpg",
      aspect: "aspect-[4/5]",
      rotate: "-rotate-3",
      offset: "translate-y-6",
      rounded: "rounded-3xl",
    },
    {
      title: "Trail Running",
      image:
        "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=800&q=80",
      aspect: "aspect-[3/4]",
      rotate: "rotate-2",
      offset: "-translate-y-8",
      rounded: "rounded-[2.5rem]",
    },
    {
      title: "Fitness & Crossfit",
      image:
        "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=800&q=80",
      aspect: "aspect-square",
      rotate: "-rotate-5",
      offset: "translate-y-14",
      rounded: "rounded-2xl",
    },
    {
      title: "Fun Run",
      image: "/hero/foto-12.jpg",
      aspect: "aspect-[4/5]",
      rotate: "rotate-5",
      offset: "-translate-y-2",
      rounded: "rounded-[2rem]",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans selection:bg-[#F57C00] selection:text-white text-slate-800 antialiased">
      {/* ========================================== */}
      {/* 1. ULTRA NAVBAR WITH DIRECT SEARCH */}
      {/* ========================================== */}
      <header className="sticky top-0 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl z-50 transition-all duration-300 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="IONtix Logo"
              className="h-9 sm:h-11 w-auto group-hover:scale-105 transition-transform duration-300 ease-out"
            />
          </Link>

          <div className="flex-1 max-w-xl mx-4 hidden md:block">
            <form action="#events" className="relative flex items-center group">
              <Search className="absolute left-4 w-4 h-4 text-slate-400 group-focus-within:text-[#F57C00] transition-colors" />
              <input
                type="text"
                placeholder="Cari event olahraga, lokasi, atau penyelenggara..."
                className="w-full bg-slate-100/90 border border-slate-200 hover:border-slate-300 focus:border-[#F57C00] focus:bg-white text-slate-800 text-sm font-medium pl-11 pr-4 py-2.5 rounded-full transition-all duration-300 outline-none shadow-inner focus:ring-4 focus:ring-[#F57C00]/10"
              />
            </form>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/login"
              className="hidden sm:flex items-center justify-center text-sm font-bold text-slate-700 bg-white border border-slate-200 hover:border-[#F57C00]/50 hover:text-[#F57C00] hover:bg-orange-50/50 transition-all duration-300 px-6 py-2.5 rounded-full shadow-sm hover:shadow-md"
            >
              Masuk
            </Link>
            <Link href="/cek-tiket">
              <Button className="rounded-full font-bold shadow-md shadow-[#F57C00]/20 text-xs sm:text-sm px-6 py-2.5 bg-[#F57C00] hover:bg-[#e06d00] active:scale-95 text-white transition-all duration-200 hover:shadow-lg hover:shadow-[#F57C00]/30">
                Cari Tiket <Ticket size={16} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="md:hidden px-4 py-3 bg-white border-b border-slate-200">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari event olahraga..."
            className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-sm font-medium pl-11 pr-4 py-2 rounded-full outline-none focus:border-[#F57C00]"
          />
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. HERO SECTION DENGAN ABSTRACT ORGANIC MOSAIC BACKGROUND */}
      {/* ========================================== */}
      <section className="relative py-28 lg:py-40 overflow-hidden border-b border-slate-200/60 flex items-center justify-center min-h-175">
        {/* Layer Background 1: Abstract Organic Mosaic (12 Foto Mengisi Seluruh Ruang) */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden opacity-[0.50] scale-105 p-4 sm:p-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5 h-full w-full items-center">
            {sportsCollage.map((item, index) => (
              <div
                key={index}
                className={`relative w-full ${item.aspect} ${item.rounded} ${item.rotate} ${item.offset} overflow-hidden shadow-2xl border border-white/60 bg-white hover:scale-105 transition-transform duration-500`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover filter saturate-[1.15] contrast-[1.05]"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Layer Background 2: Overlay Masking (Soft Fade untuk Keterbacaan Teks Maksimal) */}
        <div className="absolute inset-0 bg-linear-to-b from-white/75 via-slate-50/70 to-slate-100/90 backdrop-blur-[1px] z-0 pointer-events-none" />

        {/* Layer Background 3: Glowing Ambient Spheres */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-112.5 bg-linear-to-r from-[#F57C00]/30 via-amber-200/40 to-[#0B1B3D]/25 blur-[140px] rounded-full pointer-events-none z-0" />

        {/* Hero Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full text-center relative z-10 flex flex-col items-center">
          {/* Badge Headline */}
          <div className="relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-widest mb-8 cursor-default group overflow-hidden bg-white/80 backdrop-blur-md border border-[#F57C00]/40 shadow-[0_0_20px_rgba(245,124,0,0.15)] hover:shadow-[0_0_30px_rgba(245,124,0,0.3)] hover:-translate-y-1 transition-all duration-500">
            <div className="absolute inset-0 bg-linear-to-rrom-transparent via-white/80 to-transparent translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />

            <Sparkles
              size={16}
              className="text-[#F57C00] animate-pulse relative z-10"
            />
            <span className="relative z-10 bg-clip-text text-transparent bg-linear-to-r from-[#F57C00] to-[#E65100]">
              Platform Tiket & Manajemen Event Olahraga #1 di Indonesia
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-6xl lg:text-[5.25rem] font-black tracking-tight text-slate-900 leading-[1.04] mb-6 drop-shadow-sm">
            Pusat Event Olahraga <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-linear-to-r from-[#0B1B3D] via-[#F57C00] to-[#E65100]">
              Terbesar & Terpercaya
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-xl text-slate-800 font-medium max-w-2xl mx-auto leading-relaxed mb-10 drop-shadow-sm">
            Temukan berbagai kompetisi olahraga bergengsi atau kelola
            pendaftaran peserta secara profesional, aman, dan seamless dalam
            satu platform terpadu.
          </p>

          {/* Hero CTA Button (Center Single Button) */}
          <div className="flex justify-center mt-2 relative z-20">
            <Link href="/login" className="group block">
              <Button className="relative overflow-hidden px-10 py-7 rounded-full font-black text-lg sm:text-xl bg-linear-to-rrom-[#0B1B3D] via-[#142a5c] to-[#0B1B3D] hover:from-[#F57C00] hover:via-[#E65100] hover:to-[#F57C00] text-white border-none transition-all duration-500 hover:scale-105 active:scale-90 active:rotate-2 shadow-[0_15px_40px_-10px_rgba(11,27,61,0.5)] hover:shadow-[0_20px_50px_-10px_rgba(245,124,0,0.6)] bg-size-[200%_auto]over:bg-[position:right_center]">
                <span className="relative z-10 flex items-center gap-3">
                  Buat Event Sekarang
                  <ArrowRight
                    size={22}
                    className="group-hover:translate-x-2 transition-transform duration-300"
                  />
                </span>
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 3. EVENT DIRECTORY LIST */}
      {/* ========================================== */}
      <section id="events" className="px-4 sm:px-6 py-20 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4 border-b border-slate-200 pb-6">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
                Event Olahraga Mendatang
              </h2>
              <p className="text-slate-500 text-sm mt-1 font-medium">
                Pilih dan daftarkan diri Anda pada kompetisi resmi favorit Anda.
              </p>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-300 p-8 shadow-xs">
              <Activity className="mx-auto h-12 w-12 text-slate-300 mb-3" />
              <p className="text-slate-700 font-bold text-lg">
                Belum ada event yang dipublikasikan saat ini.
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Gelar event Anda sendiri dan manfaatkan fitur ticketing otomatis
                IONtix.
              </p>
              <Link href="/login" className="inline-block mt-6">
                <Button className="bg-[#0B1B3D] hover:bg-[#142a5c] text-white font-bold rounded-xl px-6 py-2.5 text-sm transition-transform active:scale-95">
                  Daftarkan Event Anda
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {events.map((event: any) => {
                const lowestPrice =
                  event.categories?.length > 0
                    ? Math.min(...event.categories.map((c: any) => c.price))
                    : 0;

                const formattedDate = new Date(event.date).toLocaleDateString(
                  "id-ID",
                  {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  },
                );

                let categoryLabel = "Olahraga Umum";
                const lowerTitle = event.title.toLowerCase();
                if (
                  lowerTitle.includes("run") ||
                  lowerTitle.includes("lari") ||
                  lowerTitle.includes("marathon")
                )
                  categoryLabel = "Lari & Marathon";
                if (
                  lowerTitle.includes("bike") ||
                  lowerTitle.includes("sepeda") ||
                  lowerTitle.includes("ride")
                )
                  categoryLabel = "Balap Sepeda";
                if (
                  lowerTitle.includes("swim") ||
                  lowerTitle.includes("renang")
                )
                  categoryLabel = "Renang";
                if (
                  lowerTitle.includes("basket") ||
                  lowerTitle.includes("futsal") ||
                  lowerTitle.includes("cup")
                )
                  categoryLabel = "Turnamen Tim";

                return (
                  <div
                    key={event.id}
                    className="bg-white rounded-3xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-2xl hover:-translate-y-2 hover:border-orange-500/30 transition-all duration-300 group flex flex-col"
                  >
                    <div className="h-56 bg-slate-100 relative overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={
                          event.imageUrl ||
                          "https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=800&q=80"
                        }
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                      />
                      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10 shadow-sm">
                        {categoryLabel}
                      </div>
                    </div>

                    <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
                      <div>
                        <h3 className="text-xl font-bold leading-tight text-slate-900 group-hover:text-[#F57C00] transition-colors duration-200 line-clamp-2">
                          {event.title}
                        </h3>

                        <div className="space-y-2.5 text-xs text-slate-500 font-medium mt-4">
                          <p className="flex items-center gap-2 text-slate-600">
                            <Calendar size={15} className="text-[#F57C00]" />{" "}
                            {formattedDate}
                          </p>
                          <p className="flex items-center gap-2 text-slate-600 line-clamp-1">
                            <MapPin
                              size={15}
                              className="text-[#F57C00] shrink-0"
                            />{" "}
                            {event.location}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div>
                          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                            Biaya Pendaftaran
                          </p>
                          <p className="font-black text-lg text-slate-900">
                            {lowestPrice > 0
                              ? `Rp ${lowestPrice.toLocaleString("id-ID")}`
                              : "Gratis"}
                          </p>
                        </div>
                        <Link href={`/checkout/${event.id}`}>
                          <Button className="rounded-xl font-bold px-5 py-2.5 bg-[#0B1B3D] hover:bg-[#F57C00] text-white transition-all duration-300 shadow-sm active:scale-95">
                            Daftar Sekarang
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ========================================== */}
      {/* 4. ENTERPRISE FEATURES SECTION */}
      {/* ========================================== */}
      <section className="py-20 bg-white border-t border-slate-200/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 mb-4">
              Solusi Infrastruktur{" "}
              <span className="text-[#F57C00]">Penyelenggara Event</span>
            </h2>
            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed">
              Teknologi terintegrasi yang memudahkan Event Organizer dalam
              mengelola pendaftaran, transaksi pembayaran, hingga validasi
              kehadiran peserta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-linear-to-br from-slate-900 via-[#0B1B3D] to-slate-900 text-white p-8 sm:p-12 rounded-3xl overflow-hidden relative shadow-lg group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#F57C00]/10 rounded-full blur-3xl pointer-events-none group-hover:bg-[#F57C00]/20 transition-all duration-500" />
              <div className="relative z-10 max-w-md">
                <div className="w-12 h-12 bg-[#F57C00] rounded-2xl flex items-center justify-center text-white mb-6 shadow-md group-hover:scale-110 transition-transform">
                  <QrCode size={26} />
                </div>
                <h3 className="text-2xl sm:text-3xl font-black mb-3">
                  Sistem Gate QR & Validasi Instan
                </h3>
                <p className="text-slate-300 font-normal leading-relaxed text-sm sm:text-base">
                  Proses pemindaian tiket berkecepatan tinggi tanpa hambatan
                  antrean saat penukaran Racepack maupun hari pelaksanaan event.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-8 rounded-3xl relative group hover:border-[#F57C00]/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp size={26} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Laporan Penjualan Real-Time
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Pantau statistik kuota tiket, pilihan kategori peserta, hingga
                pendapatan event secara langsung melalui panel kontrol EO.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 p-8 rounded-3xl relative group hover:border-[#F57C00]/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <ShieldCheck size={26} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Transaksi Aman & Terenkripsi
              </h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                Mendukung berbagai metode pembayaran otomatis yang terverifikasi
                demi keamanan transaksi seluruh peserta.
              </p>
            </div>

            <div className="md:col-span-2 bg-linear-to-br from-orange-50/90 via-amber-50/50 to-orange-50/90 border border-orange-200/80 p-8 sm:p-12 rounded-3xl relative flex flex-col justify-center shadow-xs hover:shadow-xl hover:border-orange-300 transition-all duration-300 group">
              <div className="w-12 h-12 bg-[#F57C00] rounded-2xl flex items-center justify-center text-white mb-6 shadow-md group-hover:scale-110 transition-transform">
                <Zap size={26} />
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 mb-3">
                Formulir Pendaftaran Fleksibel
              </h3>
              <p className="text-slate-600 font-normal leading-relaxed text-sm sm:text-base max-w-lg">
                Sesuaikan formulir kustom seperti ukuran jersey, data kontak
                darurat, rekam medis, hingga nomor lisensi sesuai standar
                kompetisi Anda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 5. CALL TO ACTION FOR EO */}
      {/* ========================================== */}
      <section className="py-16 bg-slate-100 relative">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="bg-[#0B1B3D] rounded-3xl p-8 sm:p-14 text-center shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#F57C00]/15 rounded-full blur-3xl pointer-events-none" />

            <h2 className="text-2xl sm:text-4xl font-black text-white mb-4 tracking-tight">
              Siap Menyelenggarakan Event Olahraga Anda?
            </h2>
            <p className="text-slate-300 text-sm sm:text-base font-normal max-w-2xl mx-auto mb-8 leading-relaxed">
              Bergabunglah dengan berbagai penyelenggara event profesional dan
              hadirkan pengalaman pendaftaran yang luar biasa bagi peserta Anda.
            </p>
            <Link href="/login">
              <Button className="bg-[#F57C00] hover:bg-[#e06d00] text-white rounded-xl px-8 py-6 text-base font-bold transition-all duration-300 shadow-lg shadow-orange-500/20 active:scale-90 active:rotate-1 hover:scale-105">
                Mulai Kelola Event <ArrowRight size={18} className="ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ========================================== */}
      {/* 6. CLEAN FOOTER */}
      {/* ========================================== */}
      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/logo.png"
                alt="IONtix Logo"
                className="h-9 w-auto mx-auto md:mx-0 mb-2"
              />
              <p className="text-slate-500 text-xs sm:text-sm max-w-sm">
                Platform Tiket & Manajemen Event Olahraga Terpadu di Indonesia.
              </p>
            </div>

            <div className="flex items-center gap-6 text-xs font-bold text-slate-600">
              <Link
                href="#events"
                className="hover:text-[#F57C00] transition-colors"
              >
                Cari Event
              </Link>
              <Link
                href="/cek-tiket"
                className="hover:text-[#F57C00] transition-colors"
              >
                Cari Tiket
              </Link>
              <Link
                href="/login"
                className="hover:text-[#F57C00] transition-colors"
              >
                Kemitraan EO
              </Link>
            </div>
          </div>
          <div className="border-t border-slate-100 mt-8 pt-6 text-center text-xs text-slate-400 font-medium">
            © 2026 IONtix — Sports Event Management Platform. All rights
            reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
