import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Mail,
  Search,
  Shield,
  User,
  Users,
} from "lucide-react";

import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth/authorization";
import { UserStatus } from "@/generated/prisma/client";
import type { SuperAdminRole, SuperAdminUser } from "@/lib/platform-types";

import AddUserModal from "./_components/AddUserModal";
import UserActionMenu from "./_components/UserActionMenu";

const PAGE_SIZE = 20;

interface UsersManagementPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function getStringParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function buildHref({
  page,
  query,
  role,
  status,
}: {
  page: number;
  query: string;
  role: string;
  status: string;
}) {
  const params = new URLSearchParams();

  if (query) {
    params.set("q", query);
  }

  if (role) {
    params.set("role", role);
  }

  if (status) {
    params.set("status", status);
  }

  params.set("page", String(page));

  return `/super-admin/users?${params.toString()}`;
}

function formatDate(value?: string | Date | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getRoleBadge(roleName: string) {
  if (roleName === "SUPER_ADMIN") {
    return {
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: Shield,
    };
  }

  if (roleName === "EO") {
    return {
      className: "bg-orange-50 text-orange-700 border-orange-200",
      icon: Building2,
    };
  }

  return {
    className: "bg-slate-100 text-slate-700 border-slate-200",
    icon: User,
  };
}

function getStatusBadge(status?: string | null) {
  switch (status) {
    case UserStatus.ACTIVE:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";

    case UserStatus.SUSPENDED:
      return "bg-amber-50 text-amber-700 border-amber-200";

    case UserStatus.PENDING:
      return "bg-blue-50 text-blue-700 border-blue-200";

    case UserStatus.DELETED:
      return "bg-red-50 text-red-700 border-red-200";

    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default async function UsersManagementPage({
  searchParams,
}: UsersManagementPageProps) {
  let actor;

  try {
    actor = await requirePermission("users.view");
  } catch {
    redirect("/super-admin/login");
  }

  const params = (await searchParams) ?? {};

  const query = getStringParam(params.q).trim();
  const roleFilter = getStringParam(params.role).trim();
  const statusFilter = getStringParam(params.status).trim().toUpperCase();

  const requestedPage = Number(getStringParam(params.page) || "1");

  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  const validStatus = Object.values(UserStatus).includes(
    statusFilter as UserStatus,
  )
    ? (statusFilter as UserStatus)
    : "";

  const where = {
    ...(validStatus === UserStatus.DELETED
      ? {
          isDeleted: true,
          status: UserStatus.DELETED,
        }
      : {
          isDeleted: false,
          ...(validStatus
            ? {
                status: validStatus,
              }
            : {}),
        }),

    ...(roleFilter
      ? {
          role: {
            name: roleFilter,
          },
        }
      : {}),

    ...(query
      ? {
          OR: [
            {
              name: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
            {
              phone: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
  };

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    superAdminUsers,
    eoUsers,
    totalFilteredUsers,
    users,
    availableRoles,
  ] = await prisma.$transaction([
    prisma.user.count({
      where: {
        isDeleted: false,
      },
    }),

    prisma.user.count({
      where: {
        isDeleted: false,
        status: UserStatus.ACTIVE,
      },
    }),

    prisma.user.count({
      where: {
        isDeleted: false,
        status: UserStatus.SUSPENDED,
      },
    }),

    prisma.user.count({
      where: {
        isDeleted: false,
        role: {
          name: "SUPER_ADMIN",
        },
      },
    }),

    prisma.user.count({
      where: {
        isDeleted: false,
        role: {
          name: "EO",
        },
      },
    }),

    prisma.user.count({
      where,
    }),

    prisma.user.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        isDeleted: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: {
            id: true,
            name: true,
            isSystem: true,
          },
        },
      },
    }),

    prisma.role.findMany({
      orderBy: [
        {
          isSystem: "desc",
        },
        {
          name: "asc",
        },
      ],
      select: {
        id: true,
        name: true,
        isSystem: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalFilteredUsers / PAGE_SIZE));

  const safePage = Math.min(currentPage, totalPages);

  const normalizedUsers: SuperAdminUser[] = users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status,
    isDeleted: user.isDeleted,
    emailVerifiedAt: user.emailVerifiedAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    role: user.role,
  }));

  const roles: SuperAdminRole[] = availableRoles.map((role) => ({
    id: role.id,
    name: role.name,
    isSystem: role.isSystem,
  }));

  const canManageUsers =
    actor.role === "SUPER_ADMIN" || actor.permissions.includes("users.manage");

  const canManageRoles =
    actor.role === "SUPER_ADMIN" || actor.permissions.includes("roles.manage");

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
            <Users className="h-4 w-4" />
            Platform Users
          </div>

          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Manajemen Pengguna
          </h2>

          <p className="mt-1 max-w-2xl text-sm font-medium text-slate-500">
            Kelola identitas, status, role, dan akses pengguna dari satu pusat
            administrasi platform.
          </p>
        </div>

        <AddUserModal
          roles={roles}
          canCreateUser={canManageUsers}
          canAssignRole={canManageRoles}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Pengguna</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {totalUsers.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
          <p className="text-sm font-medium text-emerald-700">Aktif</p>
          <p className="mt-2 text-2xl font-bold text-emerald-800">
            {activeUsers.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-5 shadow-sm">
          <p className="text-sm font-medium text-amber-700">Suspended</p>
          <p className="mt-2 text-2xl font-bold text-amber-800">
            {suspendedUsers.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Super Admin</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {superAdminUsers.toLocaleString("id-ID")}
          </p>
        </div>

        <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">EO</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {eoUsers.toLocaleString("id-ID")}
          </p>
        </div>
      </div>

      <form
        method="GET"
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              name="q"
              defaultValue={query}
              placeholder="Cari nama, email, atau nomor telepon..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-9 pr-4 text-sm outline-none transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          <select
            name="role"
            defaultValue={roleFilter}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          >
            <option value="">Semua Role</option>

            {roles.map((role) => (
              <option key={role.id} value={role.name}>
                {role.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
          >
            <option value="">Semua Status</option>
            <option value={UserStatus.ACTIVE}>ACTIVE</option>
            <option value={UserStatus.SUSPENDED}>SUSPENDED</option>
            <option value={UserStatus.PENDING}>PENDING</option>
            <option value={UserStatus.DELETED}>DELETED</option>
          </select>

          <button
            type="submit"
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
          >
            Terapkan
          </button>
        </div>
      </form>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-bold text-slate-900">Daftar Pengguna</p>
            <p className="text-xs text-slate-500">
              Menampilkan{" "}
              <span className="font-semibold text-slate-700">
                {totalFilteredUsers.toLocaleString("id-ID")}
              </span>{" "}
              hasil.
            </p>
          </div>

          <p className="text-xs font-medium text-slate-500">
            Halaman {safePage} dari {totalPages}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-245 text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Pengguna
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Kontak
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">Role</th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Bergabung
                </th>
                <th className="px-6 py-4 text-right font-semibold tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {normalizedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center">
                      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                        <User className="h-5 w-5" />
                      </div>

                      <p className="font-semibold text-slate-800">
                        Tidak ada pengguna
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Coba ubah kata pencarian atau filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                normalizedUsers.map((user) => {
                  const roleName = user.role?.name ?? "PESERTA";

                  const badge = getRoleBadge(roleName);

                  const BadgeIcon = badge.icon;

                  return (
                    <tr
                      key={user.id}
                      className="group transition-colors hover:bg-slate-50/80"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-100 font-bold text-blue-600">
                            {user.name
                              ? user.name.charAt(0).toUpperCase()
                              : "U"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">
                              {user.name || "Tanpa Nama"}
                            </p>

                            <p className="mt-0.5 text-[11px] font-mono text-slate-400">
                              {user.id.substring(0, 10)}
                              ...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Mail className="h-4 w-4 shrink-0 text-slate-400" />

                          <div>
                            <p className="max-w-65 truncate">{user.email}</p>

                            {user.phone && (
                              <p className="mt-0.5 text-xs text-slate-400">
                                {user.phone}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${badge.className}`}
                        >
                          <BadgeIcon className="h-3 w-3" />
                          {roleName}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${getStatusBadge(
                            user.status,
                          )}`}
                        >
                          {user.status ?? "-"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-slate-500">
                        {formatDate(user.createdAt)}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end">
                          <UserActionMenu
                            user={user}
                            roles={roles}
                            currentUserId={actor.id}
                            canEdit={canManageUsers}
                            canChangeRole={canManageRoles}
                            canManageStatus={canManageUsers}
                            canDelete={canManageUsers}
                            canResetPassword={canManageUsers}
                            canImpersonate={canManageUsers}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            Menampilkan{" "}
            <span className="font-semibold text-slate-900">
              {totalFilteredUsers ? (safePage - 1) * PAGE_SIZE + 1 : 0}
            </span>{" "}
            –{" "}
            <span className="font-semibold text-slate-900">
              {Math.min(safePage * PAGE_SIZE, totalFilteredUsers)}
            </span>{" "}
            dari{" "}
            <span className="font-semibold text-slate-900">
              {totalFilteredUsers}
            </span>{" "}
            pengguna
          </p>

          <div className="flex items-center gap-2">
            {safePage > 1 ? (
              <Link
                href={buildHref({
                  page: safePage - 1,
                  query,
                  role: roleFilter,
                  status: statusFilter,
                })}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400">
                <ChevronLeft className="h-4 w-4" />
                Sebelumnya
              </span>
            )}

            {safePage < totalPages ? (
              <Link
                href={buildHref({
                  page: safePage + 1,
                  query,
                  role: roleFilter,
                  status: statusFilter,
                })}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-400">
                Selanjutnya
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
