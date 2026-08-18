"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

interface RoleDeleteDialogProps {
  role: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
    userCount: number;
    organizationMemberCount: number;
  };
  onSuccess?: () => void;
}

interface DeleteRoleResponse {
  success?: boolean;
  message?: string;
}

export default function RoleDeleteDialog({
  role,
  onSuccess,
}: RoleDeleteDialogProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const hasUsage =
    role.userCount > 0 ||
    role.organizationMemberCount > 0;

  function openDialog() {
    setErrorMessage("");
    setIsOpen(true);
  }

  function closeDialog() {
    if (isDeleting) {
      return;
    }

    setIsOpen(false);
    setErrorMessage("");
  }

  async function handleDelete() {
    if (role.isSystem) {
      setErrorMessage(
        `System role "${role.name}" tidak dapat dihapus.`,
      );
      return;
    }

    if (hasUsage) {
      setErrorMessage(
        `Role "${role.name}" masih digunakan oleh user atau anggota organisasi.`,
      );
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      const response = await fetch(
        `/api/super-admin/roles/${role.id}`,
        {
          method: "DELETE",
        },
      );

      const data =
        (await response.json()) as DeleteRoleResponse;

      if (!response.ok) {
        throw new Error(
          data.message ??
            "Gagal menghapus role.",
        );
      }

      setIsOpen(false);

      router.refresh();
      onSuccess?.();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menghapus role.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (role.isSystem) {
    return (
      <span className="text-xs font-medium text-slate-400">
        Read Only
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
        aria-label={`Hapus role ${role.name}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Hapus
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>

                <h2 className="text-lg font-bold text-slate-900">
                  Hapus Role
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Tindakan ini akan menghapus role dan
                  assignment permission-nya.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={isDeleting}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Role
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {role.name}
                </p>

                {role.description && (
                  <p className="mt-1 text-xs text-slate-500">
                    {role.description}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Users
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {role.userCount}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Organization Members
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    {role.organizationMemberCount}
                  </p>
                </div>
              </div>

              {hasUsage ? (
                <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
                  Role ini masih digunakan. Role tidak
                  dapat dihapus sampai seluruh user dan
                  anggota organisasi tidak lagi memakai
                  role tersebut.
                </div>
              ) : (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-700">
                  Role ini tidak sedang digunakan dan
                  dapat dihapus.
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isDeleting}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={
                    isDeleting || hasUsage
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menghapus...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" />
                      Hapus Role
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
