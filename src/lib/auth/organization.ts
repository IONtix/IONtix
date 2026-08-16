import prisma from "@/lib/prisma";

import { AuthorizationError, requireAuth } from "@/lib/auth/authorization";

export async function requireOrganizationMembership(organizationId?: string) {
  const user = await requireAuth();

  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId: user.id,
      isActive: true,
      organization: {
        status: "ACTIVE",
      },
      ...(organizationId ? { organizationId } : {}),
    },
    include: {
      organization: true,
      role: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (memberships.length === 0) {
    throw new AuthorizationError(
      "Anda tidak memiliki akses ke organisasi.",
      403,
    );
  }

  /*
   * Jika satu user memiliki lebih dari satu organisasi,
   * caller wajib menentukan organizationId agar
   * ownership tidak ambigu.
   */
  if (!organizationId && memberships.length > 1) {
    throw new AuthorizationError(
      "Organization context diperlukan karena akun memiliki lebih dari satu organisasi.",
      409,
    );
  }

  return memberships[0];
}

export async function requireOrganizationOwner(organizationId: string) {
  const membership = await requireOrganizationMembership(organizationId);

  if (!membership.isOwner) {
    throw new AuthorizationError(
      "Hanya owner organisasi yang dapat melakukan tindakan ini.",
      403,
    );
  }

  return membership;
}

export async function requireEventAccess(eventId: string) {
  const user = await requireAuth();

  if (user.role === "SUPER_ADMIN") {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: true,
      },
    });

    if (!event) {
      throw new AuthorizationError("Event tidak ditemukan.", 404);
    }

    return {
      user,
      event,
      membership: null,
    };
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organization: true,
    },
  });

  if (!event) {
    throw new AuthorizationError("Event tidak ditemukan.", 404);
  }

  /*
   * Canonical ownership:
   * event.organizationId → OrganizationMember
   */
  if (event.organizationId) {
    const membership = await prisma.organizationMember.findFirst({
      where: {
        organizationId: event.organizationId,
        userId: user.id,
        isActive: true,
        organization: {
          status: "ACTIVE",
        },
      },
      include: {
        organization: true,
        role: true,
      },
    });

    if (membership) {
      return {
        user,
        event,
        membership,
      };
    }

    throw new AuthorizationError(
      "Anda tidak memiliki akses ke event ini.",
      403,
    );
  }

  /*
   * Legacy fallback untuk event lama
   * yang masih menggunakan eoId.
   */
  if (event.eoId === user.id) {
    return {
      user,
      event,
      membership: null,
    };
  }

  throw new AuthorizationError("Anda tidak memiliki akses ke event ini.", 403);
}
