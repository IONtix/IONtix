import Link from "next/link";
import Image from "next/image";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getEventStatusMeta } from "@/lib/events/status";
import {
  ChevronLeft,
  Edit3,
  Calendar,
  MapPin,
  Tag,
  Layers,
  ShieldAlert,
  User,
  Phone,
  Ticket,
  ClipboardList,
} from "lucide-react";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  // Ambil detail event beserta relasinya
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      categories: true,
      eo: true,
    },
  });

  if (!event) {
    notFound();
  }

  // Format Tanggal
  const eventDateObj = new Date(event.date);
  const formattedDate = eventDateObj.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const formattedTime = eventDateObj.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const imageUrl = event.imageUrl || null;
  const logoUrl = event.logoUrl || null;
  const statusMeta = getEventStatusMeta(event.status);

  // Parse Custom Fields dari JSON
  const customFields = Array.isArray(event.customFields)
    ? (event.customFields as unknown as Array<{ label?: string; type?: string; required?: boolean }>)
    : [];

  const totalCapacity = event.categories.reduce(
    (acc, cat) => acc + (cat.capacity || 0),
    0,
  );

  return (
    <div className="min-h-screen bg-[#0A0E17] text-slate-200 p-6 sm:p-8 md:p-10 font-sans selection:bg-[#F57C00] selection:text-white">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* HEADER BAR: NAVIGATION & ACTIONS */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#1E293B] pb-6">
          <Link
            href="/dashboard/events"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-[#F57C00] transition-colors text-sm font-bold uppercase tracking-widest"
          >
            <ChevronLeft size={18} />
            Kembali ke Manajemen Event
          </Link>

          <Link
            href={`/dashboard/events/create?edit=${event.id}`}
            className="bg-[#1E293B] hover:bg-[#F57C00] text-white border border-[#2A374A] hover:border-[#F57C00] px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-md group cursor-pointer"
          >
            <Edit3
              size={16}
              className="text-[#F57C00] group-hover:text-white transition-colors"
            />
            Edit Detail Event
          </Link>
        </div>

        {/* HERO BANNER & BASIC INFO */}
        <div className="bg-[#131A2B] border border-[#1E293B] rounded-3xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12">
          {/* BANNER POSTER */}
          <div className="lg:col-span-5 relative bg-[#0A0E17] min-h-70 sm:min-h-90 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-[#1E293B]">
            {imageUrl ? (
              <Image
                src={imageUrl}
                width={1200}
                height={700}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-6 text-slate-500 font-bold uppercase tracking-widest text-xs">
                Tidak Ada Banner Poster
              </div>
            )}
            <div className="absolute top-4 left-4 z-10">
              <span
                title={statusMeta.description}
                className="px-3 py-1 bg-black/60 border border-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md"
              >
                {statusMeta.label}
              </span>
            </div>
            <div className="absolute top-4 right-4 z-10">
              <span className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={12} className="text-[#F57C00]" />
                {event.category || "RUN"}
              </span>
            </div>
          </div>

          {/* EVENT SUMMARY DETAIL */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                {logoUrl ? (
                  <Image
                    src={logoUrl}
                    width={80}
                    height={80}
                    alt="Logo EO"
                    className="w-10 h-10 rounded-full border-2 border-[#1E293B] object-cover bg-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full border-2 border-[#1E293B] bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-500">
                    EO
                  </div>
                )}
                <p className="text-xs font-bold text-[#F57C00] uppercase tracking-widest">
                  Penyelenggara: {event.eo?.name || "Organizer Resmi"}
                </p>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-4 leading-snug">
                {event.title}
              </h1>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                  <div className="p-2 rounded-xl bg-[#1E293B] text-[#3B82F6] border border-[#2A374A]">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                      Tanggal & Waktu
                    </p>
                    <p>
                      {formattedDate} • {formattedTime} WIB
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm font-semibold text-slate-300">
                  <div className="p-2 rounded-xl bg-[#1E293B] text-[#10B981] border border-[#2A374A]">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-wider">
                      Lokasi Venue
                    </p>
                    <p>{event.location || "Online/Offline"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* QUICK STATS CARD */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#1E293B]">
              <div className="bg-[#0A0E17] p-3.5 rounded-2xl border border-[#1E293B]">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                  Kategori Tiket
                </p>
                <p className="text-lg font-black text-white">
                  {event.categories.length} Tiket
                </p>
              </div>
              <div className="bg-[#0A0E17] p-3.5 rounded-2xl border border-[#1E293B]">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-wider">
                  Total Kuota
                </p>
                <p className="text-lg font-black text-[#F57C00]">
                  {totalCapacity} Peserta
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* KOLOM KIRI (7 KOLOM) */}
          <div className="lg:col-span-7 space-y-8">
            {/* DESKRIPSI EVENT */}
            <section className="bg-[#131A2B] border border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <Tag size={18} className="text-[#F57C00]" /> Deskripsi Event
              </h2>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-medium bg-[#0A0E17] p-5 rounded-2xl border border-[#1E293B]">
                {event.description || "Tidak ada deskripsi tambahan."}
              </div>
            </section>

            {/* ATURAN EVENT */}
            {event.rules && (
              <section className="bg-[#131A2B] border border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldAlert size={18} className="text-[#F57C00]" /> Peraturan
                  & Ketentuan
                </h2>
                <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line font-medium bg-[#0A0E17] p-5 rounded-2xl border border-[#1E293B]">
                  {event.rules}
                </div>
              </section>
            )}

            {/* CUSTOM FORM PESERTA */}
            {customFields.length > 0 && (
              <section className="bg-[#131A2B] border border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <ClipboardList size={18} className="text-[#F57C00]" /> Form
                    Pendaftaran Tambahan
                  </h2>
                </div>
                <div className="bg-[#0A0E17] p-5 rounded-2xl border border-[#1E293B] space-y-4">
                  {customFields.map((field, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center border-b border-[#1E293B] pb-3 last:border-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">
                          {field.label}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">
                          Tipe: {field.type}
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-1 rounded ${field.required ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-slate-800 text-slate-400 border border-slate-700"}`}
                      >
                        {field.required ? "Wajib Isi" : "Opsional"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* KONTAK PANITIA */}
            {(event.contactName || event.contactPhone) && (
              <section className="bg-[#131A2B] border border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-4 shadow-xl">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <User size={18} className="text-[#F57C00]" /> Narahubung /
                  Contact Person
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.contactName && (
                    <div className="bg-[#0A0E17] p-4 rounded-2xl border border-[#1E293B]">
                      <p className="text-[10px] text-slate-500 font-black uppercase">
                        Nama Kontak
                      </p>
                      <p className="text-sm font-bold text-white mt-1">
                        {event.contactName}
                      </p>
                    </div>
                  )}
                  {event.contactPhone && (
                    <div className="bg-[#0A0E17] p-4 rounded-2xl border border-[#1E293B]">
                      <p className="text-[10px] text-slate-500 font-black uppercase">
                        Nomor WhatsApp
                      </p>
                      <p className="text-sm font-bold text-[#10B981] mt-1 flex items-center gap-2">
                        <Phone size={14} /> {event.contactPhone}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* KOLOM KANAN: LIST TIKET (5 KOLOM) */}
          <div className="lg:col-span-5 space-y-8">
            <section className="bg-[#131A2B] border border-[#1E293B] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl sticky top-8">
              <div className="flex justify-between items-center border-b border-[#1E293B] pb-4">
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Layers size={18} className="text-[#F57C00]" /> Kategori Tiket
                </h2>
                <span className="text-xs font-bold text-slate-400">
                  {event.categories.length} Jenis Tiket
                </span>
              </div>

              {event.categories.length === 0 ? (
                <div className="p-8 text-center bg-[#0A0E17] rounded-2xl border border-dashed border-[#1E293B]">
                  <Ticket size={32} className="mx-auto text-slate-600 mb-2" />
                  <p className="text-slate-500 text-xs font-bold">
                    Belum ada kategori tiket yang dibuat.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {event.categories.map((cat, idx) => (
                    <div
                      key={cat.id}
                      className="p-5 bg-[#0A0E17] border border-[#1E293B] rounded-2xl space-y-3 relative overflow-hidden group hover:border-[#F57C00]/40 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black text-[#F57C00] uppercase bg-[#F57C00]/10 px-2.5 py-0.5 rounded-md border border-[#F57C00]/20">
                            Kategori #{idx + 1}
                          </span>
                          <h3 className="text-base font-extrabold text-white mt-1">
                            {cat.name}
                          </h3>
                        </div>
                        <span className="text-base font-black text-[#10B981]">
                          Rp {cat.price.toLocaleString("id-ID")}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-xs text-slate-400 font-medium pt-2 border-t border-[#1E293B]/60">
                        <span>Kuota Peserta:</span>
                        <span className="font-bold text-white bg-[#1E293B] px-2.5 py-1 rounded-lg">
                          {cat.capacity} Tiket
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
