import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

interface EventTicketInput {
  name?: string;
  price?: string | number;
  quota?: string | number;
}

interface CreateEventBody {
  eventDetails: {
    name: string;
    category?: string | null;
    description?: string | null;
    startDate: string;
    endDate?: string | null;
    location?: string | null;
    mapsUrl?: string | null;
    rules?: string | null;
    contactName?: string | null;
    contactPhone?: string | null;
  };
  posterPreview?: string | null;
  logoPreview?: string | null;
  tickets: EventTicketInput[];
}

const toNumber = (value: string | number | undefined): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value?.trim()) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateEventBody;
    const { eventDetails, posterPreview, logoPreview, tickets } = body;

    const eoUser = await prisma.user.findFirst({
      where: { role: { name: "EO" } },
    });

    if (!eoUser) {
      return NextResponse.json(
        { success: false, message: "User dengan role EO tidak ditemukan di database. Silakan daftarkan akun EO terlebih dahulu." },
        { status: 400 },
      );
    }

    const newEvent = await prisma.event.create({
      data: {
        title: eventDetails.name.trim(),
        category: eventDetails.category ?? null,
        description: eventDetails.description ?? "",
        date: new Date(eventDetails.startDate),
        endDate: eventDetails.endDate ? new Date(eventDetails.endDate) : null,
        location: eventDetails.location ?? "Online/Offline",
        mapsUrl: eventDetails.mapsUrl ?? null,
        imageUrl: posterPreview ?? null,
        logoUrl: logoPreview ?? null,
        rules: eventDetails.rules ?? null,
        contactName: eventDetails.contactName ?? null,
        contactPhone: eventDetails.contactPhone ?? null,
        isPublished: true,
        eoId: eoUser.id,
        categories: {
          create: (tickets ?? []).map((ticket) => ({
            name: ticket.name?.trim() || "Kategori Umum",
            price: toNumber(ticket.price),
            capacity: toNumber(ticket.quota),
          })),
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/events");

    return NextResponse.json(
      { success: true, message: "Event berhasil disimpan!", data: newEvent },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Error API Create Event:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Terjadi kesalahan saat menyimpan data." },
      { status: 500 },
    );
  }
}
