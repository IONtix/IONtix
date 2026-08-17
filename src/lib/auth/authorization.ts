import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import prisma from "@/lib/prisma";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export interface AuthorizedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING" | "DELETED";
  permissions: string[];
}

export type PermissionName = string;

interface DatabaseUserWithAuthorization {
  id: string;
  name: string;
  email: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING" | "DELETED";
  isDeleted: boolean;
  role: {
    name: string;
    permissions: Array<{
      name: string;
    }>;
  } | null;
}

async function getCurrentDatabaseUser(): Promise<AuthorizedUser> {
  const session = await getServerSession(authOptions);

  const userId = session?.user?.id;

  if (!userId) {
    throw new AuthorizationError("Anda harus login terlebih dahulu.", 401);
  }

  const user = (await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
      isDeleted: true,
      role: {
        select: {
          name: true,
          permissions: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  })) as DatabaseUserWithAuthorization | null;

  if (!user || user.isDeleted || user.status === "DELETED") {
    throw new AuthorizationError("Akun tidak ditemukan.", 401);
  }

  if (user.status !== "ACTIVE") {
    throw new AuthorizationError("Akun Anda tidak aktif.", 403);
  }

  if (!user.role?.name) {
    throw new AuthorizationError("Role akun belum dikonfigurasi.", 403);
  }

  const permissions = Array.from(
    new Set(user.role.permissions.map((permission) => permission.name)),
  );

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    status: user.status,
    permissions,
  };
}

export async function requireAuth(): Promise<AuthorizedUser> {
  return getCurrentDatabaseUser();
}

/**
 * Platform-level authorization.
 *
 * Tetap dipertahankan untuk route yang memang eksklusif
 * Super Admin platform dan backward compatibility.
 */
export async function requireSuperAdmin(): Promise<AuthorizedUser> {
  const user = await getCurrentDatabaseUser();

  if (user.role !== "SUPER_ADMIN") {
    throw new AuthorizationError("Akses ditolak. Hanya Super Admin.", 403);
  }

  return user;
}

/**
 * Memeriksa apakah user memiliki permission tertentu.
 *
 * SUPER_ADMIN selalu mendapatkan akses platform-level.
 */
export function hasPermission(
  user: AuthorizedUser,
  permission: PermissionName,
): boolean {
  if (user.role === "SUPER_ADMIN") {
    return true;
  }

  return user.permissions.includes(permission);
}

/**
 * Memastikan user memiliki satu permission tertentu.
 */
export async function requirePermission(
  permission: PermissionName,
): Promise<AuthorizedUser> {
  const normalizedPermission = permission.trim();

  if (!normalizedPermission) {
    throw new AuthorizationError("Permission tidak valid.", 500);
  }

  const user = await getCurrentDatabaseUser();

  if (!hasPermission(user, normalizedPermission)) {
    throw new AuthorizationError(
      `Akses ditolak. Permission "${normalizedPermission}" diperlukan.`,
      403,
    );
  }

  return user;
}

/**
 * Memastikan user memiliki minimal satu dari permission
 * yang diberikan.
 */
export async function requireAnyPermission(
  permissions: PermissionName[],
): Promise<AuthorizedUser> {
  const normalizedPermissions = Array.from(
    new Set(permissions.map((permission) => permission.trim()).filter(Boolean)),
  );

  if (normalizedPermissions.length === 0) {
    throw new AuthorizationError("Daftar permission tidak valid.", 500);
  }

  const user = await getCurrentDatabaseUser();

  if (user.role === "SUPER_ADMIN") {
    return user;
  }

  const allowed = normalizedPermissions.some((permission) =>
    user.permissions.includes(permission),
  );

  if (!allowed) {
    throw new AuthorizationError(
      "Akses ditolak. Anda tidak memiliki permission yang diperlukan.",
      403,
    );
  }

  return user;
}

/**
 * Memastikan user memiliki seluruh permission
 * yang diberikan.
 */
export async function requireAllPermissions(
  permissions: PermissionName[],
): Promise<AuthorizedUser> {
  const normalizedPermissions = Array.from(
    new Set(permissions.map((permission) => permission.trim()).filter(Boolean)),
  );

  if (normalizedPermissions.length === 0) {
    throw new AuthorizationError("Daftar permission tidak valid.", 500);
  }

  const user = await getCurrentDatabaseUser();

  if (user.role === "SUPER_ADMIN") {
    return user;
  }

  const missingPermissions = normalizedPermissions.filter(
    (permission) => !user.permissions.includes(permission),
  );

  if (missingPermissions.length > 0) {
    throw new AuthorizationError(
      `Akses ditolak. Permission yang belum tersedia: ${missingPermissions.join(", ")}.`,
      403,
    );
  }

  return user;
}

/**
 * Helper sinkron untuk pemeriksaan permission pada
 * AuthorizedUser yang sudah diperoleh sebelumnya.
 */
export function assertPermission(
  user: AuthorizedUser,
  permission: PermissionName,
): void {
  const normalizedPermission = permission.trim();

  if (!normalizedPermission) {
    throw new AuthorizationError("Permission tidak valid.", 500);
  }

  if (!hasPermission(user, normalizedPermission)) {
    throw new AuthorizationError(
      `Akses ditolak. Permission "${normalizedPermission}" diperlukan.`,
      403,
    );
  }
}

/**
 * Helper untuk kebutuhan UI/API yang ingin mengetahui
 * daftar permission aktif user.
 */
export function getPermissions(user: AuthorizedUser): string[] {
  return [...user.permissions];
}

export function authorizationErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthorizationError) {
    return NextResponse.json(
      {
        message: error.message,
      },
      {
        status: error.status,
      },
    );
  }

  console.error("Authorization error:", error);

  return NextResponse.json(
    {
      message: "Terjadi kesalahan pada server.",
    },
    {
      status: 500,
    },
  );
}
