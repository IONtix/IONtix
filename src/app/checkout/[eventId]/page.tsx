import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import CheckoutFormClient from "./CheckoutFormClient";

interface CheckoutPageProps {
  params: Promise<{ eventId: string }>;
}

async function getEventData(eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        categories: true, // Mengambil kategori tiket dari DB
        addons: true, // <-- BARU: Mengambil katalog Add-ons dari DB
      },
    });

    return event;
  } catch (error) {
    console.error("Gagal mengambil data event:", error);
    return null;
  }
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { eventId } = await params;
  const event = await getEventData(eventId);

  // Jika event tidak ada di database, tampilkan 404
  if (!event) {
    notFound();
  }

  // Ambil custom fields dari DB jika ada, jika tidak default ke array kosong
  const customFields = Array.isArray(event.customFields)
    ? (event.customFields as any[])
    : [];

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <CheckoutFormClient
        event={event}
        tickets={event.categories || []}
        addons={event.addons || []} // <-- BARU: Kirim Addons ke Client Form
        customFields={customFields}
      />
    </main>
  );
}
