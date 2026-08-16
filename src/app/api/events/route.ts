import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import prisma from "@/lib/prisma";
import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";
import { requireOrganizationMembership } from "@/lib/auth/organization";

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
  tickets?: EventTicketInput[];
}

const toNumber = (value: string | number | undefined): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const membership = await requireOrganizationMembership();

    const body = (await request.json()) as CreateEventBody;

    const eventDetails = body.eventDetails;

    if (!eventDetails?.name?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Nama event wajib diisi.",
        },
        { status: 400 },
      );
    }

    if (!eventDetails.startDate) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal mulai event wajib diisi.",
        },
        { status: 400 },
      );
    }

    const startDate = new Date(eventDetails.startDate);

    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal mulai event tidak valid.",
        },
        { status: 400 },
      );
    }

    const endDate = eventDetails.endDate
      ? new Date(eventDetails.endDate)
      : null;

    if (endDate && Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          message: "Tanggal selesai event tidak valid.",
        },
        { status: 400 },
      );
    }

    if (endDate && endDate < startDate) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Tanggal selesai tidak boleh lebih awal daripada tanggal mulai.",
        },
        { status: 400 },
      );
    }

    const ticketInputs = Array.isArray(body.tickets) ? body.tickets : [];

    const categories = ticketInputs.map((ticket) => ({
      name: ticket.name?.trim() || "Kategori Umum",
      price: toNumber(ticket.price),
      capacity: Math.max(0, Math.trunc(toNumber(ticket.quota))),
    }));

    const isSuperAdmin = user.role === "SUPER_ADMIN";

    const newEvent = await prisma.event.create({
      data: {
        title: eventDetails.name.trim(),
        category: eventDetails.category?.trim() || null,
        description: eventDetails.description?.trim() || "",
        date: startDate,
        endDate,
        location: eventDetails.location?.trim() || "Online/Offline",
        mapsUrl: eventDetails.mapsUrl?.trim() || null,
        imageUrl: body.posterPreview || null,
        logoUrl: body.logoPreview || null,
        rules: eventDetails.rules?.trim() || null,
        contactName: eventDetails.contactName?.trim() || null,
        contactPhone: eventDetails.contactPhone?.trim() || null,

        organizationId: membership.organizationId,
        eoId: user.id,

        status: isSuperAdmin ? "PUBLISHED" : "PENDING_REVIEW",
        isPublished: isSuperAdmin,
        publishedAt: isSuperAdmin ? new Date() : null,

        categories:
          categories.length > 0
            ? {
                create: categories,
              }
            : undefined,
      },
      select: {
        id: true,
        title: true,
        organizationId: true,
        eoId: true,
        status: true,
        isPublished: true,
        createdAt: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/events");

    return NextResponse.json(
      {
        success: true,
        message: isSuperAdmin
          ? "Event berhasil dibuat dan dipublikasikan."
          : "Event berhasil dibuat dan menunggu review.",
        data: newEvent,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    return authorizationErrorResponse(error);
  }
}
