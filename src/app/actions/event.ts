"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import type { DashboardEvent } from "@/lib/platform-types";

import { AuthorizationError, requireAuth } from "@/lib/auth/authorization";

import {
  requireEventPermission,
  requireOrganizationMembership,
  requireOrganizationPermission,
} from "@/lib/auth/organization";

type EventCategoryInput = {
  name?: string;
  price?: string | number;
  capacity?: string | number;
  quota?: string | number;
  elevation?: string | null;
  cot?: string | null;
  description?: string | null;
  requireApproval?: boolean | string;
};

type EventAddonInput = {
  type?: "MERCHANDISE" | "CARBO_LOADING" | "SHUTTLE" | "HOTEL";
  name?: string;
  price?: string | number;
  capacity?: string | number | null;
  quota?: string | number | null;
  description?: string | null;
  imageUrl?: string | null;
};

type EventPayload = {
  title?: string;
  category?: string | null;
  description?: string;
  date?: string | Date;
  endDate?: string | Date | null;
  locationName?: string;
  location?: string;
  mapsUrl?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  posterUrl?: string | null;
  coverUrl?: string | null;
  image?: string | null;
  banner?: string | null;
  poster?: string | null;
  cover?: string | null;
  logoUrl?: string | null;
  rules?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  customFields?: unknown;
  categories?: EventCategoryInput[];
  addons?: EventAddonInput[];
};

type EventActionResult<T = unknown> = {
  success: boolean;
  message?: string;
  error?: string;
  data?: T;
};

const toNumber = (
  value: string | number | null | undefined,
  fallback = 0,
): number => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};

const toNullableJsonUpdateValue = (
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return toJsonValue(value);
};

const getDetectedImageUrl = (payload: EventPayload): string | null => {
  return (
    payload.imageUrl ||
    payload.bannerUrl ||
    payload.posterUrl ||
    payload.coverUrl ||
    payload.image ||
    payload.banner ||
    payload.poster ||
    payload.cover ||
    null
  );
};

const formatCategories = (categories: EventCategoryInput[] | undefined) => {
  return (categories ?? []).map((category) => ({
    name: category.name?.trim() || "Kategori Umum",
    price: toNumber(category.price),
    capacity: Math.max(
      0,
      Math.trunc(toNumber(category.capacity ?? category.quota)),
    ),
    elevation: category.elevation?.trim() || null,
    cot: category.cot?.trim() || null,
    description: category.description?.trim() || null,
    requireApproval:
      category.requireApproval === true || category.requireApproval === "true",
  }));
};

const formatAddons = (addons: EventAddonInput[] | undefined) => {
  return (addons ?? []).map((addon) => {
    const capacitySource = addon.capacity ?? addon.quota;

    return {
      type: addon.type || "MERCHANDISE",
      name: addon.name?.trim() || "Addon Tanpa Nama",
      price: toNumber(addon.price),
      capacity:
        capacitySource === null ||
        capacitySource === undefined ||
        capacitySource === ""
          ? null
          : Math.max(0, Math.trunc(toNumber(capacitySource))),
      description: addon.description?.trim() || null,
      imageUrl: addon.imageUrl?.trim() || null,
    };
  });
};

/**
 * CREATE EVENT
 *
 * Ownership:
 * current user -> active organization membership -> Event.organizationId
 *
 * eoId tetap disimpan untuk legacy compatibility.
 * EO tidak boleh bypass workflow review.
 */
