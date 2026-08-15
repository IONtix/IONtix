import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function ManageTicketsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: eventId } = await params;

  // 1. Ambil data Event berdasarkan ID
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      categories: true,
    },
  });

  if (!event) {
    return <div className="p-8">Event tidak ditemukan.</div>;
  }

  // ⚙️ Server Action untuk menyimpan Kategori Tiket
  async function addTicketCategory(formData: FormData) {
    "use server";

    const name = formData.get("name") as string;
    const price = parseInt(formData.get("price") as string);
    const capacity = parseInt(formData.get("quota") as string); // 👈 Ambil input quota

    // Simpan ke database Supabase (menggunakan field 'capacity')
    await prisma.ticketCategory.create({
      data: {
        name: name,
        price: price,
        capacity: capacity, // 👈 Disesuaikan dengan schema.prisma Anda (capacity)
        eventId: eventId,
      },
    });

    // Refresh halaman agar tiket baru langsung muncul
    redirect(`/dashboard/events/${eventId}/tickets`);
  }

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-primary transition-colors mb-4 inline-block"
        >
          &larr; Kembali ke Dashboard
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          Kelola Tiket: {event.title}
        </h1>
        <p className="text-muted-foreground mt-1">
          📍 {event.location} | 📅{" "}
          {new Date(event.date).toLocaleDateString("id-ID")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Tambah Tiket */}
        <div className="md:col-span-1 bg-card border border-border/50 rounded-xl p-6 shadow-sm h-fit space-y-4">
          <h2 className="text-lg font-bold">Tambah Tiket Baru</h2>

          <form action={addTicketCategory} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Kategori</Label>
              <Input
                id="name"
                name="name"
                placeholder="Cth: 10K - Early Bird"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Harga (Rp)</Label>
              <Input
                id="price"
                name="price"
                type="number"
                placeholder="Cth: 150000"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quota">Kuota Tiket</Label>
              <Input
                id="quota"
                name="quota"
                type="number"
                placeholder="Cth: 300"
                required
              />
            </div>

            <Button type="submit" className="w-full">
              + Tambah Tiket
            </Button>
          </form>
        </div>

        {/* Daftar Tiket yang Sudah Dibuat */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold">Kategori Tiket Aktif</h2>

          {event.categories.length === 0 ? (
            <div className="p-8 text-center border border-dashed rounded-xl bg-card">
              <p className="text-muted-foreground">
                Belum ada kategori tiket. Tambahkan kategori pertama Anda di
                samping.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {event.categories.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-5 border border-border/50 rounded-xl bg-card flex justify-between items-center shadow-sm"
                >
                  <div>
                    <h3 className="font-bold text-lg">{ticket.name}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Kuota:{" "}
                      <span className="font-medium text-foreground">
                        {ticket.capacity} tiket
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary">
                      Rp {ticket.price.toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
