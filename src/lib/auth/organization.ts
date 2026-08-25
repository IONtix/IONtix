import prisma from "@/lib/prisma";

import { AuthorizationError, requireAuth } from "@/lib/auth/authorization";

import type { Prisma } from "@/generated/prisma/client";

type OrganizationMembership = Prisma.OrganizationMemberGetPayload<{
  include: {
    organization: {
      select: {
        id: true;
        name: true;
        slug: true;
        status: true;
      };
    };
    role: {
      include: {
        permissions: {
          select: {
            id: true;
            name: true;
            description: true;
            module: true;
          };
        };
      };
    };
  };
}>;

type AuthorizedEvent = Prisma.EventGetPayload<{
  select: {
    id: true;
    organizationId: true;
    eoId: true;
    title: true;
    date: true;
    endDate: true;
    category: true;
    description: true;
    location: true;
    mapsUrl: true;
    rules: true;
    contactName: true;
    contactPhone: true;
    status: true;
    isPublished: true;
    publishedAt: true;
    organization: {
      select: {
        id: true;
        name: true;
        slug: true;
        status: true;
      };
    };
  };
}>;

export interface EventAccessResult {
  user: Awaited<ReturnType<typeof requireAuth>>;
  event: AuthorizedEvent;
  membership: OrganizationMembership | null;
}

/**
 * Memastikan user mempunyai membership aktif
 * pada organization tertentu.
 *
 * Backward compatible dengan implementasi lama:
 * - tanpa organizationId:
 *   boleh bila user hanya mempunyai satu organization
 * - bila mempunyai lebih dari satu organization:
 *   organizationId wajib diberikan
 */
export async function requireOrganizationMembership(
  organizationId?: string,
): Promise<OrganizationMembership> {
  const user = await requireAuth();

  const memberships = await prisma.organizationMember.findMany({
    where: {
      userId: user.id,
      isActive: true,
      organization: {
        status: "ACTIVE",
      },
      ...(organizationId
        ? {
            organizationId,
          }
        : {}),
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
      role: {
        include: {
          permissions: {
            select: {
              id: true,
              name: true,
              description: true,
              module: true,
            },
          },
        },
      },
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
   * caller wajib menentukan context organization.
   */
  if (!organizationId && memberships.length > 1) {
    throw new AuthorizationError(
      "Organization context diperlukan karena akun memiliki lebih dari satu organisasi.",
      409,
    );
  }

  return memberships[0];
}

/**
 * Memastikan user adalah owner organization.
 */
export async function requireOrganizationOwner(
  organizationId: string,
): Promise<OrganizationMembership> {
  const membership = await requireOrganizationMembership(organizationId);

  if (!membership.isOwner) {
    throw new AuthorizationError(
      "Hanya owner organisasi yang dapat melakukan tindakan ini.",
      403,
    );
  }

  return membership;
}

/**
 * Memeriksa apakah membership memiliki permission tertentu.
 *
 * Owner organisasi dianggap memiliki seluruh permission
 * pada organization tersebut.
 */
function membershipHasPermission(
  membership: OrganizationMembership,
  permission: string,
): boolean {
  if (membership.isOwner) {
    return true;
  }

  return (
    membership.role?.permissions.some((item) => item.name === permission) ??
    false
  );
}

async function getPlatformOrganizationMembership(
  organizationId: string,
  userId: string,
): Promise<OrganizationMembership> {
  const organization = await prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
    },
  });

  if (!organization) {
    throw new AuthorizationError("Organisasi tidak ditemukan.", 404);
  }

  if (organization.status !== "ACTIVE") {
    throw new AuthorizationError("Organisasi tidak aktif.", 403);
  }

  return {
    id: "platform-super-admin",
    organizationId: organization.id,
    userId,
    roleId: null,
    title: "Platform Super Admin",
    isOwner: true,
    isActive: true,
    createdAt: new Date(0),
    updatedAt: new Date(),
    organization,
    role: null,
  };
}

/**
 * Memastikan user memiliki membership sekaligus permission
 * pada organization tertentu.
 */
export async function requireResolvedOrganizationPermission(
  organizationId: string | undefined,
  permission: string,
): Promise<OrganizationMembership> {
  const normalizedPermission = permission.trim();

  if (!normalizedPermission) {
    throw new AuthorizationError(
      "Permission organisasi tidak valid.",
      500,
    );
  }

  const user = await requireAuth();

  if (user.role === "SUPER_ADMIN") {
    if (!organizationId) {
      throw new AuthorizationError(
        "Organization context diperlukan.",
        409,
      );
    }

    return getPlatformOrganizationMembership(
      organizationId,
      user.id,
    );
  }

  const membership =
    await requireOrganizationMembership(
      organizationId,
    );

  if (!membershipHasPermission(
    membership,
    normalizedPermission,
  )) {
    throw new AuthorizationError(
      `Akses organisasi ditolak. Permission "${normalizedPermission}" diperlukan.`,
      403,
    );
  }

  return membership;
}

