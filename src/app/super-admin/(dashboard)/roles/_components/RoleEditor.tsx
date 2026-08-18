"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Edit3, Loader2, Plus, X } from "lucide-react";

interface RoleEditorProps {
  role?: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
  };
  onSuccess?: () => void;
}

interface RoleResponse {
  success?: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
  };
}

export default function RoleEditor({ role, onSuccess }: RoleEditorProps) {
  const router = useRouter();

  const isEditMode = Boolean(role);
  const isSystemRole = role?.isSystem === true;

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [isLoadingRole, setIsLoadingRole] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function resetForm() {
    if (role) {
      setName(role.name);
      setDescription(role.description ?? "");
    } else {
      setName("");
      setDescription("");
    }

    setErrorMessage("");
    setIsSubmitting(false);
  }

  function openModal() {
    setErrorMessage("");

    if (role) {
      setName(role.name);
      setDescription(role.description ?? "");
    } else {
      setName("");
      setDescription("");
    }

    setIsOpen(true);
  }

  function closeModal() {
    if (isSubmitting || isLoadingRole) {
      return;
    }

    setIsOpen(false);
    resetForm();
  }

  async function loadRole() {
    if (!role?.id) {
      return;
    }

    setIsLoadingRole(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/super-admin/roles/${role.id}`, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as RoleResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Gagal mengambil data role.");
      }

      if (!data.data) {
        throw new Error("Data role tidak tersedia.");
      }

      setName(data.data.name);
      setDescription(data.data.description ?? "");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal mengambil data role.",
      );
    } finally {
      setIsLoadingRole(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSystemRole) {
      setErrorMessage(
        `System role "${role?.name}" tidak dapat diubah melalui Role Manager.`,
      );
      return;
    }

    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage("Nama role wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const endpoint = isEditMode
        ? `/api/super-admin/roles/${role?.id}`
        : "/api/super-admin/roles";

      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          isEditMode
            ? {
                name: trimmedName,
                description: description.trim() || null,
              }
            : {
                name: trimmedName,
                description: description.trim() || null,
                permissionIds: [],
              },
        ),
      });

      const data = (await response.json()) as RoleResponse;

      if (!response.ok) {
        throw new Error(
          data.message ??
            (isEditMode ? "Gagal memperbarui role." : "Gagal membuat role."),
        );
      }

      setIsOpen(false);
      resetForm();

      router.refresh();
      onSuccess?.();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEditMode
            ? "Gagal memperbarui role."
            : "Gagal membuat role.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          openModal();

          if (isEditMode) {
            void loadRole();
          }
        }}
        className={
          isEditMode
            ? "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-blue-700"
            : "inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
        }
      >
        {isEditMode ? (
          <>
            <Edit3 className="h-4 w-4" />
            Edit
          </>
        ) : (
          <>
            <Plus className="h-4 w-4" />
            Buat Role
          </>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {isEditMode ? "Edit Custom Role" : "Buat Custom Role"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {isEditMode
                    ? "Perbarui identitas dan deskripsi role."
                    : "Buat role baru untuk kebutuhan akses khusus platform atau organisasi."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting || isLoadingRole}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {isLoadingRole ? (
                <div className="flex min-h-55 items-center justify-center">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Memuat data role...
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label
                      htmlFor={
                        isEditMode
                          ? `edit-role-name-${role?.id}`
                          : "create-role-name"
                      }
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Nama Role
                      <span className="ml-1 text-red-500">*</span>
                    </label>

                    <input
                      id={
                        isEditMode
                          ? `edit-role-name-${role?.id}`
                          : "create-role-name"
                      }
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Contoh: EO_FINANCE"
                      disabled={isSubmitting || isSystemRole}
                      autoFocus
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />

                    <p className="mt-1.5 text-xs text-slate-500">
                      Gunakan huruf, angka, dan underscore. Nama akan
                      dinormalisasi oleh server.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor={
                        isEditMode
                          ? `edit-role-description-${role?.id}`
                          : "create-role-description"
                      }
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Deskripsi
                    </label>

                    <textarea
                      id={
                        isEditMode
                          ? `edit-role-description-${role?.id}`
                          : "create-role-description"
                      }
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Jelaskan tujuan atau cakupan role ini."
                      rows={4}
                      disabled={isSubmitting || isSystemRole}
                      className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </div>

                  {isSystemRole ? (
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <p className="text-xs font-semibold leading-5 text-amber-700">
                        System role bersifat read-only. Nama dan deskripsi tidak
                        dapat diubah melalui Role Manager.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                      <p className="text-xs font-semibold leading-5 text-blue-700">
                        Permission role dikelola secara terpisah melalui
                        Permission Matrix.
                      </p>
                    </div>
                  )}

                  {errorMessage && (
                    <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>{errorMessage}</p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={isSubmitting}
                      className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Batal
                    </button>

                    <button
                      type="submit"
                      disabled={
                        isSubmitting || isSystemRole || name.trim().length === 0
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {isEditMode ? "Menyimpan..." : "Membuat..."}
                        </>
                      ) : isEditMode ? (
                        <>
                          <Edit3 className="h-4 w-4" />
                          Simpan Perubahan
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Buat Role
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
