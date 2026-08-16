// src/app/super-admin/users/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createUser(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;

    const hashedPassword = await bcrypt.hash(password, 12);

    // Menyimpan data ke database
    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: { connectOrCreate: { where: { name: role }, create: { name: role, isSystem: false } } },
      },
    });

    // Refresh halaman Manajemen Pengguna secara instan
    revalidatePath("/super-admin/users");

    return { success: true };
  } catch (error) {
    console.error("Gagal membuat pengguna:", error);
    return { success: false, error: "Terjadi kesalahan saat menyimpan data." };
  }
}
