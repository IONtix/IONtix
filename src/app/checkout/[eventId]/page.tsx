import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";

import CheckoutFormClient from "./CheckoutFormClient";
import type { CustomFieldDefinition } from "@/lib/platform-types";

interface CheckoutPageProps {
  params: Promise<{ eventId: string }>;
}

async function getEventData(eventId: string) {
  try {
    const event = await prisma.event.findFirst({
      where: {
        id: eventId,
        status: "PUBLISHED",
        isPublished: true,
      },
      include: {
        categories: {
          where: {
            isActive: true,
            AND: [
              {
                OR: [
                  {
                    saleStartsAt: null,
                  },
                  {
                    saleStartsAt: {
                      lte: new Date(),
                    },
                  },
                ],
              },
              {
                OR: [
                  {
                    saleEndsAt: null,
                  },
                  {
                    saleEndsAt: {
                      gte: new Date(),
                    },
                  },
                ],
              },
            ],
          },
          orderBy: {
            sortOrder: "asc",
          },
        },
        addons: {
          where: {
            isActive: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    return event;
  } catch (error: unknown) {
    console.error("Gagal mengambil data checkout event:", error);

    return null;
  }
}

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const { eventId } = await params;

  const event = await getEventData(eventId);

  /*
   * Jangan membocorkan apakah event exists
   * tetapi tidak boleh checkout.
   */
  if (!event) {
    notFound();
  }

  const customFields = Array.isArray(event.customFields)
    ? (event.customFields as unknown as CustomFieldDefinition[])
    : [];

  return (
    <main className="min-h-screen bg-slate-50 py-10">
      <CheckoutFormClient
        event={event}
        tickets={event.categories}
        addons={event.addons}
        customFields={customFields}
      />
    </main>
  );
}
