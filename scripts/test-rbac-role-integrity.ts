import "dotenv/config";

import crypto from "node:crypto";

import prisma from "@/lib/prisma";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `TEST FAILED: ${message}`,
    );
  }
}

async function main(): Promise<void> {
  console.log(
    "Running RBAC role integrity regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let roleId: string | null = null;

  try {
    const permission =
      await prisma.permission.findFirst({
        where: {
          name: "events.view",
        },
        select: {
          id: true,
          name: true,
        },
      });

    assert(
      permission,
      "Permission events.view harus tersedia.",
    );

    const role =
      await prisma.role.create({
        data: {
          name:
            `RBAC_INTEGRITY_${suffix}`,
          description:
            "Temporary RBAC integrity regression role",
          isSystem: false,
          permissions: {
            connect: {
              id: permission.id,
            },
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          isSystem: true,
          permissions: {
            select: {
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

    roleId = role.id;

    assert(
      role.isSystem === false,
      "Custom role harus isSystem=false.",
    );

    assert(
      role.permissions.some(
        (item) =>
          item.name ===
          "events.view",
      ),
      "Permission events.view harus terpasang.",
    );

    assert(
      role._count.users === 0,
      "Role fixture tidak boleh langsung digunakan user.",
    );

    assert(
      role._count.members === 0,
      "Role fixture tidak boleh langsung digunakan member.",
    );

    console.log(
      "  ✓ Custom role → isSystem=false",
    );
    console.log(
      "  ✓ Permission assignment tersimpan",
    );
    console.log(
      "  ✓ Role belum digunakan user/member",
    );

    const audit =
      await prisma.auditLog.findFirst({
        where: {
          action: "ROLE_CREATE",
          entityType: "Role",
          entityId: role.id,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          actorUserId: true,
          action: true,
          module: true,
          entityType: true,
          entityId: true,
        },
      });

    /*
     * Direct DB fixture tidak menghasilkan audit log.
     * Ini sengaja dibedakan dari service mutation.
     * Karena itu test hanya mencatat fakta ini dan
     * tidak mengklaim audit service sudah teruji.
     */
    if (!audit) {
      console.log(
        "  ✓ Fixture DB tidak menghasilkan audit log (expected untuk direct fixture)",
      );
    }

    const systemRole =
      await prisma.role.findFirst({
        where: {
          isSystem: true,
          name: "SUPER_ADMIN",
        },
        select: {
          id: true,
          name: true,
          isSystem: true,
          permissions: {
            select: {
              name: true,
            },
          },
        },
      });

    assert(
      systemRole,
      "SUPER_ADMIN harus tersedia.",
    );

    assert(
      systemRole.isSystem === true,
      "SUPER_ADMIN harus system role.",
    );

    assert(
      systemRole.permissions.some(
        (item) =>
          item.name ===
          "roles.manage",
      ),
      "SUPER_ADMIN harus memiliki roles.manage.",
    );

    console.log(
      "  ✓ SUPER_ADMIN tetap system role",
    );
    console.log(
      "  ✓ SUPER_ADMIN tetap memiliki roles.manage",
    );

    const usedRole =
      await prisma.role.findUnique({
        where: {
          id: role.id,
        },
        select: {
          id: true,
          name: true,
          isSystem: true,
          _count: {
            select: {
              users: true,
              members: true,
            },
          },
        },
      });

    assert(
      usedRole?.isSystem === false,
      "Custom role tetap non-system.",
    );

    console.log(
      "\nALL RBAC ROLE INTEGRITY TESTS PASSED.",
    );
  } finally {
    if (roleId) {
      await prisma.role.deleteMany({
        where: {
          id: roleId,
        },
      });
    }

    console.log(
      "→ Fixture role dibersihkan.",
    );
  }
}

main()
  .catch((error) => {
    console.error();
    console.error(
      error instanceof Error
        ? error.message
        : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
