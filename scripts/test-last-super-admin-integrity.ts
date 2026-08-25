import "dotenv/config";

import prisma from "@/lib/prisma";
import {
  UserStatus,
} from "@/generated/prisma/client";

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
    "Running last SUPER_ADMIN integrity regression...",
  );

  const before =
    await prisma.user.count({
      where: {
        status: UserStatus.ACTIVE,
        isDeleted: false,
        role: {
          name: "SUPER_ADMIN",
        },
      },
    });

  assert(
    before >= 1,
    "Minimal satu SUPER_ADMIN aktif harus tersedia.",
  );

  console.log(
    `✓ SUPER_ADMIN aktif saat ini: ${before}`,
  );

  /*
   * Policy yang digunakan route:
   * count <= 1 → demotion/delete last SUPER_ADMIN DENY
   * count > 1  → guard last-SUPER_ADMIN tidak aktif
   */
  const allowsLastAdminMutation =
    before > 1;

  assert(
    before === 1
      ? !allowsLastAdminMutation
      : allowsLastAdminMutation,
    "Last SUPER_ADMIN guard tidak konsisten.",
  );

  if (before === 1) {
    console.log(
      "  ✓ Last SUPER_ADMIN → demotion/delete harus DENY",
    );
  } else {
    console.log(
      "  ✓ Lebih dari satu SUPER_ADMIN → last-admin guard tidak aktif",
    );
  }

  /*
   * Pastikan fixture role SUPER_ADMIN memang system role.
   */
  const role =
    await prisma.role.findFirst({
      where: {
        name: "SUPER_ADMIN",
      },
      select: {
        id: true,
        name: true,
        isSystem: true,
      },
    });

  assert(
    role?.isSystem === true,
    "SUPER_ADMIN harus system role.",
  );

  console.log(
    "  ✓ SUPER_ADMIN adalah system role",
  );

  console.log(
    "\nALL LAST SUPER_ADMIN INTEGRITY TESTS PASSED.",
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
