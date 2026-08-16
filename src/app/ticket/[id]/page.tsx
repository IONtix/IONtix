import Image from "next/image";
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
      user: true,
      participant: true,
      transaction: true,
    },
  });

  if (!ticket) {
    notFound();
  }

  if (!ticket.category?.event) {
    notFound();
  }

  const event = ticket.category.event;

  const formattedDate = new Date(event.date).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const shortCode = ticket.qrCode.split("-").slice(0, 2).join("-");

  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    ticket.qrCode,
  )}&color=0B1B3D&bgcolor=FFFFFF`;

  let qrCodeUrl = qrApiUrl;

  try {
    const res = await fetch(qrApiUrl);
    if (!res.ok) {
      throw new Error(`QR service returned ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    qrCodeUrl = `data:image/png;base64,${base64}`;
  } catch (error) {
    console.error("Gagal konversi QR Code ke base64:", error);
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-x-hidden bg-[#050A14] px-3 py-8 text-slate-100 selection:bg-[#F57C00] selection:text-white sm:px-6">
      {/* Background Glow FX */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 h-85 w-85 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#F57C00]/10 blur-[140px] sm:h-125 sm:w-125" />

      {/* Top Header Navigation */}
      <div className="z-10 mb-5 flex w-full max-w-90 items-center justify-between sm:max-w-md">
        <Link href="/" className="group flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="IONtix Logo"
            width={160}
            height={48}
            priority
            className="h-6 w-auto object-contain brightness-200 sm:h-7"
          />
        </Link>

        <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400 shadow-sm">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          VERIFIED PASS
        </span>
      </div>

      {/* PROFESSIONAL VIP TICKET PASS */}
      <div
        id="ticket-node"
        className="relative z-10 w-full max-w-90 overflow-hidden rounded-[2.2rem] border border-slate-700/70 bg-linear-to-b from-[#0F172A] via-[#0D1527] to-[#0A0F1D] shadow-2xl sm:max-w-md"
      >
        {/* Top Metallic Gold Accent Bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-amber-500 via-[#F57C00] to-emerald-500" />

        {/* TICKET HEADER / BRANDING */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="IONtix"
              width={140}
              height={42}
              priority
              className="h-5 w-auto object-contain brightness-200 sm:h-6"
            />

            <span className="text-slate-600">|</span>

            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-[9px]">
              OFFICIAL ENTRY TICKET
            </span>
          </div>

          <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2.5 py-1 font-mono text-[9px] font-bold text-amber-400">
            #{ticket.id.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* EVENT MAIN DETAILS */}
        <div className="space-y-4 p-5 sm:p-6">
          {/* Badge & Event Title */}
          <div>
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-lg bg-linear-to-r from-[#F57C00] to-amber-600 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-white shadow-md shadow-orange-500/20 sm:text-[10px]">
              <span>KATEGORI</span>
              <span className="opacity-40">•</span>
              <span>{ticket.category.name}</span>
            </div>

            <h1 className="text-xl font-black uppercase leading-tight tracking-tight text-white sm:text-2xl">
              {event.title}
            </h1>
          </div>

          {/* Event Meta Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5">
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 sm:text-[9px]">
                TANGGAL EVENT
              </p>
              <p className="mt-0.5 text-[10px] font-bold uppercase leading-tight text-slate-100 sm:text-[11px]">
                {formattedDate}
              </p>
            </div>

            <div className="border-l border-slate-800/80 pl-3">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 sm:text-[9px]">
                LOKASI VENUE
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] font-bold uppercase leading-tight text-slate-100 sm:text-[11px]">
                {event.location}
              </p>
            </div>
          </div>

          {/* Participant Info Card */}
          <div className="flex items-center justify-between rounded-xl border border-slate-700/60 bg-[#121B2E] p-4">
            <div className="min-w-0 pr-2">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 sm:text-[9px]">
                NAMA PESERTA
              </p>

              <p className="mt-0.5 truncate text-sm font-black uppercase tracking-wide text-white sm:text-base">
                {ticket.user?.name ?? ticket.participant?.fullName ?? "Peserta"}
              </p>

              <p className="mt-0.5 truncate font-mono text-[10px] text-slate-400">
                {ticket.user?.email ?? ticket.participant?.email ?? "-"}
              </p>
            </div>

            <div className="shrink-0 border-l border-slate-700/80 pl-3 text-right">
              <p className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 sm:text-[9px]">
                STATUS
              </p>

              <span className="mt-1 inline-block rounded border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                VALID
              </span>
            </div>
          </div>
        </div>

        {/* REALISTIC TICKET CUTOUT */}
        <div className="relative my-1">
          <div className="w-full border-t-2 border-dashed border-slate-700/80" />
          <div className="absolute -left-3.5 -top-3 h-6 w-6 rounded-full border-r border-slate-700/60 bg-[#050A14]" />
          <div className="absolute -right-3.5 -top-3 h-6 w-6 rounded-full border-l border-slate-700/60 bg-[#050A14]" />
        </div>

        {/* CHECK-IN & QR STUB SECTION */}
        <div className="flex flex-col items-center space-y-4 bg-[#090F1C] p-5 text-center sm:p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">
              SECURE QR ACCESS
            </p>
            <p className="mt-0.5 text-[9px] font-medium uppercase tracking-wider text-slate-400 sm:text-[10px]">
              Tunjukkan QR Code ini kepada panitia saat registrasi
            </p>
          </div>

          {/* QR Code Container */}
          <div className="rounded-2xl border-2 border-amber-400/30 bg-white p-3.5 shadow-xl">
            <Image
              src={qrCodeUrl}
              alt="QR Code"
              width={144}
              height={144}
              unoptimized
              className="h-32 w-32 rounded-lg object-contain sm:h-36 sm:w-36"
            />
          </div>

          {/* Unique Ticket Code */}
          <div className="w-full">
            <p className="mb-1 text-[8px] font-black uppercase tracking-[0.2em] text-slate-400 sm:text-[9px]">
              KODE TIKET UNIK
            </p>

            <div className="w-full rounded-xl border border-slate-800/90 bg-[#050A14] px-4 py-2">
              <p className="font-mono text-xs font-black tracking-[0.25em] text-amber-400 sm:text-sm">
                {shortCode}
              </p>
            </div>
          </div>

          <p className="pt-1 font-mono text-[8px] uppercase tracking-[0.25em] text-slate-500">
            IONTIX OFFICIAL E-TICKET • AUTHENTIC
          </p>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div className="z-10 mt-5 flex w-full max-w-90 flex-col space-y-2.5 sm:max-w-md">
        <DownloadActions ticketId={ticket.id} />

        <Link href="/" className="w-full">
          <Button
            variant="ghost"
            className="w-full rounded-2xl py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all hover:bg-white/5 hover:text-white"
          >
            KEMBALI KE BERANDA
          </Button>
        </Link>
      </div>
    </div>
  );
}
