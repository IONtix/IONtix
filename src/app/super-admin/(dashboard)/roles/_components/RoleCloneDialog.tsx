"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Copy, Loader2, X } from "lucide-react";

interface RoleCloneDialogProps {
  role: {
    id: string;
    name: string;
    description: string | null;
    isSystem: boolean;
  };
  onSuccess?: () => void;
}

interface CloneRoleResponse {
  success?: boolean;
  message?: string;
}

export default function RoleCloneDialog({
  role,
  onSuccess,
}: RoleCloneDialogProps) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(`${role.name}_COPY`);
  const [description, setDescription] = useState(
    role.description
      ? `${role.description} (Copy)`
      : `Salinan dari ${role.name}`,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  function resetForm() {
    setName(`${role.name}_COPY`);
    setDescription(
      role.description
        ? `${role.description} (Copy)`
        : `Salinan dari ${role.name}`,
    );
    setErrorMessage("");
    setIsSubmitting(false);
  }

  function openDialog() {
    resetForm();
    setIsOpen(true);
  }

  function closeDialog() {
    if (isSubmitting) {
      return;
    }

    setIsOpen(false);
    resetForm();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName) {
      setErrorMessage("Nama role hasil clone wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`/api/super-admin/roles/${role.id}/clone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          description: description.trim() || null,
        }),
      });

      const data = (await response.json()) as CloneRoleResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Gagal melakukan clone role.");
      }

      setIsOpen(false);
      resetForm();

      router.refresh();
      onSuccess?.();
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error ? error.message : "Gagal melakukan clone role.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
        aria-label={`Clone role ${role.name}`}
      >
        <Copy className="h-3.5 w-3.5" />
        Clone
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Clone Role</h2>

                <p className="mt-1 text-sm text-slate-500">
                  Buat salinan role beserta seluruh permission dari role sumber.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDialog}
                disabled={isSubmitting}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Role Sumber
                </p>

                <p className="mt-1 text-sm font-bold text-slate-900">
                  {role.name}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Hasil clone selalu dibuat sebagai Custom Role.
                </p>
              </div>

              <div>
                <label
                  htmlFor={`clone-role-name-${role.id}`}
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Nama Role Baru
                  <span className="ml-1 text-red-500">*</span>
                </label>

                <input
                  id={`clone-role-name-${role.id}`}
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={isSubmitting}
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor={`clone-role-description-${role.id}`}
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Deskripsi
                </label>

                <textarea
                  id={`clone-role-description-${role.id}`}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={4}
                  disabled={isSubmitting}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-xs font-semibold leading-5 text-blue-700">
                  Seluruh permission dari{" "}
                  <span className="font-bold">{role.name}</span> akan disalin ke
                  role baru. Permission dapat disesuaikan setelah clone selesai.
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
                  onClick={closeDialog}
                  disabled={isSubmitting}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || name.trim().length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Meng-clone...
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Clone Role
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
