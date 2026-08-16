"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import type { Prisma } from "@/generated/prisma/client";

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

const toNumber = (value: string | number | null | undefined, fallback = 0): number => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value !== "string" || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
};


export async function createEvent(payload: EventPayload, isPublished: boolean) {
  try {
    console.log("=== PAYLOAD DITERIMA DARI FORM ===");
    console.log(JSON.stringify(payload, null, 2));
    console.log("==================================");

    // 1. CARI ATAU BUAT USER EO
    let eoUser = await prisma.user.findFirst({
      where: { role: { name: "EO" } },
    });

    if (!eoUser) {
      eoUser = await prisma.user.create({
        data: {
          name: "Organizer Testing",
          email: "eo@testing.com",
          password: "hashedpassword123",
          role: { connect: { name: "EO" } },
        },
      });
    }

    // 2. MAPPING KATEGORI TIKET (DIPERBARUI DENGAN FITUR KUALIFIKASI)
    const formattedCategories = (payload.categories || []).map((cat: EventCategoryInput) => ({
      name: cat.name || "Kategori Umum",
      price: toNumber(cat.price),
      capacity: toNumber(cat.capacity ?? cat.quota), // Mengakomodasi jika UI mengirim "quota"
      elevation: cat.elevation || null,
      cot: cat.cot || null,
      description: cat.description || null,
      requireApproval:
        cat.requireApproval === true || cat.requireApproval === "true",
    }));

    // 3. MAPPING ADD-ONS (BARU)
    const formattedAddons = (payload.addons || []).map((addon: EventAddonInput) => ({
      type: addon.type || "MERCHANDISE", // Default Enum
      name: addon.name || "Addon Tanpa Nama",
      price: toNumber(addon.price),
      capacity:
        addon.capacity || addon.quota
          ? toNumber(addon.capacity ?? addon.quota)
          : null,
      description: addon.description || null,
      imageUrl: addon.imageUrl || null,
    }));

    // 4. EKSTRAKSI URL GAMBAR
    const detectedImageUrl =
      payload.imageUrl ||
      payload.bannerUrl ||
      payload.posterUrl ||
      payload.coverUrl ||
      payload.image ||
      payload.banner ||
      payload.poster ||
      payload.cover ||
      null;

    // 5. SIMPAN EVENT KE DATABASE (Nested Create)
    const newEvent = await prisma.event.create({
      data: {
        title: payload.title?.trim() || "Untitled Event",
        category: payload.category || null,
        description: payload.description || "",
        date: new Date(payload.date || Date.now()),
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        location: payload.locationName || payload.location || "Online/Offline",
        mapsUrl: payload.mapsUrl || null,
        isPublished: isPublished,
        eoId: eoUser.id,
        imageUrl: detectedImageUrl,

        logoUrl: payload.logoUrl || null,
        rules: payload.rules || null,
        contactName: payload.contactName || null,
        contactPhone: payload.contactPhone || null,
        customFields: toJsonValue(payload.customFields),

        // Relasi Tiket
        categories:
          formattedCategories.length > 0
            ? { create: formattedCategories }
            : undefined,

        // Relasi Add-ons
        addons:
          formattedAddons.length > 0 ? { create: formattedAddons } : undefined,
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/events");

    return {
      success: true,
      message: "Event berhasil disimpan!",
      data: newEvent,
    };
  } catch (error: unknown) {
    console.error("=== DETAIL ERROR PRISMA ===");
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Terjadi kesalahan server saat menyimpan event.",
    };
  }
}

// ============================================================================
// FUNGSI MENGAMBIL DATA EVENT UNTUK DASHBOARD MANAJEMEN EVENT
// ============================================================================
export async function getEvents() {
  try {
    const eoUser = await prisma.user.findFirst({
      where: {
        role: {
          name: "EO",
        },
      },
    });
    if (!eoUser) return { success: true, data: [] };

    const events = await prisma.event.findMany({
      where: { eoId: eoUser.id },
      include: {
        categories: true,
        addons: true, // Menyertakan addons untuk info di dashboard
      },
      orderBy: { id: "desc" },
    });

    const formattedEvents = events.map((event) => {
      const totalQuota = event.categories.reduce(
        (sum, cat) => sum + cat.capacity,
        0,
      );
      return {
        id: event.id,
        title: event.title,
        locationName: event.location,
        date: event.date.toISOString(),
        time: event.date.toISOString(),
        bannerUrl: event.imageUrl,
        status: event.isPublished ? "publish" : "draft",
        isPublished: event.isPublished,
        quota: totalQuota,
        soldTickets: 0,
        revenue: "Rp 0",
      };
    });

    return { success: true, data: formattedEvents };
  } catch (error: unknown) {
    console.error("=== ERROR GET EVENTS ===");
    console.error(error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Gagal mengambil data event dari database.",
      data: [],
    };
  }
}

// ============================================================================
// FUNGSI MENGHAPUS EVENT DENGAN CASCADING DELETE
// ============================================================================
export async function deleteEventWithPassword(
  eventId: string,
  passwordInput: string,
) {
  try {
    const eoUser = await prisma.user.findFirst({ where: { role: { name: "EO" } } });
    if (!eoUser)
      return {
        success: false,
        error: "Sesi EO tidak ditemukan atau Anda belum login.",
      };
    if (!eoUser.password)
      return {
        success: false,
        error: "Akun ini tidak memiliki password yang valid.",
      };

    const isPasswordValid = await bcrypt.compare(
      passwordInput,
      eoUser.password,
    );
    const isPlainTextMatch = passwordInput === eoUser.password;

    if (!isPasswordValid && !isPlainTextMatch) {
      return { success: false, error: "Password yang Anda masukkan salah!" };
    }

    // Karena di schema.prisma kita sudah set onDelete: Cascade pada relasi categories dan addons,
    // kita cukup menghapus event-nya saja, dan Prisma/DB akan menghapus sisanya otomatis.
    await prisma.event.delete({
      where: {
        id: eventId,
        eoId: eoUser.id,
      },
    });

    revalidatePath("/dashboard/events");
    return {
      success: true,
      message: "Event beserta seluruh kategorinya berhasil dihapus.",
    };
  } catch (error: unknown) {
    console.error("Gagal menghapus event:", error);
    return {
      success: false,
      error: "Terjadi kesalahan sistem saat menghapus event.",
    };
  }
}

// ============================================================================
// FUNGSI MENGAMBIL DETAIL SATU EVENT (UNTUK FITUR EDIT & CHECKOUT)
// ============================================================================
export async function getEventById(eventId: string) {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        categories: true,
        addons: true, // Pastikan addons ikut terpanggil
      },
    });

    if (!event)
      return { success: false, error: "Event tidak ditemukan di database." };

    return { success: true, data: event };
  } catch (error: unknown) {
    console.error("=== ERROR GET EVENT BY ID ===");
    console.error(error);
    return {
      success: false,
      error: "Terjadi kesalahan sistem saat mengambil data event.",
    };
  }
}

