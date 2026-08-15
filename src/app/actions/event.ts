"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function createEvent(payload: any, isPublished: boolean) {
  try {
    console.log("=== PAYLOAD DITERIMA DARI FORM ===");
    console.log(JSON.stringify(payload, null, 2));
    console.log("==================================");

    // 1. CARI ATAU BUAT USER EO
    let eoUser = await prisma.user.findFirst({
      where: { role: "EO" },
    });

    if (!eoUser) {
      eoUser = await prisma.user.create({
        data: {
          name: "Organizer Testing",
          email: "eo@testing.com",
          password: "hashedpassword123",
          role: "EO",
        },
      });
    }

    // 2. MAPPING KATEGORI TIKET (DIPERBARUI DENGAN FITUR KUALIFIKASI)
    const formattedCategories = (payload.categories || []).map((cat: any) => ({
      name: cat.name || "Kategori Umum",
      price: parseFloat(cat.price) || 0,
      capacity: parseInt(cat.capacity || cat.quota) || 0, // Mengakomodasi jika UI mengirim "quota"
      elevation: cat.elevation || null,
      cot: cat.cot || null,
      description: cat.description || null,
      requireApproval:
        cat.requireApproval === true || cat.requireApproval === "true",
    }));

    // 3. MAPPING ADD-ONS (BARU)
    const formattedAddons = (payload.addons || []).map((addon: any) => ({
      type: addon.type || "MERCHANDISE", // Default Enum
      name: addon.name || "Addon Tanpa Nama",
      price: parseFloat(addon.price) || 0,
      capacity:
        addon.capacity || addon.quota
          ? parseInt(addon.capacity || addon.quota)
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
        title: payload.title,
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
        customFields: payload.customFields || [],

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
  } catch (error: any) {
    console.error("=== DETAIL ERROR PRISMA ===");
    console.error(error);
    return {
      success: false,
      error: error?.message || "Terjadi kesalahan server saat menyimpan event.",
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
        bannerUrl: (event as any).imageUrl,
        status: event.isPublished ? "publish" : "draft",
        isPublished: event.isPublished,
        quota: totalQuota,
        soldTickets: 0,
        revenue: "Rp 0",
      };
    });

    return { success: true, data: formattedEvents };
  } catch (error: any) {
    console.error("=== ERROR GET EVENTS ===");
    console.error(error);
    return {
      success: false,
      error: error?.message || "Gagal mengambil data event dari database.",
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
    const eoUser = await prisma.user.findFirst({ where: { role: "EO" } });
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  payload: any,
  isPublished: boolean,
) {
  try {
    const eoUser = await prisma.user.findFirst({ where: { role: "EO" } });
    if (!eoUser)
      return {
        success: false,
        error: "Sesi EO tidak ditemukan atau Anda belum login.",
      };

    // 1. MAPPING KATEGORI TIKET BARU
    const formattedCategories = (payload.categories || []).map((cat: any) => ({
      name: cat.name || "Kategori Umum",
      price: parseFloat(cat.price) || 0,
      capacity: parseInt(cat.capacity || cat.quota) || 0,
      elevation: cat.elevation || null,
      cot: cat.cot || null,
      description: cat.description || null,
      requireApproval:
        cat.requireApproval === true || cat.requireApproval === "true",
    }));

    // 2. MAPPING ADD-ONS BARU
    const formattedAddons = (payload.addons || []).map((addon: any) => ({
      type: addon.type || "MERCHANDISE",
      name: addon.name || "Addon Tanpa Nama",
      price: parseFloat(addon.price) || 0,
      capacity:
        addon.capacity || addon.quota
          ? parseInt(addon.capacity || addon.quota)
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
        title: payload.title,
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
        customFields: payload.customFields || [],

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
  } catch (error: any) {
    console.error("=== DETAIL ERROR UPDATE EVENT ===");
    console.error(error);
    return {
      success: false,
      error:
        error?.message || "Terjadi kesalahan server saat memperbarui event.",
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
  } catch (error: any) {
    console.error("Gagal mengubah status approval:", error);
    return {
      success: false,
      error: "Terjadi kesalahan sistem saat memperbarui status peserta.",
    };
  }
}
