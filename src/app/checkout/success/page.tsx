import Link from "next/link";

import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/authorization";
import PaymentStatusClient from "./PaymentStatusClient";

export const dynamic = "force-dynamic";

interface SuccessPageProps {
  searchParams: Promise<{
    event?: string;
    orderId?: string;
  }>;
}

export default async function SuccessPage({
  searchParams,
}: SuccessPageProps) {
  const { orderId } =
    await searchParams;

  if (!orderId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/50 bg-card p-6 text-center shadow-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 text-2xl font-black">
            !
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-tight">
              Order Tidak Ditemukan
            </h1>
            <p className="text-sm text-muted-foreground">
              ID order tidak tersedia.
            </p>
          </div>

          <Link href="/cek-tiket">
            <Button className="w-full font-bold">
              Cek Tiket
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  let user;

  try {
    user = await requireAuth();
  } catch {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/50 bg-card p-6 text-center shadow-md">
          <h1 className="text-2xl font-black">
            Sesi Login Diperlukan
          </h1>

          <p className="text-sm text-muted-foreground">
            Silakan login untuk melihat status pesanan dan tiket Anda.
          </p>

          <Link href="/login">
            <Button className="w-full font-bold">
              Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const order =
    await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      include: {
        ticketCategory: {
          include: {
            event: true,
          },
        },
        payments: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
        tickets: {
          where: {
            status: "ACTIVE",
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            id: true,
            ticketNumber: true,
            status: true,
          },
        },
      },
    });

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-border/50 bg-card p-6 text-center shadow-md">
          <h1 className="text-2xl font-black">
            Order Tidak Ditemukan
          </h1>

          <Link href="/cek-tiket">
            <Button className="w-full font-bold">
              Cek Tiket
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const orderEmail =
    order.email?.trim().toLowerCase();

  const userEmail =
    user.email?.trim().toLowerCase();

  if (
    !orderEmail ||
    !userEmail ||
    orderEmail !== userEmail
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-md">
          <h1 className="text-2xl font-black text-red-700">
            Akses Ditolak
          </h1>

          <p className="text-sm text-red-600">
            Order ini bukan milik akun Anda.
          </p>
        </div>
      </div>
    );
  }

  const initialOrder = {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalPrice: order.totalPrice,
    currency: order.currency,
    fullName: order.fullName,
    email: order.email,
    ticketCategory:
      order.ticketCategory
        ? {
            id:
              order.ticketCategory.id,
            name:
              order.ticketCategory.name,
            event: {
              id:
                order.ticketCategory.event.id,
              title:
                order.ticketCategory.event.title,
            },
          }
        : null,
    payments: order.payments.map(
      (payment) => ({
        id: payment.id,
        status: payment.status,
        externalId:
          payment.externalId,
        expiresAt:
          payment.expiresAt
            ? payment.expiresAt.toISOString()
            : null,
      }),
    ),
    tickets: order.tickets.map(
      (ticket) => ({
        id: ticket.id,
        ticketNumber:
          ticket.ticketNumber,
        status:
          ticket.status,
        issuedAt: null,
      }),
    ),
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 py-12">
      <div className="w-full max-w-xl space-y-5">
        <PaymentStatusClient
          initialOrder={initialOrder}
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Link href="/cek-tiket">
            <Button
              variant="outline"
              className="w-full font-bold"
            >
              Cek Tiket
            </Button>
          </Link>

          <Link href="/">
            <Button
              variant="outline"
              className="w-full font-bold"
            >
              Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
