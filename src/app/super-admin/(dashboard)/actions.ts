"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    await prisma.event.update({
      where: { id: eventId },
      data: { isPublished: true },
    });

    revalidatePath("/super-admin");
  } catch (error) {
    console.error("Gagal menyetujui event:", error);
  }
}
