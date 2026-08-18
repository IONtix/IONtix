"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/auth/authorization";

/**
 * Server Action untuk menyetujui (publish) event yang statusnya pending.
 */
export async function approveEvent(
  eventId: string,
  formData?: FormData,
): Promise<void> {
  // Pertahankan parameter untuk kompatibilitas
  // dengan pemanggilan Server Action berbasis form.
  void formData;

  try {
    await requireSuperAdmin();

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!event) {
      throw new Error("Event tidak ditemukan.");
    }

    if (event.status !== "PENDING_REVIEW") {
      throw new Error(
        "Event hanya dapat dipublikasikan ketika berstatus PENDING_REVIEW.",
      );
    }

    await prisma.event.update({
      where: { id: eventId },
      data: {
        status: "PUBLISHED",
        isPublished: true,
        publishedAt: new Date(),
      },
    });

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/events");
    revalidatePath("/dashboard/events");
    revalidatePath(`/dashboard/events/${eventId}`);
    revalidatePath(`/events/${eventId}`);
  } catch (error) {
    console.error("Gagal menyetujui event:", error);
    throw error;
  }
}
