"use client";

import {
  AlertCircle,
  Loader2,
  Plus,
  X,
} from "lucide-react";
import {
  FormEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";

interface RoleEditorProps {
  onSuccess?: () => void;
}

interface CreateRoleResponse {
  success?: boolean;
  message?: string;
}

export default function RoleEditor({
  onSuccess,
}: RoleEditorProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] =
    useState(false);

  const [name, setName] =
    useState("");

  const [description, setDescription] =
    useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  function resetForm() {
    setName("");
    setDescription("");
    setErrorMessage("");
    setIsSubmitting(false);
  }

  function closeModal() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    resetForm();
  }

  function openModal() {
    resetForm();
    setIsOpen(true);
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmedName =
      name.trim();

    if (!trimmedName) {
      setErrorMessage(
        "Nama role wajib diisi.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response =
        await fetch(
          "/api/super-admin/roles",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              name: trimmedName,
              description:
                description.trim() || null,
              permissionIds: [],
            }),
          },
        );

      const data =
        (await response.json()) as CreateRoleResponse;

      if (!response.ok) {
        throw new Error(
          data.message ??
            "Gagal membuat role.",
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
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
      >
        <Plus className="h-4 w-4" />
        Buat Role
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Buat Custom Role
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Buat role baru untuk kebutuhan akses
                  khusus platform atau organisasi.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={isSubmitting}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              <div>
                <label
                  htmlFor="role-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Nama Role
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  id="role-name"
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(
                      event.target.value,
                    )
                  }
                  placeholder="Contoh: EO_FINANCE"
                  disabled={isSubmitting}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />

                <p className="mt-1.5 text-xs text-slate-500">
                  Gunakan huruf, angka, dan underscore.
                  Nama akan dinormalisasi oleh server.
                </p>
              </div>

              <div>
                <label
                  htmlFor="role-description"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Deskripsi
                </label>

                <textarea
                  id="role-description"
                  value={description}
                  onChange={(event) =>
                    setDescription(
                      event.target.value,
                    )
                  }
                  placeholder="Jelaskan tujuan atau cakupan role ini."
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-xs font-semibold leading-5 text-blue-700">
                  Role baru akan dibuat sebagai Custom
                  Role. Permission dapat diatur setelah
                  role berhasil dibuat melalui Permission
                  Matrix.
                </p>
              </div>

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
                    isSubmitting ||
                    name.trim().length === 0
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Buat Role
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
