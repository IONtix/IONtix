"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Server Action untuk menyetujui (publish) event yang statusnya pending
 */
export async function approveEvent(eventId: string, _formData?: FormData): Promise<void> {
  try {
    // 1. Update status isPublished menjadi true di PostgreSQL
    await prisma.event.update({
      where: { id: eventId },
      data: { isPublished: true },
    });

    // 2. Beri tahu Next.js untuk memperbarui data di halaman super-admin secara instan
    revalidatePath("/super-admin");

    return;
  } catch (error) {
    console.error("Gagal menyetujui event:", error);
    return;
  }
}
