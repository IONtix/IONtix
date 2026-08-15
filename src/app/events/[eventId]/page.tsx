import { Button } from "@/components/ui/button";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { AlertCircle, Mountain, Timer, Package } from "lucide-react";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>; // PERBAIKAN 1: Sesuaikan dengan nama folder [eventId]
}) {
  const { eventId } = await params;

  // 1. Ambil detail event beserta kategori tiket, ADD-ONS, dan EO
  const event = await prisma.event.findUnique({
    where: { id: eventId }, // PERBAIKAN 1: Gunakan eventId
    include: {
      categories: true,
      addons: true,
      eo: true,
    },
  });

  if (!event) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Banner Event */}
      <div className="bg-primary/5 border-b border-border/40 py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary transition-colors mb-6 inline-block"
          >
            &larr; Kembali ke Semua Event
          </Link>
          <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full uppercase tracking-wider block w-fit mb-3">
            Event Lari Resmi
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground">
            {event.title}
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">
            Diselenggarakan oleh{" "}
            <span className="font-semibold text-foreground">
              {event.eo?.name || "Organizer"}
            </span>
          </p>

          <div className="flex flex-wrap gap-6 mt-6 text-sm font-medium">
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border border-border/50 shadow-sm">
              📍 <span>{event.location}</span>
            </div>
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-lg border border-border/50 shadow-sm">
              📅{" "}
              <span>
                {new Date(event.date).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Detail & Tiket */}
      <div className="container mx-auto px-4 py-12 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* BAGIAN KIRI: Deskripsi & Add-ons */}
          <div className="lg:col-span-2 space-y-10">
            {/* Deskripsi Event */}
            <section className="space-y-4">
              <h2 className="text-2xl font-bold tracking-tight">
                Tentang Event Ini
              </h2>
              <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-line bg-card border border-border/50 rounded-2xl p-6 shadow-sm">
                {event.description || "Tidak ada deskripsi tambahan."}
              </div>
            </section>

            {/* Katalog Add-ons (Jika Ada) */}
            {event.addons && event.addons.length > 0 && (
              <section className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <Package size={24} className="text-primary" /> Fasilitas
                  Ekstra
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {event.addons.map((addon) => (
                    <div
                      key={addon.id}
                      className="p-4 border border-border/50 rounded-2xl bg-card shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-1 rounded">
                          {addon.type}
                        </span>
                        <h3 className="font-bold text-lg mt-2">{addon.name}</h3>
                        {addon.description && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {addon.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-4 pt-4 border-t border-border/40 flex justify-between items-center">
                        <span className="font-bold text-primary">
                          Rp {addon.price.toLocaleString("id-ID")}
                        </span>
                        {addon.capacity && (
                          <span className="text-xs text-muted-foreground">
                            Sisa: {addon.capacity}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  *Fasilitas di atas dapat ditambahkan saat Anda melakukan
                  proses pembelian tiket (Checkout).
                </p>
              </section>
            )}
          </div>

          {/* BAGIAN KANAN: Opsi Tiket */}
          <div className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight">Pilih Tiket</h2>

            {event.categories.length === 0 ? (
              <div className="p-6 text-center border border-dashed rounded-2xl bg-card">
                <p className="text-muted-foreground text-sm">
                  Tiket belum tersedia untuk event ini.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {event.categories.map((category) => (
                  <div
                    key={category.id}
                    className="relative p-5 border border-border/50 rounded-2xl bg-card shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between space-y-4 overflow-hidden"
                  >
                    {/* Badge Wajib Approval */}
                    {category.requireApproval && (
                      <div className="absolute top-0 right-0 bg-red-100 text-red-700 text-[10px] font-bold px-3 py-1 rounded-bl-lg flex items-center gap-1">
                        <AlertCircle size={12} /> WAJIB KUALIFIKASI
                      </div>
                    )}

                    <div className="pt-2">
                      <div className="flex justify-between items-start">
                        <h3 className="font-bold text-xl pr-4">
                          {category.name}
                        </h3>
                      </div>
                      <div className="text-lg font-extrabold text-primary mt-1">
                        Rp {category.price.toLocaleString("id-ID")}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Sisa Kuota:{" "}
                        <span className="font-semibold text-foreground">
                          {category.capacity}
                        </span>{" "}
                        tiket
                      </p>

                      {/* Info Elevasi & COT */}
                      {(category.elevation || category.cot) && (
                        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-border/40">
                          {category.elevation && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Mountain size={14} className="text-primary" />{" "}
                              {category.elevation} Gain
                            </div>
                          )}
                          {category.cot && (
                            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                              <Timer size={14} className="text-primary" /> COT:{" "}
                              {category.cot}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* PERBAIKAN 2: Arahkan ke /checkout/eventId, BUKAN category.id */}
                    <Link href={`/checkout/${event.id}`}>
                      <Button className="w-full font-semibold shadow-sm mt-2">
                        Beli Tiket Now
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
