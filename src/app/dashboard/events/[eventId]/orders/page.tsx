import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import OrdersClient from "./OrdersClient";

interface OrdersPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { eventId } = await params;

  // 1. Ambil detail Event beserta semua data Order/Peserta dan Addons-nya
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      categories: {
        include: {
          orders: {
            include: {
              addonOrders: {
                include: {
                  addon: true,
                },
              },
            },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  // Flattening data orders agar mudah dirender dalam tabel
  const allOrders = event.categories.flatMap((cat) =>
    cat.orders.map((order) => ({
      ...order,
      categoryName: cat.name,
      requireApproval: cat.requireApproval,
    })),
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Manajemen Peserta & Order
        </h1>
        <p className="text-muted-foreground mt-1">
          Event:{" "}
          <span className="font-semibold text-foreground">{event.title}</span>
        </p>
      </div>

      <OrdersClient orders={allOrders} />
    </div>
  );
}
