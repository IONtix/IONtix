"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SuperAdminUser } from "@/lib/platform-types";
import {
  AlertTriangle,
  Ban,
  Edit,
  History,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";

type EditableUserRole = "USER" | "EO" | "SUPER_ADMIN";

interface EditUserData {
  name: string;
  role: EditableUserRole;
}

interface ApiResponse {
  message?: string;
  success?: boolean;
  redirectUrl?: string;
}

function normalizeRole(role: string | null | undefined): EditableUserRole {
  switch (role) {
    case "EO":
      return "EO";
    case "SUPER_ADMIN":
      return "SUPER_ADMIN";
    default:
      return "USER";
  }
}

async function readApiResponse(response: Response): Promise<ApiResponse> {
  try {
    const payload: unknown = await response.json();

    if (typeof payload === "object" && payload !== null) {
      const data = payload as Record<string, unknown>;

      return {
        message: typeof data.message === "string" ? data.message : undefined,
        success: typeof data.success === "boolean" ? data.success : undefined,
        redirectUrl:
          typeof data.redirectUrl === "string" ? data.redirectUrl : undefined,
      };
    }
  } catch {
    // Response may have no JSON body.
  }

  return {};
}

export default function UserActionMenu({ user }: { user: SuperAdminUser }) {
  const router = useRouter();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Edit state is initialized from the row data.
   * We intentionally do not synchronize it with a useEffect,
   * because that would introduce a synchronous state update
   * during effect execution.
   */
  const [editData, setEditData] = useState<EditUserData>(() => ({
    name: user.name ?? "",
    role: normalizeRole(user.role?.name),
  }));

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target;

      if (
        dropdownRef.current &&
        target instanceof Node &&
        !dropdownRef.current.contains(target)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const openEditModal = () => {
    setEditData({
      name: user.name ?? "",
      role: normalizeRole(user.role?.name),
    });

    setIsDropdownOpen(false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      });

      const responseData = await readApiResponse(response);

      if (!response.ok) {
        alert(responseData.message ?? "Gagal mengupdate pengguna.");
        return;
      }

      setIsEditModalOpen(false);
      router.refresh();
    } catch {
      alert("Terjadi kesalahan jaringan/server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsLoading(true);

    const newStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

    try {
      const response = await fetch(`/api/users/${user.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      const responseData = await readApiResponse(response);

      if (!response.ok) {
        alert(responseData.message ?? "Gagal mengubah status pengguna.");
        return;
      }

      setIsStatusModalOpen(false);
      router.refresh();
    } catch {
      alert("Terjadi kesalahan jaringan/server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImpersonate = async () => {
    const identity = user.name || user.email;

    if (!confirm(`Apakah Anda yakin ingin login sebagai ${identity}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}/impersonate`, {
        method: "POST",
      });

      const data = await readApiResponse(response);

      if (response.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      alert(data.message ?? "Gagal melakukan impersonasi.");
    } catch {
      alert("Gagal terhubung ke server.");
    }
  };

  const handleSendResetPassword = async () => {
    if (!confirm(`Kirim instruksi reset password ke email ${user.email}?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        alert(data.message ?? "Gagal mengirim instruksi reset password.");
        return;
      }

      alert(
        data.message ?? "Link reset password berhasil dikirim ke email user.",
      );
    } catch {
      alert("Gagal mengirimi email reset password.");
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      const responseData = await readApiResponse(response);

      if (!response.ok) {
        alert(responseData.message ?? "Gagal menghapus pengguna.");
        return;
      }

      setIsDeleteModalOpen(false);
      router.refresh();
    } catch {
      alert("Terjadi kesalahan jaringan/server.");
    } finally {
      setIsLoading(false);
    }
  };

  const isSuspended = user.status === "SUSPENDED";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsDropdownOpen((current) => !current)}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600"
        title="Opsi Aksi Lanjutan"
        aria-label="Opsi Aksi Lanjutan"
        aria-expanded={isDropdownOpen}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 z-20 mt-1 w-56 rounded-xl border border-slate-100 bg-white py-2 shadow-xl">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Manajemen Akun
          </div>

          <button
            type="button"
            onClick={openEditModal}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
          >
            <Edit className="h-4 w-4 text-blue-500" />
            Edit Pengguna
          </button>

          <button
            type="button"
            onClick={handleImpersonate}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-purple-600"
          >
            <UserCheck className="h-4 w-4 text-purple-500" />
            Login sbg Pengguna
          </button>

          <button
            type="button"
            onClick={handleSendResetPassword}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-amber-600"
          >
            <KeyRound className="h-4 w-4 text-amber-500" />
            Kirim Reset Password
          </button>

          <hr className="my-1 border-slate-100" />

          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Keamanan &amp; Proteksi
          </div>

          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(false);
              setIsStatusModalOpen(true);
            }}
            className={`flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
              isSuspended
                ? "text-emerald-600 hover:bg-emerald-50"
                : "text-amber-600 hover:bg-amber-50"
            }`}
          >
            {isSuspended ? (
              <>
                <UserCheck className="h-4 w-4" />
                Aktifkan Akun
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" />
                Bekukan Akun (Suspend)
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(false);
              alert("Fitur Audit Log sedang disiapkan.");
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-indigo-600"
          >
            <History className="h-4 w-4 text-indigo-500" />
            Lihat Log Aktivitas
          </button>

          <hr className="my-1 border-slate-100" />

          <button
            type="button"
            onClick={() => {
              setIsDropdownOpen(false);
              setIsDeleteModalOpen(true);
            }}
            className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Hapus Permanen
          </button>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h2 className="text-lg font-bold text-slate-800">
                Edit Data Pengguna
              </h2>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Nama Lengkap
                </label>

                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(event) =>
                    setEditData((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Peran Sistem (Role)
                </label>

                <select
                  value={editData.role}
                  onChange={(event) => {
                    const value = event.target.value as EditableUserRole;

                    setEditData((current) => ({
                      ...current,
                      role: value,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="USER">User Reguler (Pembeli Tiket)</option>

                  <option value="EO">Mitra EO (Event Organizer)</option>

                  <option value="SUPER_ADMIN">
                    Super Admin (Administrator)
                  </option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Simpan Perubahan"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 text-center shadow-xl">
            <div
              className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
                isSuspended
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              {isSuspended ? (
                <UserCheck className="h-6 w-6" />
              ) : (
                <Ban className="h-6 w-6" />
              )}
            </div>

            <h2 className="mb-2 text-lg font-bold text-slate-800">
              {isSuspended ? "Aktifkan Akun?" : "Bekukan Akun (Suspend)?"}
            </h2>

            <p className="mb-6 text-sm text-slate-500">
              {isSuspended
                ? `Pengguna ${user.name || user.email} akan dapat login kembali dan mengelola event/tiket.`
                : `Pengguna ${user.name || user.email} akan diblokir dari akses sistem secara sementara. Data tidak akan hilang.`}
            </p>

            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleToggleStatus}
                disabled={isLoading}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 ${
                  isSuspended
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isSuspended ? (
                  "Ya, Aktifkan"
                ) : (
                  "Ya, Bekukan"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h2 className="mb-2 text-lg font-bold text-slate-800">
              Hapus Pengguna?
            </h2>

            <p className="mb-6 text-sm text-slate-500">
              Apakah Anda yakin ingin menghapus{" "}
              <strong>{user.name || user.email}</strong>? Tindakan ini permanen.
            </p>

            <div className="flex w-full gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-70"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Ya, Hapus"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
