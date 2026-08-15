import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs"; // atau 'bcrypt' sesuai package yang Anda gunakan

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Memulai proses seeding data awal...");

  // 1. Buat Daftar Permission Awal (Fitur Super Admin)
  const permissionsList = [
    { name: "view_dashboard", description: "Melihat ringkasan metrik sistem" },
    {
      name: "manage_users",
      description: "Mengelola pengguna (suspend, reset password, hapus)",
    },
    { name: "manage_roles", description: "Mengatur peran dan hak akses" },
    { name: "manage_eo", description: "Verifikasi dan kelola Event Organizer" },
    {
      name: "manage_events",
      description: "Moderasi event yang didaftarkan EO",
    },
    {
      name: "manage_finance",
      description: "Melihat transaksi dan persetujuan pencairan dana",
    },
  ];

  const createdPermissions = [];
  for (const perm of permissionsList) {
    const p = await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
    createdPermissions.push(p);
  }
  console.log(
    `✅ ${createdPermissions.length} Permissions berhasil dibuat/diperbarui.`,
  );

  // 2. Buat Role SUPER_ADMIN & Hubungkan dengan Semua Permission
  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {
      permissions: {
        connect: createdPermissions.map((p) => ({ id: p.id })),
      },
    },
    create: {
      name: "SUPER_ADMIN",
      description: "Akses penuh ke seluruh sistem IONtix",
      permissions: {
        connect: createdPermissions.map((p) => ({ id: p.id })),
      },
    },
  });

  // Buat Role bawaan lainnya
  await prisma.role.upsert({
    where: { name: "EO" },
    update: {},
    create: { name: "EO", description: "Penyelenggara Acara Olahraga" },
  });

  await prisma.role.upsert({
    where: { name: "PESERTA" },
    update: {},
    create: { name: "PESERTA", description: "Peserta / Pembeli Tiket" },
  });

  console.log("✅ Role SUPER_ADMIN, EO, dan PESERTA berhasil disiapkan.");

  // 3. Hash Password untuk Akun Super Admin Pertama
  const defaultPassword = "SuperAdminIONtix2026!"; // Silakan ubah password ini
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  // 4. Buat Akun User Super Admin
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@iontix.com" },
    update: {
      roleId: superAdminRole.id,
    },
    create: {
      name: "Super Admin IONtix",
      email: "admin@iontix.com",
      password: hashedPassword,
      phone: "081234567890",
      roleId: superAdminRole.id,
    },
  });

  console.log("--------------------------------------------------");
  console.log("🎉 Seeding berhasil selesaikan!");
  console.log(`Email Admin: ${adminUser.email}`);
  console.log(`Password   : ${defaultPassword}`);
  console.log("--------------------------------------------------");
}

main()
  .catch((e) => {
    console.error("❌ Terjadi kesalahan saat seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
