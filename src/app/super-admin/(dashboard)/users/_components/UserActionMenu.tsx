"use client";

import {
  AlertTriangle,
  Ban,
  Edit,
  KeyRound,
  Loader2,
  MoreHorizontal,
  Trash2,
  UserCheck,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import type { SuperAdminRole, SuperAdminUser } from "@/lib/platform-types";
import { isManagedRole } from "@/lib/admin/role-policy";

interface UserActionMenuProps {
  user: SuperAdminUser;
  roles: SuperAdminRole[];
  currentUserId: string;

  canEdit: boolean;
  canChangeRole: boolean;
  canManageStatus: boolean;
  canDelete: boolean;
  canResetPassword: boolean;
  canImpersonate: boolean;
}

interface ApiResponse {
  message?: string;
  success?: boolean;
  redirectUrl?: string;
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
    // Response tidak memiliki JSON yang dapat dibaca.
  }

  return {};
}

export default function UserActionMenu({
  user,
  roles,
  currentUserId,
  canEdit,
  canChangeRole,
  canManageStatus,
  canDelete,
  canResetPassword,
  canImpersonate,
}: UserActionMenuProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const [feedback, setFeedback] = useState("");

  const managedRoles = roles.filter((role) => isManagedRole(role.name));

  const defaultRole =
    (user.role?.name && isManagedRole(user.role.name)
      ? user.role.name
      : undefined) ??
    managedRoles.find((role) => role.name === "PARTICIPANT")?.name ??
    managedRoles[0]?.name ??
    "PARTICIPANT";

  const [editData, setEditData] = useState({
    name: user.name ?? "",
    role: defaultRole,
  });

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

  const isSelf = user.id === currentUserId;

  const isSuperAdmin = user.role?.name === "SUPER_ADMIN";

  const isDeleted = user.status === "DELETED" || user.isDeleted === true;

  const isSuspended = user.status === "SUSPENDED";

  const openEditModal = () => {
    setEditData({
      name: user.name ?? "",
      role:
        (user.role?.name && isManagedRole(user.role.name)
          ? user.role.name
          : undefined) ??
        managedRoles.find((role) => role.name === "PARTICIPANT")?.name ??
        managedRoles[0]?.name ??
        "PARTICIPANT",
    });

    setFeedback("");
    setIsDropdownOpen(false);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canEdit) {
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      const payload: {
        name: string;
        role?: string;
      } = {
        name: editData.name,
      };

      /*
       * Hanya kirim role jika actor memang memiliki
       * permission roles.manage.
       */
      if (canChangeRole) {
        payload.role = editData.role;
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        setFeedback(data.message ?? "Gagal memperbarui pengguna.");
        return;
      }

      setIsEditModalOpen(false);
      router.refresh();
    } catch {
      setFeedback("Terjadi kesalahan jaringan atau server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!canManageStatus || isSelf || isDeleted || isSuperAdmin) {
      return;
    }

    setIsLoading(true);
    setFeedback("");

    const newStatus = isSuspended ? "ACTIVE" : "SUSPENDED";

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

      const data = await readApiResponse(response);

      if (!response.ok) {
        setFeedback(data.message ?? "Gagal mengubah status pengguna.");
        return;
      }

      setIsStatusModalOpen(false);
      router.refresh();
    } catch {
      setFeedback("Terjadi kesalahan jaringan atau server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!canDelete || isSelf || isDeleted) {
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        setFeedback(data.message ?? "Gagal menonaktifkan pengguna.");
        return;
      }

      setIsDeleteModalOpen(false);
      router.refresh();
    } catch {
      setFeedback("Terjadi kesalahan jaringan atau server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!canResetPassword || isSelf || isDeleted) {
      return;
    }

    const confirmed = window.confirm(
      `Buat permintaan reset password untuk ${user.email}?`,
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/users/${user.id}/reset-password`, {
        method: "POST",
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        setFeedback(data.message ?? "Gagal membuat reset password.");
        return;
      }

      window.alert(
        data.message ?? "Permintaan reset password berhasil dibuat.",
      );
    } catch {
      setFeedback("Terjadi kesalahan jaringan atau server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImpersonate = async () => {
    if (!canImpersonate || isSelf || isDeleted || isSuperAdmin) {
      return;
    }

    const confirmed = window.confirm(
      `Buat permintaan impersonation untuk ${user.name || user.email}?`,
    );

    if (!confirmed) {
      return;
    }

    setIsLoading(true);
    setFeedback("");

    try {
      const response = await fetch(`/api/users/${user.id}/impersonate`, {
        method: "POST",
      });

      const data = await readApiResponse(response);

      if (!response.ok) {
        setFeedback(data.message ?? "Gagal membuat permintaan impersonation.");
        return;
      }

      window.alert(data.message ?? "Permintaan impersonation telah dicatat.");

      /*
       * Session impersonation belum aktif.
       * Jangan redirect ke target.
       */
    } catch {
      setFeedback("Terjadi kesalahan jaringan atau server.");
    } finally {
      setIsLoading(false);
    }
  };

  const hasActions =
    canEdit ||
    canManageStatus ||
    canDelete ||
    canResetPassword ||
    canImpersonate;

  if (!hasActions) {
    return <span className="text-xs text-slate-400">Tidak ada aksi</span>;
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((current) => !current)}
        disabled={isLoading}
        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50"
        title="Opsi Aksi"
        aria-label={`Opsi aksi untuk ${user.name || user.email}`}
        aria-expanded={isDropdownOpen}
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>

      {isDropdownOpen && (
        <div className="absolute right-0 z-30 mt-1 w-60 rounded-xl border border-slate-100 bg-white py-2 shadow-xl">
          <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Manajemen Akun
          </div>

          {canEdit && (
            <button
              type="button"
              onClick={openEditModal}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-blue-600"
            >
              <Edit className="h-4 w-4 text-blue-500" />
              Edit Pengguna
            </button>
          )}

          {canResetPassword && !isSelf && !isDeleted && (
            <button
              type="button"
              onClick={handleResetPassword}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-amber-600"
            >
              <KeyRound className="h-4 w-4 text-amber-500" />
              Reset Password
            </button>
          )}

          {canImpersonate && !isSelf && !isDeleted && !isSuperAdmin && (
            <button
              type="button"
              onClick={handleImpersonate}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-purple-600"
            >
              <UserCheck className="h-4 w-4 text-purple-500" />
              Minta Impersonation
            </button>
          )}

          {canManageStatus && !isSelf && !isDeleted && !isSuperAdmin && (
            <>
              <hr className="my-1 border-slate-100" />

              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Status & Proteksi
              </div>

              <button
                type="button"
                onClick={() => {
                  setFeedback("");
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
                    Suspend Akun
                  </>
                )}
              </button>
            </>
          )}

          {canDelete && !isSelf && !isDeleted && (
            <>
              <hr className="my-1 border-slate-100" />

              <button
                type="button"
                onClick={() => {
                  setFeedback("");
                  setIsDropdownOpen(false);
                  setIsDeleteModalOpen(true);
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Nonaktifkan Pengguna
              </button>
            </>
          )}

          {feedback && (
            <div className="mx-3 mt-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
              {feedback}
            </div>
          )}
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Edit Pengguna
                </h2>
                <p className="mt-1 text-xs text-slate-500">{user.email}</p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5 p-5">
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              {canChangeRole && (
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                    Role Sistem
                  </label>

                  <select
                    value={editData.role}
                    onChange={(event) =>
                      setEditData((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  >
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                        {role.isSystem ? " • System" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {feedback && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {feedback}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
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
              {isSuspended ? "Aktifkan Akun?" : "Suspend Akun?"}
            </h2>

            <p className="mb-6 text-sm text-slate-500">
              {isSuspended
                ? `Pengguna ${
                    user.name || user.email
                  } akan dapat login kembali.`
                : `Pengguna ${
                    user.name || user.email
                  } akan diblokir sementara tanpa menghapus data.`}
            </p>

            {feedback && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {feedback}
              </div>
            )}

            <div className="flex gap-3">
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
                  "Ya, Suspend"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h2 className="mb-2 text-lg font-bold text-slate-800">
              Nonaktifkan Pengguna?
            </h2>

            <p className="mb-6 text-sm text-slate-500">
              Pengguna akan ditandai sebagai DELETED dan tidak lagi dapat login.
            </p>

            {feedback && (
              <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {feedback}
              </div>
            )}

            <div className="flex gap-3">
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
                  <>
                    <Trash2 className="h-4 w-4" />
                    Ya, Nonaktifkan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
