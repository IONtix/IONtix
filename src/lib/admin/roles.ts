import prisma from "@/lib/prisma";
import {
  AuthorizationError,
  requirePermission,
} from "@/lib/auth/authorization";

export interface RolePermissionInput {
  permissionIds: string[];
}

export interface CreateRoleInput {
  name: string;
  description?: string | null;
  permissionIds?: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string | null;
  permissionIds?: string[];
}

export interface RoleSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissionCount: number;
  userCount: number;
  organizationMemberCount: number;
}

const ROLE_NAME_PATTERN = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/;

function normalizeRoleName(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "_");
}

function validateRoleName(name: string): void {
  if (!name) {
    throw new AuthorizationError("Nama role wajib diisi.", 400);
  }

  if (name.length < 2) {
    throw new AuthorizationError("Nama role minimal 2 karakter.", 400);
  }

  if (name.length > 80) {
    throw new AuthorizationError("Nama role maksimal 80 karakter.", 400);
  }

  if (!ROLE_NAME_PATTERN.test(name)) {
    throw new AuthorizationError(
      "Nama role hanya boleh menggunakan huruf kapital, angka, dan underscore.",
      400,
    );
  }
}

function normalizeDescription(description?: string | null): string | null {
  if (description === undefined || description === null) {
    return null;
  }

  const normalized = description.trim();

  return normalized || null;
}

function normalizePermissionIds(permissionIds?: string[]): string[] {
  return Array.from(
    new Set((permissionIds ?? []).map((id) => id.trim()).filter(Boolean)),
  );
}

async function assertPermissionsExist(permissionIds: string[]): Promise<void> {
  if (permissionIds.length === 0) {
    return;
  }

  const permissions = await prisma.permission.findMany({
    where: {
      id: {
        in: permissionIds,
      },
    },
    select: {
      id: true,
    },
  });

  const existingIds = new Set(permissions.map((permission) => permission.id));

  const missingIds = permissionIds.filter((id) => !existingIds.has(id));

  if (missingIds.length > 0) {
    throw new AuthorizationError(
      "Satu atau beberapa permission tidak ditemukan.",
      400,
    );
  }
}

async function getRoleUsageCounts(roleId: string) {
  const [userCount, memberCount] = await prisma.$transaction([
    prisma.user.count({
      where: {
        roleId,
        isDeleted: false,
      },
    }),
    prisma.organizationMember.count({
      where: {
        roleId,
        isActive: true,
      },
    }),
  ]);

  return {
    userCount,
    organizationMemberCount: memberCount,
  };
}

export async function listRoles(): Promise<RoleSummary[]> {
  await requirePermission("roles.manage");

  const roles = await prisma.role.findMany({
    orderBy: [
      {
        isSystem: "desc",
      },
      {
        name: "asc",
      },
    ],
    include: {
      _count: {
        select: {
          permissions: true,
          users: true,
          members: true,
        },
      },
    },
  });

  return roles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    isSystem: role.isSystem,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
    permissionCount: role._count.permissions,
    userCount: role._count.users,
    organizationMemberCount: role._count.members,
  }));
}

export async function getRoleById(roleId: string) {
  await requirePermission("roles.manage");

  if (!roleId.trim()) {
    throw new AuthorizationError("ID role wajib diisi.", 400);
  }

  const role = await prisma.role.findUnique({
    where: {
      id: roleId,
    },
    include: {
      permissions: {
        orderBy: [
          {
            module: "asc",
          },
          {
            name: "asc",
          },
        ],
      },
      _count: {
        select: {
          users: true,
          members: true,
        },
      },
    },
  });

  if (!role) {
    throw new AuthorizationError("Role tidak ditemukan.", 404);
  }

  return role;
}

