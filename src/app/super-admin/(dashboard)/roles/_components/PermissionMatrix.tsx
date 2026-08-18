"use client";

import { AlertCircle, Check, Loader2, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  permissionCount: number;
  userCount: number;
  organizationMemberCount: number;
}

interface PermissionItem {
  id: string;
  name: string;
  description: string | null;
  module: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface PermissionMatrixProps {
  roles: RoleSummary[];
  permissions: PermissionItem[];
}

interface RolePermissionResponse {
  success?: boolean;
  data?: {
    role?: {
      id: string;
      name: string;
      description: string | null;
      isSystem: boolean;
    };
    permissions?: Array<{
      id: string;
      name: string;
      description: string | null;
      module: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  message?: string;
}

interface SaveResponse {
  success?: boolean;
  message?: string;
}

function formatModuleName(module: string) {
  return module
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function groupPermissions(permissions: PermissionItem[]) {
  const grouped = new Map<string, PermissionItem[]>();

  for (const permission of permissions) {
    const moduleName = permission.module?.trim() || "other";

    const current = grouped.get(moduleName) ?? [];

    current.push(permission);

    grouped.set(moduleName, current);
  }

  return Array.from(grouped.entries()).sort(([moduleA], [moduleB]) =>
    moduleA.localeCompare(moduleB),
  );
}

export default function PermissionMatrix({
  roles,
  permissions,
}: PermissionMatrixProps) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");

  const [selectedPermissionIds, setSelectedPermissionIds] = useState<
    Set<string>
  >(new Set());

  const [isLoading, setIsLoading] = useState(roles.length > 0);

  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [successMessage, setSuccessMessage] = useState("");

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;

  const permissionGroups = useMemo(
    () => groupPermissions(permissions),
    [permissions],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadRolePermissions() {
      if (!selectedRoleId) {
        setSelectedPermissionIds(new Set());
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const response = await fetch(
          `/api/super-admin/roles/${selectedRoleId}/permissions`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const data = (await response.json()) as RolePermissionResponse;

        if (!response.ok) {
          throw new Error(data.message ?? "Gagal mengambil permission role.");
        }

        if (cancelled) {
          return;
        }

        const permissionIds =
          data.data?.permissions?.map((permission) => permission.id) ?? [];

        setSelectedPermissionIds(new Set(permissionIds));
      } catch (error: unknown) {
        if (cancelled) {
          return;
        }

        setSelectedPermissionIds(new Set());

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Gagal mengambil permission role.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadRolePermissions();

    return () => {
      cancelled = true;
    };
  }, [selectedRoleId]);

  const togglePermission = (permissionId: string) => {
    if (selectedRole?.isSystem) {
      return;
    }

    setSelectedPermissionIds((current) => {
      const next = new Set(current);

      if (next.has(permissionId)) {
        next.delete(permissionId);
      } else {
        next.add(permissionId);
      }

      return next;
    });

    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleSave = async () => {
    if (!selectedRole) {
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(
        `/api/super-admin/roles/${selectedRole.id}/permissions`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            permissionIds: Array.from(selectedPermissionIds),
          }),
        },
      );

      const data = (await response.json()) as SaveResponse;

      if (!response.ok) {
        throw new Error(data.message ?? "Gagal menyimpan permission role.");
      }

      setSuccessMessage(data.message ?? "Permission role berhasil diperbarui.");
    } catch (error: unknown) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan permission role.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const activePermissionCount = selectedPermissionIds.size;

  const totalPermissionCount = permissions.length;

  if (roles.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <ShieldCheck className="mx-auto h-8 w-8 text-slate-300" />

        <h2 className="mt-3 text-lg font-bold text-slate-800">
          Belum ada role
        </h2>

        <p className="mt-1 text-sm text-slate-500">
          Permission Matrix belum dapat digunakan sebelum role tersedia.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />

              <h2 className="font-bold text-slate-900">Permission Matrix</h2>
            </div>

            <p className="text-sm text-slate-500">
              Pilih role lalu atur capability yang boleh digunakan role
              tersebut.
            </p>
          </div>

          <div className="min-w-65">
            <label
              htmlFor="permission-role"
              className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500"
            >
              Role Aktif
            </label>

            <select
              id="permission-role"
              value={selectedRoleId}
              onChange={(event) => setSelectedRoleId(event.target.value)}
              disabled={isLoading || isSaving}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                  {role.isSystem ? " • System" : " • Custom"}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-bold ${
                selectedRole?.isSystem
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-violet-200 bg-violet-50 text-violet-700"
              }`}
            >
              {selectedRole?.isSystem ? "System Role" : "Custom Role"}
            </span>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600">
              {activePermissionCount} / {totalPermissionCount} aktif
            </span>
          </div>

          {selectedRole?.isSystem && (
            <p className="text-xs font-medium text-amber-600">
              System role dilindungi oleh kebijakan platform. Perubahan tetap
              divalidasi oleh server.
            </p>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="mx-6 mt-5 flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

          <p>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="mx-6 mt-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="p-6">
        {isLoading ? (
          <div className="flex min-h-60 items-center justify-center">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Memuat permission role...
            </div>
          </div>
        ) : permissionGroups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            Permission catalog belum tersedia.
          </div>
        ) : (
          <div className="space-y-5">
            {permissionGroups.map(([moduleName, modulePermissions]) => {
              const moduleActiveCount = modulePermissions.filter((permission) =>
                selectedPermissionIds.has(permission.id),
              ).length;

              return (
                <div
                  key={moduleName}
                  className="overflow-hidden rounded-xl border border-slate-200"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {formatModuleName(moduleName)}
                      </h3>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {moduleActiveCount} dari {modulePermissions.length}{" "}
                        aktif
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">
                    {modulePermissions.map((permission) => {
                      const isChecked = selectedPermissionIds.has(
                        permission.id,
                      );

                      return (
                        <label
                          key={permission.id}
                          className={`group flex items-start gap-3 bg-white p-4 transition-colors ${
                            selectedRole?.isSystem
                              ? "cursor-not-allowed"
                              : "cursor-pointer"
                          } ${
                            isChecked
                              ? "bg-blue-50/30"
                              : selectedRole?.isSystem
                                ? ""
                                : "hover:bg-slate-50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(permission.id)}
                            disabled={
                              isSaving ||
                              selectedRole?.isSystem === true
                            }
                            className="sr-only"
                          />

                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                              isChecked
                                ? "border-blue-600 bg-blue-600 text-white"
                                : "border-slate-300 bg-white text-transparent group-hover:border-blue-400"
                            }`}
                            aria-hidden="true"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </span>

                          <span className="min-w-0">
                            <span className="block break-all text-sm font-semibold text-slate-800">
                              {permission.name}
                            </span>

                            <span className="mt-1 block text-xs leading-5 text-slate-500">
                              {permission.description || "Tidak ada deskripsi."}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-slate-500">
          Perubahan disimpan sebagai satu set permission untuk role yang
          dipilih.
        </p>

        <button
          type="button"
          onClick={handleSave}
          disabled={
            isLoading ||
            isSaving ||
            !selectedRole ||
            selectedRole.isSystem
          }
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {selectedRole?.isSystem ? (
            <>
              <ShieldCheck className="h-4 w-4" />
              System Role • Read Only
            </>
          ) : isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Simpan Permission
            </>
          )}
        </button>
      </div>
    </section>
  );
}
