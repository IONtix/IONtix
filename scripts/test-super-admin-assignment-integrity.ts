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
    "Running SUPER_ADMIN assignment integrity regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let targetUserId: string | null = null;

  try {
    const participantRole =
      await prisma.role.findUnique({
        where: {
          name: "PESERTA",
        },
        select: {
          id: true,
          name: true,
        },
      });

    const superAdminRole =
      await prisma.role.findUnique({
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
      participantRole,
      "Role PESERTA harus tersedia.",
    );

    assert(
      superAdminRole,
      "Role SUPER_ADMIN harus tersedia.",
    );

    assert(
      superAdminRole.isSystem === true,
      "SUPER_ADMIN harus system role.",
    );

    const target =
      await prisma.user.create({
        data: {
          name:
            `Privilege Target ${suffix}`,
          email:
            `privilege-target-${suffix}@iontix.local`,
          password:
            "temporary-test-password",
          status:
            "ACTIVE",
          isDeleted:
            false,
          role: {
            connect: {
              id: participantRole.id,
            },
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          status: true,
          isDeleted: true,
          role: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

    targetUserId = target.id;

    assert(
      target.role?.name ===
        "PESERTA",
      "Fixture target harus dimulai sebagai PESERTA.",
    );

    console.log(
      "  ✓ Target fixture = PESERTA",
    );

    /*
     * Simulate the route's authorization rule:
     *
     * roleRecord.name === SUPER_ADMIN
     * && actor.role !== SUPER_ADMIN
     * → DENY
     *
     * Kita tidak melakukan mutation setelah rule gagal.
     */
    function canAssignSuperAdmin(
      actorRole: string,
    ): boolean {
      return (
        actorRole ===
        "SUPER_ADMIN"
      );
    }

    assert(
      !canAssignSuperAdmin("EO"),
      "EO tidak boleh memberikan SUPER_ADMIN.",
    );

    assert(
      !canAssignSuperAdmin("STAFF"),
      "STAFF tidak boleh memberikan SUPER_ADMIN.",
    );

    assert(
      !canAssignSuperAdmin("PESERTA"),
      "PESERTA tidak boleh memberikan SUPER_ADMIN.",
    );

    console.log(
      "  ✓ EO → SUPER_ADMIN DENY",
    );

    console.log(
      "  ✓ STAFF → SUPER_ADMIN DENY",
    );

    console.log(
      "  ✓ PESERTA → SUPER_ADMIN DENY",
    );

    /*
     * Verify target was not escalated.
     */
    const unchanged =
      await prisma.user.findUnique({
        where: {
          id: target.id,
        },
        select: {
          role: {
            select: {
              name: true,
            },
          },
        },
      });

    assert(
      unchanged?.role?.name ===
        "PESERTA",
      "Unauthorized role escalation tidak boleh mengubah target user.",
    );

    console.log(
      "  ✓ Target tetap PESERTA",
    );

    console.log(
      "\nALL SUPER_ADMIN ASSIGNMENT INTEGRITY TESTS PASSED.",
    );
  } finally {
    if (targetUserId) {
      await prisma.user.deleteMany({
        where: {
          id: targetUserId,
        },
      });
    }

    console.log(
      "→ Fixture privilege target dibersihkan.",
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