export async function listPermissions() {
  await requirePermission("roles.manage");

  return prisma.permission.findMany({
    orderBy: [
      {
        module: "asc",
      },
      {
        name: "asc",
      },
    ],
    select: {
      id: true,
      name: true,
      description: true,
      module: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export async function createRole(input: CreateRoleInput) {
  const actor = await requirePermission("roles.manage");

  const name = normalizeRoleName(input.name);

  validateRoleName(name);

  const description = normalizeDescription(input.description);

  const permissionIds = normalizePermissionIds(input.permissionIds);

  await assertPermissionsExist(permissionIds);

  const existingRole = await prisma.role.findUnique({
    where: {
      name,
    },
    select: {
      id: true,
    },
  });

  if (existingRole) {
    throw new AuthorizationError(`Role "${name}" sudah digunakan.`, 409);
  }

  const role = await prisma.$transaction(async (tx) => {
    const created = await tx.role.create({
      data: {
        name,
        description,
        isSystem: false,
        permissions:
          permissionIds.length > 0
            ? {
                connect: permissionIds.map((id) => ({
                  id,
                })),
              }
            : undefined,
      },
      include: {
        permissions: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "ROLE_CREATE",
        module: "roles",
        entityType: "Role",
        entityId: created.id,
        afterData: {
          id: created.id,
          name: created.name,
          description: created.description,
          isSystem: created.isSystem,
          permissionIds,
        },
        metadata: {
          actorEmail: actor.email,
        },
      },
    });

    return created;
  });

  return role;
}

export async function updateRole(roleId: string, input: UpdateRoleInput) {
  const actor = await requirePermission("roles.manage");

  if (!roleId.trim()) {
    throw new AuthorizationError("ID role wajib diisi.", 400);
  }

  const existingRole = await prisma.role.findUnique({
    where: {
      id: roleId,
    },
    include: {
      permissions: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!existingRole) {
    throw new AuthorizationError("Role tidak ditemukan.", 404);
  }

  /*
   * System role sepenuhnya read-only melalui
   * Role Manager. Perubahan nama, deskripsi,
   * maupun assignment permission tidak diizinkan.
   *
   * Source of truth system role tetap berasal
   * dari policy + seed platform.
   */
  if (
    existingRole.isSystem &&
    (input.name !== undefined ||
      input.description !== undefined ||
      input.permissionIds !== undefined)
  ) {
    throw new AuthorizationError(
      `System role "${existingRole.name}" tidak dapat diubah melalui Role Manager.`,
      403,
    );
  }

  const newName =
    input.name !== undefined
      ? normalizeRoleName(input.name)
      : existingRole.name;

  validateRoleName(newName);

  const permissionIds =
    input.permissionIds !== undefined
      ? normalizePermissionIds(input.permissionIds)
      : undefined;

  if (permissionIds) {
    await assertPermissionsExist(permissionIds);
  }

  if (newName !== existingRole.name) {
    const duplicate = await prisma.role.findUnique({
      where: {
        name: newName,
      },
      select: {
        id: true,
      },
    });

    if (duplicate && duplicate.id !== roleId) {
      throw new AuthorizationError(`Role "${newName}" sudah digunakan.`, 409);
    }
  }

  const description =
    input.description !== undefined
      ? normalizeDescription(input.description)
      : existingRole.description;

  const updatedRole = await prisma.$transaction(async (tx) => {
    const updated = await tx.role.update({
      where: {
        id: roleId,
      },
      data: {
        name: newName,
        description,
        ...(permissionIds
          ? {
              permissions: {
                set: permissionIds.map((id) => ({
                  id,
                })),
              },
            }
          : {}),
      },
      include: {
        permissions: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "ROLE_UPDATE",
        module: "roles",
        entityType: "Role",
        entityId: updated.id,
        beforeData: {
          id: existingRole.id,
          name: existingRole.name,
          description: existingRole.description,
          isSystem: existingRole.isSystem,
          permissionIds: existingRole.permissions.map(
            (permission) => permission.id,
          ),
        },
        afterData: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          isSystem: updated.isSystem,
          permissionIds: updated.permissions.map((permission) => permission.id),
        },
        metadata: {
          actorEmail: actor.email,
        },
      },
    });

    return updated;
  });

  return updatedRole;
}

export async function cloneRole(
  roleId: string,
  name: string,
  description?: string | null,
) {
  const actor = await requirePermission("roles.manage");

  if (!roleId.trim()) {
    throw new AuthorizationError("ID role sumber wajib diisi.", 400);
  }

  const sourceRole = await prisma.role.findUnique({
    where: {
      id: roleId,
    },
    include: {
      permissions: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!sourceRole) {
    throw new AuthorizationError("Role sumber tidak ditemukan.", 404);
  }

  const newName = normalizeRoleName(name);

  validateRoleName(newName);

  const normalizedDescription = normalizeDescription(
    description ??
      (sourceRole.description
        ? `${sourceRole.description} (Copy)`
        : `Salinan dari ${sourceRole.name}`),
  );

  const duplicate = await prisma.role.findUnique({
    where: {
      name: newName,
    },
    select: {
      id: true,
    },
  });

  if (duplicate) {
    throw new AuthorizationError(`Role "${newName}" sudah digunakan.`, 409);
  }

  const permissionIds = sourceRole.permissions.map(
    (permission) => permission.id,
  );

  const clonedRole = await prisma.$transaction(async (tx) => {
    const created = await tx.role.create({
      data: {
        name: newName,
        description: normalizedDescription,
        isSystem: false,
        permissions: {
          connect: permissionIds.map((id) => ({
            id,
          })),
        },
      },
      include: {
        permissions: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "ROLE_CLONE",
        module: "roles",
        entityType: "Role",
        entityId: created.id,
        afterData: {
          sourceRoleId: sourceRole.id,
          sourceRoleName: sourceRole.name,
          id: created.id,
          name: created.name,
          description: created.description,
          permissionIds,
        },
        metadata: {
          actorEmail: actor.email,
        },
      },
    });

    return created;
  });

  return clonedRole;
}

export async function deleteRole(roleId: string) {
  const actor = await requirePermission("roles.manage");

  if (!roleId.trim()) {
    throw new AuthorizationError("ID role wajib diisi.", 400);
  }

  const role = await prisma.role.findUnique({
    where: {
      id: roleId,
    },
    select: {
      id: true,
      name: true,
      description: true,
      isSystem: true,
      permissions: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          users: true,
          members: true,
        },
      },
    },
  });

  if (!role) {
    throw new AuthorizationError("Role tidak ditemukan.", 404);
  }

  if (role.isSystem) {
    throw new AuthorizationError(
      `Role system "${role.name}" tidak dapat dihapus.`,
      403,
    );
  }

  if (role._count.users > 0 || role._count.members > 0) {
    throw new AuthorizationError(
      `Role "${role.name}" masih digunakan oleh user atau anggota organisasi.`,
      409,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.role.delete({
      where: {
        id: roleId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "ROLE_DELETE",
        module: "roles",
        entityType: "Role",
        entityId: role.id,
        beforeData: {
          id: role.id,
          name: role.name,
          description: role.description,
          isSystem: role.isSystem,
          permissionIds: role.permissions.map((permission) => permission.id),
        },
        metadata: {
          actorEmail: actor.email,
        },
      },
    });
  });

  return {
    success: true,
    roleId,
  };
}

export async function updateRolePermissions(
  roleId: string,
  input: RolePermissionInput,
) {
  const actor = await requirePermission("roles.manage");

  if (!roleId.trim()) {
    throw new AuthorizationError("ID role wajib diisi.", 400);
  }

  const permissionIds = normalizePermissionIds(input.permissionIds);

  await assertPermissionsExist(permissionIds);

  const existingRole = await prisma.role.findUnique({
    where: {
      id: roleId,
    },
    include: {
      permissions: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!existingRole) {
    throw new AuthorizationError("Role tidak ditemukan.", 404);
  }

  if (existingRole.isSystem) {
    throw new AuthorizationError(
      `Permission untuk system role "${existingRole.name}" tidak dapat diubah melalui Role Manager.`,
      403,
    );
  }

  const previousPermissionIds = existingRole.permissions.map(
    (permission) => permission.id,
  );

  const updatedRole = await prisma.$transaction(async (tx) => {
    const updated = await tx.role.update({
      where: {
        id: roleId,
      },
      data: {
        permissions: {
          set: permissionIds.map((id) => ({
            id,
          })),
        },
      },
      include: {
        permissions: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorUserId: actor.id,
        action: "ROLE_PERMISSIONS_UPDATE",
        module: "roles",
        entityType: "Role",
        entityId: updated.id,
        beforeData: {
          permissionIds: previousPermissionIds,
        },
        afterData: {
          permissionIds: updated.permissions.map((permission) => permission.id),
        },
        metadata: {
          actorEmail: actor.email,
        },
      },
    });

    return updated;
  });

  return updatedRole;
}

export async function getRoleUsage(roleId: string) {
  await requirePermission("roles.manage");

  if (!roleId.trim()) {
    throw new AuthorizationError("ID role wajib diisi.", 400);
  }

  const role = await prisma.role.findUnique({
    where: {
      id: roleId,
    },
    select: {
      id: true,
      name: true,
      isSystem: true,
    },
  });

  if (!role) {
    throw new AuthorizationError("Role tidak ditemukan.", 404);
  }

  return {
    role,
    ...(await getRoleUsageCounts(roleId)),
  };
}
