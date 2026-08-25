import "dotenv/config";

import prisma from "@/lib/prisma";
import {
  ROLE_NAMES,
  getRolePolicy,
} from "@/lib/admin/role-policy";

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
    "Running RBAC privilege boundary audit...",
  );

  const roles =
    await prisma.role.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        isSystem: true,
        permissions: {
          select: {
            name: true,
          },
          orderBy: {
            name: "asc",
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

  assert(
    roles.length > 0,
    "Role database tidak boleh kosong.",
  );

  for (const role of roles) {
    const dbPermissions =
      role.permissions.map(
        (permission) =>
          permission.name,
      );

    console.log();
    console.log(
      `ROLE: ${role.name}`,
    );
    console.log(
      `  system=${role.isSystem}`,
    );
    console.log(
      `  users=${role._count.users}`,
    );
    console.log(
      `  members=${role._count.members}`,
    );
    console.log(
      `  permissions=${dbPermissions.join(", ") || "(none)"}`,
    );

    if (
      role.name ===
      ROLE_NAMES.SUPER_ADMIN
    ) {
      assert(
        dbPermissions.includes(
          "roles.manage",
        ),
        "SUPER_ADMIN harus memiliki roles.manage.",
      );

      console.log(
        "  ✓ SUPER_ADMIN → roles.manage",
      );
    }

    if (
      role.name ===
        ROLE_NAMES.EVENT_ORGANIZER ||
      role.name ===
        ROLE_NAMES.STAFF ||
      role.name ===
        ROLE_NAMES.PARTICIPANT
    ) {
      assert(
        !dbPermissions.includes(
          "roles.manage",
        ),
        `${role.name} tidak boleh memiliki roles.manage.`,
      );

      console.log(
        `  ✓ ${role.name} → roles.manage DENY`,
      );
    }

    /*
     * Baseline policy consistency check.
     */
    const policyPermissions =
      getRolePolicy(
        role.name,
      );

    if (
      role.isSystem &&
      policyPermissions.length > 0
    ) {
      const policySet =
        new Set(policyPermissions);

      for (const permission of dbPermissions) {
        assert(
          policySet.has(permission) ||
            role.name ===
              ROLE_NAMES.SUPER_ADMIN,
          `System role ${role.name} memiliki permission "${permission}" di luar baseline policy.`,
        );
      }

      console.log(
        "  ✓ Database permission konsisten dengan baseline policy",
      );
    }
  }

  console.log();
  console.log(
    "ALL RBAC PRIVILEGE BOUNDARY TESTS PASSED.",
  );
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
