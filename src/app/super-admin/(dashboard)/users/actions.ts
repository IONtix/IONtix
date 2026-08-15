// src/app/super-admin/users/actions.ts
"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
// import { hash } from "bcryptjs"; // Hapus komentar ini jika Anda menggunakan bcryptjs untuk enkripsi password

export async function createUser(formData: FormData) {
  try {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const role = formData.get("role") as string;

    // TODO: Sangat disarankan untuk mengenkripsi password di production!
    // const hashedPassword = await hash(password, 10);

    // Menyimpan data ke database
    await prisma.user.create({
      data: {
        name,
        email,
        password, // Ganti dengan hashedPassword jika memakai bcrypt
        // Sesuaikan struktur 'role' di bawah ini dengan skema Prisma Anda
        // Jika menggunakan string: role,
        // Jika menggunakan tabel relasi Role: role: { connect: { name: role } }
        role,
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
