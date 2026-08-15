import prisma from "@/lib/prisma";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import DownloadActions from "./DownloadActions";

export const dynamic = "force-dynamic";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      category: {
        include: {
          event: true,
        },
      },
      runner: true,
      transaction: true,
    },
  });

  if (!ticket) {
    notFound();
  }

  const event = ticket.category.event;

  const formattedDate = new Date(event.date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Kode unik pendek (Contoh: ION-918179)
  const shortCode = ticket.qrCode.split("-").slice(0, 2).join("-");

  // Konversi QR Code ke Base64 (Penanganan CORS yang Aman & Cepat)
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${ticket.qrCode}&color=0B1B3D&bgcolor=FFFFFF`;
  let qrCodeUrl = qrApiUrl;
  try {
    const res = await fetch(qrApiUrl);
    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    qrCodeUrl = `data:image/png;base64,${base64}`;
  } catch (e) {
    console.error("Gagal konversi QR Code ke base64:", e);
  }

  return (
    <div className="min-h-screen bg-[#050A14] text-slate-100 py-8 px-3 sm:px-6 flex flex-col items-center justify-center relative overflow-x-hidden selection:bg-[#F57C00] selection:text-white">
      {/* Background Glow FX */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-85 sm:w-125 h-85 sm:h-125 bg-[#F57C00]/10 blur-[140px] rounded-full pointer-events-none z-0" />

      {/* Top Header Navigation */}
      <div className="w-full max-w-90 sm:max-w-md mb-5 flex items-center justify-between z-10">
        <Link href="/" className="group flex items-center gap-2">
          <img
            src="/logo.png"
            alt="IONtix Logo"
            className="h-6 sm:h-7 w-auto object-contain brightness-200"
          />
        </Link>
        <span className="text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center gap-1.5 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          VERIFIED PASS
        </span>
      </div>

      {/* ============================================================ */}
      {/* PROFESSIONAL VIP TICKET PASS (MASTERPIECE CARD) */}
      {/* ============================================================ */}
      <div
        id="ticket-node"
        className="w-full max-w-90 sm:max-w-md bg-linear-to-b from-[#0F172A] via-[#0D1527] to-[#0A0F1D] rounded-[2.2rem] border border-slate-700/70 shadow-2xl overflow-hidden relative z-10"
      >
        {/* Top Metallic Gold Accent Bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-amber-500 via-[#F57C00] to-emerald-500" />

        {/* TICKET HEADER / BRANDING */}
        <div className="px-5 py-4 bg-slate-900/80 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="IONtix"
              className="h-5 sm:h-6 w-auto object-contain brightness-200"
            />
            <span className="text-slate-600">|</span>
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              OFFICIAL ENTRY TICKET
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md border border-amber-400/25">
            #{ticket.id.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* EVENT MAIN DETAILS */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Badge & Event Title */}
          <div>
            <div className="inline-flex items-center gap-1.5 bg-linear-to-r from-[#F57C00] to-amber-600 text-white text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-wider shadow-md shadow-orange-500/20 mb-2.5">
              <span>KATEGORI</span>
              <span className="opacity-40">•</span>
              <span>{ticket.category.name}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight uppercase tracking-tight">
              {event.title}
            </h1>
          </div>

          {/* Event Meta Grid */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80">
            <div>
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                TANGGAL EVENT
              </p>
              <p className="font-bold text-slate-100 mt-0.5 uppercase text-[10px] sm:text-[11px] leading-tight">
                {formattedDate}
              </p>
            </div>
            <div className="border-l border-slate-800/80 pl-3">
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                LOKASI VENUE
              </p>
              <p className="font-bold text-slate-100 mt-0.5 uppercase text-[10px] sm:text-[11px] leading-tight line-clamp-2">
                {event.location}
              </p>
            </div>
          </div>

          {/* Participant Info Card */}
          <div className="bg-[#121B2E] p-4 rounded-xl border border-slate-700/60 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                NAMA PESERTA
              </p>
              <p className="text-sm sm:text-base font-black text-white mt-0.5 uppercase tracking-wide truncate">
                {ticket.runner.name}
              </p>
              <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">
                {ticket.runner.email}
              </p>
            </div>
            <div className="text-right pl-3 border-l border-slate-700/80 shrink-0">
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.15em] text-slate-400">
                STATUS
              </p>
              <span className="inline-block mt-1 text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20 uppercase tracking-wider">
                VALID
              </span>
            </div>
          </div>
        </div>

        {/* REALISTIC TICKET CUTOUT & DIVIDER LINE */}
        <div className="relative my-1">
          <div className="border-t-2 border-dashed border-slate-700/80 w-full" />
          <div className="absolute -top-3 -left-3.5 w-6 h-6 bg-[#050A14] rounded-full border-r border-slate-700/60" />
          <div className="absolute -top-3 -right-3.5 w-6 h-6 bg-[#050A14] rounded-full border-l border-slate-700/60" />
        </div>

        {/* CHECK-IN & QR STUB SECTION */}
        <div className="p-5 sm:p-6 bg-[#090F1C] flex flex-col items-center text-center space-y-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">
              SECURE QR ACCESS
            </p>
            <p className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-medium">
              Tunjukkan QR Code ini kepada panitia saat registrasi
            </p>
          </div>

          {/* QR Code Container */}
          <div className="p-3.5 bg-white rounded-2xl shadow-xl border-2 border-amber-400/30">
            <img
              src={qrCodeUrl}
              alt="QR Code"
              className="w-32 h-32 sm:w-36 sm:h-36 object-contain rounded-lg"
            />
          </div>

          {/* Unique Ticket Code */}
          <div className="w-full">
            <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">
              KODE TIKET UNIK
            </p>
            <div className="bg-[#050A14] py-2 px-4 rounded-xl border border-slate-800/90 w-full">
              <p className="font-mono text-xs sm:text-sm font-black text-amber-400 tracking-[0.25em]">
                {shortCode}
              </p>
            </div>
          </div>

          {/* Official Stamp / Watermark Text */}
          <p className="text-[8px] font-mono text-slate-500 uppercase tracking-[0.25em] pt-1">
            IONTIX OFFICIAL E-TICKET • AUTHENTIC
          </p>
        </div>
      </div>
      {/* ============================================================ */}

      {/* ACTION BUTTONS */}
      <div className="mt-5 w-full max-w-90 sm:max-w-md space-y-2.5 z-10 flex flex-col">
        <DownloadActions ticketId={ticket.id} />

        <Link href="/" className="w-full">
          <Button
            variant="ghost"
            className="w-full py-4 rounded-2xl font-black text-[10px] tracking-widest text-slate-400 hover:text-white hover:bg-white/5 transition-all uppercase"
          >
            KEMBALI KE BERANDA
          </Button>
        </Link>
      </div>
    </div>
  );
}
