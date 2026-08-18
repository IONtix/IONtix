import { CheckCircle2, KeyRound, ShieldCheck, Users } from "lucide-react";
import { redirect } from "next/navigation";

import {
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

import { listPermissions, listRoles } from "@/lib/admin/roles";

import PermissionMatrix from "./_components/PermissionMatrix";
import RoleEditor from "./_components/RoleEditor";

function formatDate(value: Date) {
  return value.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getRoleTypeLabel(isSystem: boolean) {
  return isSystem ? "System Role" : "Custom Role";
}

function getRoleBadgeClass(isSystem: boolean) {
  return isSystem
    ? "border-blue-200 bg-blue-50 text-blue-700"
    : "border-violet-200 bg-violet-50 text-violet-700";
}

function groupPermissions(
  permissions: Array<{
    id: string;
    name: string;
    description: string | null;
    module: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
) {
  const grouped = new Map<string, typeof permissions>();

  for (const permission of permissions) {
    const moduleName = permission.module?.trim() || "other";

    const current = grouped.get(moduleName) ?? [];

    current.push(permission);
    grouped.set(moduleName, current);
  }

  return Array.from(grouped.entries()).sort(([moduleA], [moduleB]) =>
    moduleA.localeCompare(moduleB, "id"),
  );
}

function formatModuleName(module: string) {
  return module
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function RolesManagementPage() {
  try {
    await requirePermission("roles.manage");
  } catch (error: unknown) {
    if (
      error instanceof AuthorizationError &&
      (error.status === 401 || error.status === 403)
    ) {
      redirect("/super-admin/login");
    }

    throw error;
  }

  const [roles, permissions] = await Promise.all([
    listRoles(),
    listPermissions(),
  ]);

  const systemRoles = roles.filter((role) => role.isSystem);

  const customRoles = roles.filter((role) => !role.isSystem);

  const permissionGroups = groupPermissions(permissions);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      {/* HEADER */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            <ShieldCheck className="h-4 w-4" />
            Access Control
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Roles & Permissions
          </h1>

          <p className="mt-1 max-w-3xl text-sm font-medium text-slate-500">
            Kelola role platform dan katalog permission untuk mengatur hak akses
            pengguna serta anggota organisasi secara terstruktur.
          </p>
        </div>

        <div className="shrink-0">
          <RoleEditor />
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ShieldCheck className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-slate-500">Total Role</p>

              <p className="mt-1 text-2xl font-bold text-slate-900">
                {roles.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600">
              <KeyRound className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-blue-700">System Role</p>

              <p className="mt-1 text-2xl font-bold text-blue-900">
                {systemRoles.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-violet-600">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-violet-700">Custom Role</p>

              <p className="mt-1 text-2xl font-bold text-violet-900">
                {customRoles.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-medium text-emerald-700">
                Permission Catalog
              </p>

              <p className="mt-1 text-2xl font-bold text-emerald-900">
                {permissions.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ROLE TABLE */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex flex-col gap-1">
            <h2 className="font-bold text-slate-900">Daftar Role</h2>

            <p className="text-xs text-slate-500">
              {roles.length} role terdaftar di platform.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-white text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">Role</th>

                <th className="px-6 py-4 font-semibold tracking-wider">Tipe</th>

                <th className="px-6 py-4 font-semibold tracking-wider">
                  Permissions
                </th>

                <th className="px-6 py-4 font-semibold tracking-wider">
                  Users
                </th>

                <th className="px-6 py-4 font-semibold tracking-wider">
                  Organization Members
                </th>

                <th className="px-6 py-4 font-semibold tracking-wider">
                  Diperbarui
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {roles.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="mx-auto max-w-sm">
                      <p className="font-semibold text-slate-800">
                        Belum ada role
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Role belum tersedia pada database.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                roles.map((role) => (
                  <tr
                    key={role.id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {role.name}
                        </p>

                        <p className="mt-1 max-w-xs text-xs text-slate-500">
                          {role.description || "Tidak ada deskripsi."}
                        </p>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getRoleBadgeClass(
                          role.isSystem,
                        )}`}
                      >
                        {getRoleTypeLabel(role.isSystem)}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800">
                        {role.permissionCount}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800">
                        {role.userCount}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-800">
                        {role.organizationMemberCount}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(role.updatedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* PERMISSION MATRIX */}
      <PermissionMatrix roles={roles} permissions={permissions} />

      {/* PERMISSION CATALOG */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <h2 className="font-bold text-slate-900">Permission Catalog</h2>

          <p className="mt-1 text-xs text-slate-500">
            Seluruh capability yang tersedia untuk Role & Permission Manager.
          </p>
        </div>

        <div className="space-y-6 p-6">
          {permissionGroups.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              Permission catalog belum tersedia.
            </div>
          ) : (
            permissionGroups.map(([moduleName, modulePermissions]) => (
              <div
                key={moduleName}
                className="overflow-hidden rounded-xl border border-slate-200"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      {formatModuleName(moduleName)}
                    </h3>

                    <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-500">
                      {modulePermissions.length} permission
                    </span>
                  </div>
                </div>

                <div className="grid gap-px bg-slate-100 md:grid-cols-2 xl:grid-cols-3">
                  {modulePermissions.map((permission) => (
                    <div key={permission.id} className="bg-white p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                          <KeyRound className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                          <p className="break-all text-sm font-semibold text-slate-800">
                            {permission.name}
                          </p>

                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            {permission.description || "Tidak ada deskripsi."}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
