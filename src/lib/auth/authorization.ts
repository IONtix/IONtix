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
}

async function getCurrentDatabaseUser(): Promise<AuthorizedUser> {
  const session = await getServerSession(authOptions);

  const userId = session?.user?.id;

  if (!userId) {
    throw new AuthorizationError("Anda harus login terlebih dahulu.", 401);
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    include: {
      role: true,
    },
  });

  if (!user || user.isDeleted || user.status === "DELETED") {
    throw new AuthorizationError("Akun tidak ditemukan.", 401);
  }

  if (user.status !== "ACTIVE") {
    throw new AuthorizationError("Akun Anda tidak aktif.", 403);
  }

  if (!user.role?.name) {
    throw new AuthorizationError("Role akun belum dikonfigurasi.", 403);
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    status: user.status,
  };
}

export async function requireAuth(): Promise<AuthorizedUser> {
  return getCurrentDatabaseUser();
}

export async function requireSuperAdmin(): Promise<AuthorizedUser> {
  const user = await getCurrentDatabaseUser();

  if (user.role !== "SUPER_ADMIN") {
    throw new AuthorizationError("Akses ditolak. Hanya Super Admin.", 403);
  }

  return user;
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
