import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";
import OrdersClient from "./OrdersClient";

interface OrdersPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function OrdersPage({ params }: OrdersPageProps) {
  const { eventId } = await params;

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
            orderBy: {
              createdAt: "desc",
            },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  /**
   * Prisma's JsonValue is the canonical JSON type at the database boundary.
   * OrdersClient only needs to receive the serialized JSON payload.
   */
  const allOrders = event.categories.flatMap((category) =>
    category.orders.map((order) => ({
      id: order.id,
      fullName: order.fullName,
      email: order.email,
      phone: order.phone,
      jerseySize: order.jerseySize,
      categoryName: category.name,
      customAnswers:
        order.customAnswers === null
          ? null
          : (order.customAnswers as Prisma.JsonValue),
      approvalStatus: order.approvalStatus,
      requireApproval: category.requireApproval,
      addonOrders: order.addonOrders.map((addonOrder) => ({
        id: addonOrder.id,
        quantity: addonOrder.quantity,
        addon: {
          id: addonOrder.addon.id,
          name: addonOrder.addon.name,
        },
      })),
    })),
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Manajemen Peserta &amp; Order
        </h1>

        <p className="mt-1 text-muted-foreground">
          Event:{" "}
          <span className="font-semibold text-foreground">{event.title}</span>
        </p>
      </div>

      <OrdersClient orders={allOrders} />
    </div>
  );
}
