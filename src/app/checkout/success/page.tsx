import { Button } from "@/components/ui/button";
import Link from "next/link";
import prisma from "@/lib/prisma";
import ETicketCard from "@/components/eticket";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; ticket?: string }>;
}) {
  const { event, ticket } = await searchParams;

  // 📥 Ambil order paling baru yang baru saja di-checkout dari database
  const latestOrder = await prisma.order.findFirst({
    orderBy: { createdAt: "desc" },
    include: {
      ticketCategory: {
        include: {
          event: true,
        },
      },
    },
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 py-12">
      <div className="max-w-md w-full bg-card border border-border/50 rounded-3xl p-6 text-center space-y-6 shadow-md">
        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto text-3xl">
          🎉
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black tracking-tight">
            Pendaftaran Berhasil!
          </h1>
          <p className="text-sm text-muted-foreground">
            Selamat! Tiket Anda untuk acara{" "}
            <span className="font-semibold text-foreground">
              {event || "Event Lari"}
            </span>{" "}
            ({ticket}) telah berhasil dipesan.
          </p>
        </div>

        {/* 🎟️ TAMPILKAN E-TICKET DENGAN QR CODE JIKA ORDER DITEMUKAN */}
        {latestOrder && (
          <ETicketCard
            orderId={latestOrder.id}
            fullName={latestOrder.fullName}
            eventTitle={latestOrder.ticketCategory.event.title}
            ticketName={latestOrder.ticketCategory.name}
            jerseySize={latestOrder.jerseySize}
            location={latestOrder.ticketCategory.event.location}
            date={new Date(
              latestOrder.ticketCategory.event.date,
            ).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        )}

        <div className="flex gap-3">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full font-bold text-xs">
              Kembali ke Beranda
            </Button>
          </Link>
          <Link href="/dashboard" className="flex-1">
            <Button className="w-full font-bold text-xs">
              Ke Dashboard EO
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