// ============================================================================
// FUNGSI MEMPERBARUI DATA EVENT (UPDATE)
// ============================================================================
export async function updateEvent(
  eventId: string,
  payload: EventPayload,
  isPublished: boolean,
) {
  try {
    const eoUser = await prisma.user.findFirst({ where: { role: { name: "EO" } } });
    if (!eoUser)
      return {
        success: false,
        error: "Sesi EO tidak ditemukan atau Anda belum login.",
      };

    // 1. MAPPING KATEGORI TIKET BARU
    const formattedCategories = (payload.categories || []).map((cat: EventCategoryInput) => ({
      name: cat.name || "Kategori Umum",
      price: toNumber(cat.price),
      capacity: toNumber(cat.capacity ?? cat.quota),
      elevation: cat.elevation || null,
      cot: cat.cot || null,
      description: cat.description || null,
      requireApproval:
        cat.requireApproval === true || cat.requireApproval === "true",
    }));

    // 2. MAPPING ADD-ONS BARU
    const formattedAddons = (payload.addons || []).map((addon: EventAddonInput) => ({
      type: addon.type || "MERCHANDISE",
      name: addon.name || "Addon Tanpa Nama",
      price: toNumber(addon.price),
      capacity:
        addon.capacity || addon.quota
          ? toNumber(addon.capacity ?? addon.quota)
          : null,
      description: addon.description || null,
      imageUrl: addon.imageUrl || null,
    }));

    const detectedImageUrl =
      payload.imageUrl ||
      payload.bannerUrl ||
      payload.posterUrl ||
      payload.coverUrl ||
      payload.image ||
      payload.banner ||
      payload.poster ||
      payload.cover ||
      null;

    // 3. PROSES UPDATE KE DATABASE
    const updatedEvent = await prisma.event.update({
      where: {
        id: eventId,
        eoId: eoUser.id,
      },
      data: {
        title: payload.title?.trim() || "Untitled Event",
        category: payload.category || null,
        description: payload.description || "",
        date: new Date(payload.date || Date.now()),
        endDate: payload.endDate ? new Date(payload.endDate) : null,
        location: payload.locationName || payload.location || "Online/Offline",
        mapsUrl: payload.mapsUrl || null,
        isPublished: isPublished,
        ...(detectedImageUrl && { imageUrl: detectedImageUrl }),

        ...(payload.logoUrl !== undefined && { logoUrl: payload.logoUrl }),
        rules: payload.rules || null,
        contactName: payload.contactName || null,
        contactPhone: payload.contactPhone || null,
        customFields: toJsonValue(payload.customFields),

        // Mengganti total kategori lama dengan yang baru
        categories: {
          deleteMany: {},
          create: formattedCategories,
        },

        // Mengganti total addon lama dengan yang baru
        addons: {
          deleteMany: {},
          create: formattedAddons,
        },
      },
    });

    revalidatePath("/");
    revalidatePath("/dashboard/events");
    revalidatePath(`/dashboard/events/${eventId}`);

    return {
      success: true,
      message: "Event berhasil diperbarui!",
      data: updatedEvent,
    };
  } catch (error: unknown) {
    console.error("=== DETAIL ERROR UPDATE EVENT ===");
    console.error(error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Terjadi kesalahan server saat memperbarui event.",
    };
  }
}
// ============================================================================
// FUNGSI UPDATE STATUS APPROVAL PESERTA (UNTUK EO)
// ============================================================================
export async function updateParticipantStatus(
  orderId: string,
  status: "APPROVED" | "REJECTED",
) {
  try {
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { approvalStatus: status },
    });

    revalidatePath("/dashboard/events/[eventId]/orders", "page");

    return {
      success: true,
      message: `Peserta berhasil di-${status.toLowerCase()}!`,
      data: updatedOrder,
    };
  } catch (error: unknown) {
    console.error("Gagal mengubah status approval:", error);
    return {
      success: false,
      error: "Terjadi kesalahan sistem saat memperbarui status peserta.",
    };
  }
}
