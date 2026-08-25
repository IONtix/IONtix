"use client";

import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Plus,
  Shield,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type { SuperAdminRole } from "@/lib/platform-types";
import { isManagedRole } from "@/lib/admin/role-policy";

interface AddUserModalProps {
  roles: SuperAdminRole[];
  canCreateUser: boolean;
  canAssignRole: boolean;
}

const CREATEABLE_STATUSES = [
  {
    value: "ACTIVE",
    label: "Aktif",
  },
  {
    value: "SUSPENDED",
    label: "Suspend",
  },
  {
    value: "PENDING",
    label: "Pending",
  },
] as const;

export default function AddUserModal({
  roles,
  canCreateUser,
  canAssignRole,
}: AddUserModalProps) {
  const router = useRouter();

  const managedRoles = useMemo(
    () => roles.filter((role) => isManagedRole(role.name)),
    [roles],
  );

  const defaultRole = useMemo(() => {
    return (
      managedRoles.find((role) => role.name === "PARTICIPANT")?.name ??
      managedRoles[0]?.name ??
      "PARTICIPANT"
    );
  }, [managedRoles]);

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: defaultRole,
    status: "ACTIVE",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      password: "",
      role: defaultRole,
      status: "ACTIVE",
    });

    setErrorMessage("");
    setSuccessMessage("");
    setShowPassword(false);
  };

  const handleClose = () => {
    if (isLoading) {
      return;
    }

    setIsOpen(false);
    resetForm();
  };

  const updateField = (field: keyof typeof formData, value: string) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateUser) {
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const payload = {
        ...formData,
        role: canAssignRole ? formData.role : defaultRole,
      };

      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        message?: string;
      };

      if (!response.ok) {
        throw new Error(data.message ?? "Gagal membuat pengguna.");
      }

      setSuccessMessage("Pengguna berhasil ditambahkan.");

      window.setTimeout(() => {
        setIsOpen(false);
        resetForm();
        router.refresh();
      }, 700);
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat membuat pengguna.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!canCreateUser) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-blue-200 transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md"
      >
        <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
        Tambah User
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  Tambah Pengguna Baru
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Buat akun baru dan tentukan role sesuai hak akses.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
                aria-label="Tutup"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="space-y-7 px-6 py-6">
                {errorMessage && (
                  <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-600">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <p className="font-medium">{errorMessage}</p>
                  </div>
                )}

                {successMessage && (
                  <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                    <p className="font-medium">{successMessage}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-5">
                    <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-900">
                      Informasi Dasar
                    </h3>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Nama Lengkap <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(event) =>
                            updateField("name", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                          placeholder="Nama lengkap"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Alamat Email <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(event) =>
                            updateField("email", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                          placeholder="user@example.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Nomor Telepon
                      </label>

                      <div className="relative">
                        <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(event) =>
                            updateField("phone", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                          placeholder="+62 812..."
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5">
                    <h3 className="border-b border-slate-100 pb-2 text-sm font-bold uppercase tracking-wider text-slate-900">
                      Keamanan & Akses
                    </h3>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Role <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <Shield className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <select
                          disabled={!canAssignRole}
                          value={formData.role}
                          onChange={(event) =>
                            updateField("role", event.target.value)
                          }
                          className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          {roles.map((role) => (
                            <option key={role.id} value={role.name}>
                              {role.name}
                              {role.isSystem ? " • System" : ""}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Status Akun
                      </label>

                      <select
                        value={formData.status}
                        onChange={(event) =>
                          updateField("status", event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                      >
                        {CREATEABLE_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                        Kata Sandi <span className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          minLength={8}
                          value={formData.password}
                          onChange={(event) =>
                            updateField("password", event.target.value)
                          }
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-10 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
                          placeholder="Minimal 8 karakter"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-600"
                          aria-label={
                            showPassword
                              ? "Sembunyikan password"
                              : "Tampilkan password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isLoading}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-blue-700 disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    "Buat Pengguna"
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
