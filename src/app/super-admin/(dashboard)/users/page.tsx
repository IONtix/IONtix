// src/app/super-admin/users/page.tsx

import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { Search, Shield, User, Building2, Mail } from "lucide-react";
import type { SuperAdminUser } from "@/lib/platform-types";

// IMPORT KOMPONEN CLIENT DI SINI
import AddUserModal from "./_components/AddUserModal";
import UserActionMenu from "./_components/UserActionMenu";

export default async function UsersManagementPage() {
  const session = await getServerSession(authOptions);

  // 1. SECURITY & ACCESS CONTROL
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    redirect("/super-admin/login");
  }

  // 2. FETCH DATA PENGGUNA (Hanya yang belum di-Soft Delete)
  const users = await prisma.user.findMany({
    where: {
      isDeleted: false, // Hanya ambil user aktif
    },
    orderBy: { createdAt: "desc" },
    include: {
      role: true,
    },
  });

  // 3. STATISTIK CEPAT
  const totalUsers = users.length;
  // Menyesuaikan dengan struktur role Anda (string atau relasi object)
  const totalAdmin = users.filter(
    (u: SuperAdminUser) => u.role?.name === "SUPER_ADMIN",
  ).length;
  const totalEO = users.filter(
    (u: SuperAdminUser) => u.role?.name === "EO",
  ).length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Manajemen Pengguna
          </h2>
          <p className="mt-1 text-sm text-slate-500 font-medium">
            Kelola akses, lihat daftar pengguna, dan atur peran sistem.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari email atau nama..."
              className="pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all w-64 shadow-sm"
            />
          </div>

          {/* PANGGIL KOMPONEN MODAL TAMBAH USER */}
          <AddUserModal />
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Pengguna</p>
            <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Super Admin</p>
            <p className="text-2xl font-bold text-slate-900">{totalAdmin}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-xl text-orange-600">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Mitra EO</p>
            <p className="text-2xl font-bold text-slate-900">{totalEO}</p>
          </div>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Pengguna
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Kontak
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Peran (Role)
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Tanggal Bergabung
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-10 text-center text-slate-500"
                  >
                    Belum ada data pengguna.
                  </td>
                </tr>
              ) : (
                users.map((user: SuperAdminUser) => {
                  const roleName = user.role?.name ?? "USER";

                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50/80 group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold border border-blue-200">
                            {user.name
                              ? user.name.charAt(0).toUpperCase()
                              : "U"}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                              {user.name || "Tanpa Nama"}
                            </p>
                            <p className="text-xs text-slate-400">
                              ID: {user.id.substring(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Mail className="h-4 w-4 text-slate-400" />
                          {user.email || "-"}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
                            roleName === "SUPER_ADMIN"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : roleName === "EO"
                                ? "bg-orange-50 text-orange-700 border-orange-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {roleName === "SUPER_ADMIN" && (
                            <Shield className="h-3 w-3" />
                          )}
                          {roleName === "EO" && (
                            <Building2 className="h-3 w-3" />
                          )}
                          {roleName === "USER" && <User className="h-3 w-3" />}
                          {roleName}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "long",
                                year: "numeric",
                              },
                            )
                          : "-"}
                      </td>

                      {/* KOMPONEN MENU AKSI YANG BARU (EDIT & HAPUS) */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end">
                          <UserActionMenu user={user} />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between text-sm text-slate-500">
          <p>
            Menampilkan total{" "}
            <span className="font-semibold text-slate-900">{totalUsers}</span>{" "}
            pengguna
          </p>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-200 transition-colors"
              disabled
            >
              Sebelumnya
            </button>
            <button
              className="px-3 py-1 border border-slate-200 rounded hover:bg-slate-200 transition-colors"
              disabled
            >
              Selanjutnya
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