export async function createEvent(
  payload: EventPayload,
  _isPublished: boolean,
): Promise<EventActionResult> {
  try {
    void _isPublished;

    const user = await requireAuth();
    const membership = await requireOrganizationMembership();

    await requireOrganizationPermission(
      membership.organizationId,
      "events.manage",
    );

    const title = payload.title?.trim() || "";

    if (!title) {
      return {
        success: false,
        error: "Nama event wajib diisi.",
      };
    }

    if (!payload.date) {
      return {
        success: false,
        error: "Tanggal event wajib diisi.",
      };
    }

    const eventDate = new Date(payload.date);

    if (Number.isNaN(eventDate.getTime())) {
      return {
        success: false,
        error: "Tanggal event tidak valid.",
      };
    }

    const endDate = payload.endDate ? new Date(payload.endDate) : null;

    if (endDate && Number.isNaN(endDate.getTime())) {
      return {
        success: false,
        error: "Tanggal selesai event tidak valid.",
      };
    }

    if (endDate && endDate < eventDate) {
      return {
        success: false,
        error: "Tanggal selesai tidak boleh lebih awal daripada tanggal mulai.",
      };
    }

    const formattedCategories = formatCategories(payload.categories);
    const formattedAddons = formatAddons(payload.addons);

    const isSuperAdmin = user.role === "SUPER_ADMIN";

    const newEvent = await prisma.event.create({
      data: {
        title,
        category: payload.category?.trim() || null,
        description: payload.description?.trim() || "",
        date: eventDate,
        endDate,
        location:
          payload.locationName?.trim() ||
          payload.location?.trim() ||
          "Online/Offline",
        mapsUrl: payload.mapsUrl?.trim() || null,
        imageUrl: getDetectedImageUrl(payload),
        logoUrl: payload.logoUrl?.trim() || null,
        rules: payload.rules?.trim() || null,
        contactName: payload.contactName?.trim() || null,
        contactPhone: payload.contactPhone?.trim() || null,
        customFields: toJsonValue(payload.customFields),

        organizationId: membership.organizationId,
        eoId: user.id,

        status: isSuperAdmin ? "PUBLISHED" : "PENDING_REVIEW",
        isPublished: isSuperAdmin,
        publishedAt: isSuperAdmin ? new Date() : null,

        categories:
          formattedCategories.length > 0
            ? { create: formattedCategories }
            : undefined,

        addons:
          formattedAddons.length > 0 ? { create: formattedAddons } : undefined,
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/events");

    return {
      success: true,
      message: isSuperAdmin
        ? "Event berhasil dibuat dan dipublikasikan."
        : "Event berhasil dibuat dan menunggu review.",
      data: newEvent,
    };
  } catch (error: unknown) {
    console.error("Create event error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan server saat menyimpan event.",
    };
  }
}

/**
 * GET EVENTS
 */
export async function getEvents(): Promise<
  EventActionResult<DashboardEvent[]>
> {
  try {
    const user = await requireAuth();

    const membership =
      user.role === "SUPER_ADMIN"
        ? null
        : await requireOrganizationMembership();

    if (membership) {
      await requireOrganizationPermission(
        membership.organizationId,
        "events.view",
      );
    }

    const events = await prisma.event.findMany({
      where:
        user.role === "SUPER_ADMIN"
          ? undefined
          : {
              organizationId: membership!.organizationId,
            },
      include: {
        categories: true,
        addons: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formattedEvents: DashboardEvent[] = events.map((event) => {
      const totalQuota = event.categories.reduce(
        (sum, category) => sum + category.capacity,
        0,
      );

      return {
        id: event.id,
        title: event.title,
        category: event.category,
        locationName: event.location,
        location: event.location,
        date: event.date.toISOString(),
        time: event.date.toISOString(),
        bannerUrl: event.imageUrl,
        imageUrl: event.imageUrl,
        status: event.status.toLowerCase(),
        isPublished: event.isPublished,
        quota: totalQuota,
        soldTickets: 0,
        revenue: "Rp 0",
        categories: event.categories.map((category) => ({
          capacity: category.capacity,
          price: category.price,
        })),
      };
    });

    return {
      success: true,
      data: formattedEvents,
    };
  } catch (error: unknown) {
    console.error("Get events error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data event dari database.",
      data: [],
    };
  }
}

/**
 * DELETE EVENT
 */
export async function deleteEventWithPassword(
  eventId: string,
  passwordInput: string,
): Promise<EventActionResult> {
  try {
    const access = await requireEventPermission(
      eventId,
      "events.manage",
    );

    const currentUser = await prisma.user.findUnique({
      where: {
        id: access.user.id,
      },
      select: {
        id: true,
        password: true,
      },
    });

    if (!currentUser) {
      return {
        success: false,
        error: "Akun pengguna tidak ditemukan.",
      };
    }

    if (typeof passwordInput !== "string" || passwordInput.length === 0) {
      return {
        success: false,
        error: "Password wajib diisi.",
      };
    }

    const isPasswordValid = await bcrypt.compare(
      passwordInput,
      currentUser.password,
    );

    if (!isPasswordValid) {
      return {
        success: false,
        error: "Password yang Anda masukkan salah.",
      };
    }

    const [orderCount, ticketCount, checkInCount] = await Promise.all([
      prisma.order.count({
        where: {
          eventId,
        },
      }),
      prisma.ticket.count({
        where: {
          eventId,
        },
      }),
      prisma.checkIn.count({
        where: {
          eventId,
        },
      }),
    ]);

    if (orderCount > 0 || ticketCount > 0 || checkInCount > 0) {
      return {
        success: false,
        error:
          "Event tidak dapat dihapus karena sudah memiliki data order, ticket, atau check-in.",
      };
    }

    await prisma.event.delete({
      where: {
        id: access.event.id,
      },
    });

    revalidatePath("/dashboard/events");

    return {
      success: true,
      message: "Event berhasil dihapus.",
    };
  } catch (error: unknown) {
    console.error("Delete event error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan sistem saat menghapus event.",
    };
  }
}

/**
 * GET EVENT BY ID
 */
export async function getEventById(
  eventId: string,
): Promise<EventActionResult> {
  try {
    const access = await requireEventPermission(
      eventId,
      "events.view",
    );

    const event = await prisma.event.findUnique({
      where: {
        id: access.event.id,
      },
      include: {
        categories: true,
        addons: true,
      },
    });

    if (!event) {
      return {
        success: false,
        error: "Event tidak ditemukan.",
      };
    }

    return {
      success: true,
      data: event,
    };
  } catch (error: unknown) {
    console.error("Get event by ID error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Anda tidak memiliki akses ke event ini.",
    };
  }
}

/**
 * UPDATE EVENT
 */
export async function updateEvent(
  eventId: string,
  payload: EventPayload,
  isPublished: boolean,
): Promise<EventActionResult> {
  try {
    const access = await requireEventPermission(
      eventId,
      "events.manage",
    );
    const user = access.user;

    const existingOrderCount = await prisma.order.count({
      where: {
        eventId: access.event.id,
      },
    });

    const existingTicketCount = await prisma.ticket.count({
      where: {
        eventId: access.event.id,
      },
    });

    const hasCommerceData = existingOrderCount > 0 || existingTicketCount > 0;

    const formattedCategories = Array.isArray(payload.categories)
      ? formatCategories(payload.categories)
      : undefined;

    const formattedAddons = Array.isArray(payload.addons)
      ? formatAddons(payload.addons)
      : undefined;

    if (
      hasCommerceData &&
      (formattedCategories !== undefined || formattedAddons !== undefined)
    ) {
      return {
        success: false,
        error:
          "Kategori tiket atau add-on tidak dapat diganti total setelah event memiliki order atau ticket.",
      };
    }

    const date = payload.date ? new Date(payload.date) : access.event.date;

    if (Number.isNaN(date.getTime())) {
      return {
        success: false,
        error: "Tanggal event tidak valid.",
      };
    }

    const endDate =
      payload.endDate === null
        ? null
        : payload.endDate
          ? new Date(payload.endDate)
          : access.event.endDate;

    if (endDate && Number.isNaN(endDate.getTime())) {
      return {
        success: false,
        error: "Tanggal selesai event tidak valid.",
      };
    }

    if (endDate && endDate < date) {
      return {
        success: false,
        error: "Tanggal selesai tidak boleh lebih awal daripada tanggal mulai.",
      };
    }

    const wantsToPublish = Boolean(isPublished) && user.role === "SUPER_ADMIN";

    const updateData: Prisma.EventUpdateInput = {
      title: payload.title?.trim() || access.event.title,
      category:
        payload.category !== undefined
          ? payload.category?.trim() || null
          : access.event.category,
      description:
        payload.description !== undefined
          ? payload.description.trim()
          : access.event.description,
      date,
      endDate,
      location:
        payload.locationName?.trim() ||
        payload.location?.trim() ||
        access.event.location,
      mapsUrl:
        payload.mapsUrl !== undefined
          ? payload.mapsUrl?.trim() || null
          : access.event.mapsUrl,
      rules:
        payload.rules !== undefined
          ? payload.rules?.trim() || null
          : access.event.rules,
      contactName:
        payload.contactName !== undefined
          ? payload.contactName?.trim() || null
          : access.event.contactName,
      contactPhone:
        payload.contactPhone !== undefined
          ? payload.contactPhone?.trim() || null
          : access.event.contactPhone,

      status: wantsToPublish
        ? "PUBLISHED"
        : user.role === "SUPER_ADMIN"
          ? access.event.status
          : "PENDING_REVIEW",

      isPublished: wantsToPublish,

      publishedAt: wantsToPublish
        ? (access.event.publishedAt ?? new Date())
        : null,
    };

    if (payload.customFields !== undefined) {
      updateData.customFields = toNullableJsonUpdateValue(payload.customFields);
    }

    const detectedImageUrl = getDetectedImageUrl(payload);

    if (detectedImageUrl !== null) {
      updateData.imageUrl = detectedImageUrl;
    }

    if (payload.logoUrl !== undefined) {
      updateData.logoUrl = payload.logoUrl?.trim() || null;
    }

    if (formattedCategories !== undefined) {
      updateData.categories = {
        deleteMany: {},
        create: formattedCategories,
      };
    }

    if (formattedAddons !== undefined) {
      updateData.addons = {
        deleteMany: {},
        create: formattedAddons,
      };
    }

    const updatedEvent = await prisma.event.update({
      where: {
        id: access.event.id,
      },
      data: updateData,
    });

    revalidatePath("/");
    revalidatePath("/dashboard/events");
    revalidatePath(`/dashboard/events/${eventId}`);

    return {
      success: true,
      message:
        user.role === "SUPER_ADMIN"
          ? "Event berhasil diperbarui."
          : "Event berhasil diperbarui dan menunggu review.",
      data: updatedEvent,
    };
  } catch (error: unknown) {
    console.error("Update event error:", error);

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan server saat memperbarui event.",
    };
  }
}

/**
 * UPDATE STATUS APPROVAL PESERTA
 */
export async function updateParticipantStatus(
  orderId: string,
  status: "APPROVED" | "REJECTED",
): Promise<EventActionResult> {
  try {
    if (status !== "APPROVED" && status !== "REJECTED") {
      return {
        success: false,
        error: "Status approval tidak valid.",
      };
    }

    const order = await prisma.order.findUnique({
      where: {
        id: orderId,
      },
      select: {
        id: true,
        eventId: true,
        approvalStatus: true,
      },
    });

    if (!order) {
      return {
        success: false,
        error: "Order tidak ditemukan.",
      };
    }

    const access = await requireEventPermission(
      order.eventId,
      "participants.manage",
    );

    const updatedOrder = await prisma.order.update({
      where: {
        id: order.id,
      },
      data: {
        approvalStatus: status,
      },
    });

    await prisma.adminAction
      .create({
        data: {
          actorUserId: access.user.id,
          action: "PARTICIPANT_APPROVAL_UPDATED",
          targetType: "Order",
          targetId: updatedOrder.id,
          metadata: {
            previousStatus: order.approvalStatus,
            newStatus: status,
            eventId: order.eventId,
          },
        },
      })
      .catch((error: unknown) => {
        console.error("Gagal membuat AdminAction:", error);
      });

    revalidatePath("/dashboard/events/[eventId]/orders", "page");

    return {
      success: true,
      message:
        status === "APPROVED"
          ? "Peserta berhasil disetujui."
          : "Peserta berhasil ditolak.",
      data: updatedOrder,
    };
  } catch (error: unknown) {
    console.error("Update participant status error:", error);

    if (error instanceof AuthorizationError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan sistem saat memperbarui status peserta.",
    };
  }
}