export async function requireOrganizationPermission(
  organizationId: string,
  permission: string,
): Promise<OrganizationMembership> {
  const normalizedPermission = permission.trim();

  if (!normalizedPermission) {
    throw new AuthorizationError("Permission organisasi tidak valid.", 500);
  }

  const user = await requireAuth();

  /*
   * SUPER_ADMIN adalah platform-level authority.
   */
  if (user.role === "SUPER_ADMIN") {
    return getPlatformOrganizationMembership(organizationId, user.id);
  }

  const membership = await requireOrganizationMembership(organizationId);

  if (!membershipHasPermission(membership, normalizedPermission)) {
    throw new AuthorizationError(
      `Akses organisasi ditolak. Permission "${normalizedPermission}" diperlukan.`,
      403,
    );
  }

  return membership;
}

/**
 * Memastikan membership memiliki minimal satu
 * dari permission yang diberikan.
 */
export async function requireAnyOrganizationPermission(
  organizationId: string,
  permissions: string[],
): Promise<OrganizationMembership> {
  const normalizedPermissions = Array.from(
    new Set(permissions.map((permission) => permission.trim()).filter(Boolean)),
  );

  if (normalizedPermissions.length === 0) {
    throw new AuthorizationError(
      "Daftar permission organisasi tidak valid.",
      500,
    );
  }

  const user = await requireAuth();

  if (user.role === "SUPER_ADMIN") {
    return getPlatformOrganizationMembership(organizationId, user.id);
  }

  const membership = await requireOrganizationMembership(organizationId);

  const allowed = normalizedPermissions.some((permission) =>
    membershipHasPermission(membership, permission),
  );

  if (!allowed) {
    throw new AuthorizationError(
      "Akses organisasi ditolak. Anda tidak memiliki permission yang diperlukan.",
      403,
    );
  }

  return membership;
}

/**
 * Memastikan akses ke event.
 *
 * Prioritas:
 * 1. SUPER_ADMIN → platform access.
 * 2. event.organizationId → OrganizationMember.
 * 3. legacy event.eoId → user ownership fallback.
 */
export async function requireEventAccess(
  eventId: string,
): Promise<EventAccessResult> {
  const user = await requireAuth();

  const event = await prisma.event.findUnique({
    where: {
      id: eventId,
    },
    select: {
      id: true,
      organizationId: true,
      eoId: true,
      title: true,
      date: true,
      endDate: true,
      category: true,
      description: true,
      location: true,
      mapsUrl: true,
      rules: true,
      contactName: true,
      contactPhone: true,
      status: true,
      isPublished: true,
      publishedAt: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
  });

  if (!event) {
    throw new AuthorizationError("Event tidak ditemukan.", 404);
  }

  /*
   * Platform Super Admin mempunyai akses penuh
   * ke seluruh event platform.
   */
  if (user.role === "SUPER_ADMIN") {
    return {
      user,
      event,
      membership: null,
    };
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
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
          },
        },
        role: {
          include: {
            permissions: {
              select: {
                id: true,
                name: true,
                description: true,
                module: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new AuthorizationError(
        "Anda tidak memiliki akses ke event ini.",
        403,
      );
    }

    return {
      user,
      event,
      membership,
    };
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

/**
 * Memastikan user mempunyai permission tertentu
 * untuk event yang sedang diakses.
 */
export async function requireEventPermission(
  eventId: string,
  permission: string,
): Promise<EventAccessResult> {
  const normalizedPermission = permission.trim();

  if (!normalizedPermission) {
    throw new AuthorizationError("Event permission tidak valid.", 500);
  }

  const access = await requireEventAccess(eventId);

  /*
   * SUPER_ADMIN sudah lolos.
   */
  if (access.user.role === "SUPER_ADMIN") {
    return access;
  }

  /*
   * Legacy event tanpa organizationId.
   */
  if (!access.event.organizationId) {
    if (access.event.eoId === access.user.id) {
      return access;
    }

    throw new AuthorizationError(
      `Akses ditolak. Permission "${normalizedPermission}" diperlukan.`,
      403,
    );
  }

  if (!access.membership) {
    throw new AuthorizationError(
      "Organization membership tidak ditemukan.",
      403,
    );
  }

  if (!membershipHasPermission(access.membership, normalizedPermission)) {
    throw new AuthorizationError(
      `Akses event ditolak. Permission "${normalizedPermission}" diperlukan.`,
      403,
    );
  }

  return access;
}

/**
 * Memastikan event memiliki minimal satu
 * dari permission yang diberikan.
 */
export async function requireAnyEventPermission(
  eventId: string,
  permissions: string[],
): Promise<EventAccessResult> {
  const normalizedPermissions = Array.from(
    new Set(permissions.map((permission) => permission.trim()).filter(Boolean)),
  );

  if (normalizedPermissions.length === 0) {
    throw new AuthorizationError("Daftar event permission tidak valid.", 500);
  }

  const access = await requireEventAccess(eventId);

  if (access.user.role === "SUPER_ADMIN") {
    return access;
  }

  if (!access.event.organizationId) {
    if (access.event.eoId === access.user.id) {
      return access;
    }

    throw new AuthorizationError("Akses event ditolak.", 403);
  }

  if (!access.membership) {
    throw new AuthorizationError(
      "Organization membership tidak ditemukan.",
      403,
    );
  }

  const allowed = normalizedPermissions.some((permission) =>
    membershipHasPermission(access.membership!, permission),
  );

  if (!allowed) {
    throw new AuthorizationError(
      "Akses event ditolak. Anda tidak memiliki permission yang diperlukan.",
      403,
    );
  }

  return access;
}
