import prisma from "@/lib/prisma";
import EventTable from "./_components/EventTable";
import { Ticket } from "lucide-react";

export const metadata = {
  title: "Manajemen Event & Tiket | IONtix Admin",
};

export default async function EventsPage() {
  // Mengambil data seluruh Event beserta informasi EO pembuatnya
  // Kita gunakan include { eo: true } karena dari dashboard overview Anda, relasi ini sudah ada
  const events = await prisma.event.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      eo: true,
      // Jika model tiket terhubung ke event, kita bisa menghitungnya.
      // Untuk amannya (agar tidak error jika skema berbeda), kita fokus pada relasi EO dulu.
    },
  });

  return (
    <div className="space-y-6 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-[1600px] mx-auto">
      {/* Header Halaman - Standar Enterprise */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between border-b border-slate-200/60 pb-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-3">
            <Ticket className="h-8 w-8 text-blue-600 drop-shadow-sm transform -rotate-12" />
            Event & Tiket
          </h2>
          <p className="mt-2 text-sm font-medium text-slate-500">
            Pantau semua kegiatan yang didaftarkan oleh Mitra EO dan kelola
            status publikasinya.
          </p>
        </div>
      </div>

      {/* Memanggil Tabel Interaktif */}
      <EventTable initialData={events} />
    </div>
  );
}
