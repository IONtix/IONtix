// src/app/super-admin/users/_components/UserActionMenu.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  AlertTriangle,
  Loader2,
  UserCheck,
  Ban,
  KeyRound,
  ShieldAlert,
  History,
  Mail,
} from "lucide-react";

export default function UserActionMenu({ user }: { user: any }) {
  const router = useRouter();

  // Modal States
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Edit State
  const [editData, setEditData] = useState({
    name: user.name || "",
    role: user.role?.name || user.role || "USER",
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- API HANDLERS ---

  // 1. EDIT USER
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });

      const responseData = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(responseData.message || "Gagal mengupdate pengguna.");
        return;
      }

      setIsEditModalOpen(false);
      router.refresh();
    } catch (error) {
      alert("Terjadi kesalahan jaringan/server.");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. TOGGLE SUSPEND / AKTIFKAN USER
  const handleToggleStatus = async () => {
    setIsLoading(true);
    const newStatus = user.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";

    try {
      const res = await fetch(`/api/users/${user.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const responseData = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(responseData.message || "Gagal mengubah status pengguna.");
        return;
      }

      setIsStatusModalOpen(false);
      router.refresh();
    } catch (error) {
      alert("Terjadi kesalahan jaringan/server.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. IMPERSONATE USER (LOGIN SEBAGAI USER)
  const handleImpersonate = async () => {
    if (
      !confirm(
        `Apakah Anda yakin ingin login sebagai ${user.name || user.email}?`,
      )
    )
      return;

    try {
      const res = await fetch(`/api/users/${user.id}/impersonate`, {
        method: "POST",
      });
      const data = await res.json();

      if (res.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert(data.message || "Gagal melakukan impersonasi.");
      }
    } catch (error) {
      alert("Gagal terhubung ke server.");
    }
  };

  // 4. KIRIM RESET PASSWORD LINK
  const handleSendResetPassword = async () => {
    if (!confirm(`Kirim instruksi reset password ke email ${user.email}?`))
      return;

    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();
      alert(
        data.message || "Link reset password berhasil dikirim ke email user.",
      );
    } catch (error) {
      alert("Gagal mengirimi email reset password.");
    }
  };

  // 5. DELETE USER (SOFT / HARD)
  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const responseData = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(responseData.message || "Gagal menghapus pengguna.");
        return;
      }

      setIsDeleteModalOpen(false);
      router.refresh();
    } catch (error) {
      alert("Terjadi kesalahan jaringan/server.");
    } finally {
      setIsLoading(false);
    }
  };

  const isSuspended = user.status === "SUSPENDED";

  return (
    <div className="relative" ref={dropdownRef}>
      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="text-slate-400 hover:text-blue-600 transition-colors hover:bg-slate-100 p-2 rounded-lg"
        title="Opsi Aksi Lanjutan"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {/* MODULAR DROPDOWN MENU */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-20 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* GRUP 1: MANAJEMEN UMUM */}
          <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Manajemen Akun
          </div>

          <button
            onClick={() => {
              setIsDropdownOpen(false);
              setIsEditModalOpen(true);
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 flex items-center gap-2.5 transition-colors"
          >
            <Edit className="h-4 w-4 text-blue-500" /> Edit Pengguna
          </button>

          <button
            onClick={handleImpersonate}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-purple-600 flex items-center gap-2.5 transition-colors"
          >
            <UserCheck className="h-4 w-4 text-purple-500" /> Login sbg Pengguna
          </button>

          <button
            onClick={handleSendResetPassword}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-amber-600 flex items-center gap-2.5 transition-colors"
          >
            <KeyRound className="h-4 w-4 text-amber-500" /> Kirim Reset Password
          </button>

          <hr className="my-1 border-slate-100" />

          {/* GRUP 2: KEAMANAN & ABUSE */}
          <div className="px-3 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Keamanan & Proteksi
          </div>

          <button
            onClick={() => {
              setIsDropdownOpen(false);
              setIsStatusModalOpen(true);
            }}
            className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2.5 transition-colors ${
              isSuspended
                ? "text-emerald-600 hover:bg-emerald-50"
                : "text-amber-600 hover:bg-amber-50"
            }`}
          >
            {isSuspended ? (
              <>
                <UserCheck className="h-4 w-4" /> Aktifkan Akun
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" /> Bekukan Akun (Suspend)
              </>
            )}
          </button>

          <button
            onClick={() => {
              setIsDropdownOpen(false);
              alert("Fitur Audit Log sedang disiapkan.");
            }}
            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 flex items-center gap-2.5 transition-colors"
          >
            <History className="h-4 w-4 text-indigo-500" /> Lihat Log Aktivitas
          </button>

          <hr className="my-1 border-slate-100" />

          {/* GRUP 3: TINDAKAN BAHAYA */}
          <button
            onClick={() => {
              setIsDropdownOpen(false);
              setIsDeleteModalOpen(true);
            }}
            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors"
          >
            <Trash2 className="h-4 w-4" /> Hapus Permanen
          </button>
        </div>
      )}

      {/* ================= MODAL EDIT ================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="flex justify-between items-center p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                Edit Data Pengguna
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Peran Sistem (Role)
                </label>
                <select
                  value={editData.role}
                  onChange={(e) =>
                    setEditData({ ...editData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                >
                  <option value="USER">User Reguler (Pembeli Tiket)</option>
                  <option value="EO">Mitra EO (Event Organizer)</option>
                  <option value="SUPER_ADMIN">
                    Super Admin (Administrator)
                  </option>
                </select>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-70"
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

      {/* ================= MODAL SUSPEND / UN-SUSPEND ================= */}
      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
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
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              {isSuspended ? "Aktifkan Akun?" : "Bekukan Akun (Suspend)?"}
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              {isSuspended
                ? `Pengguna ${user.name || user.email} akan dapat login kembali dan mengelola event/tiket.`
                : `Pengguna ${user.name || user.email} akan diblokir dari akses sistem secara sementara. Data tidak akan hilang.`}
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsStatusModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleToggleStatus}
                disabled={isLoading}
                className={`flex-1 flex justify-center items-center gap-2 px-4 py-2.5 text-sm text-white rounded-xl font-semibold disabled:opacity-70 ${
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

      {/* ================= MODAL HAPUS ================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              Hapus Pengguna?
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Apakah Anda yakin ingin menghapus{" "}
              <strong>{user.name || user.email}</strong>? Tindakan ini permanen.
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 px-4 py-2.5 text-sm bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-semibold"
              >
                Batal
              </button>
              <button
                onClick={handleDelete}
                disabled={isLoading}
                className="flex-1 flex justify-center items-center gap-2 px-4 py-2.5 text-sm bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold disabled:opacity-70"
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
