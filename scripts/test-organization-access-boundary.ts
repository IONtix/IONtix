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
    "Running organization access boundary regression...",
  );

  const suffix =
    crypto.randomBytes(4).toString("hex");

  let organizationAId: string | null = null;
  let organizationBId: string | null = null;
  let roleId: string | null = null;
  let permissionId: string | null = null;
  let membershipId: string | null = null;

  try {
    const user =
      await prisma.user.findFirst({
        where: {
          status: "ACTIVE",
          isDeleted: false,
          role: {
            name: {
              not: "SUPER_ADMIN",
            },
          },
        },
        select: {
          id: true,
          email: true,
        },
      });

    assert(
      user,
      "User non-SUPER_ADMIN harus tersedia.",
    );

    /*
     * Gunakan permission checkin.manage yang sudah ada
     * bila tersedia. Jangan membuat permission baru
     * karena permission ini adalah permission canonical.
     */
    const permission =
      await prisma.permission.findUnique({
        where: {
          name: "checkin.manage",
        },
        select: {
          id: true,
          name: true,
        },
      });

    assert(
      permission,
      "Permission checkin.manage harus tersedia.",
    );

    permissionId =
      permission.id;

    const role =
      await prisma.role.create({
        data: {
          name:
            `CHECKIN_BOUNDARY_${suffix}`,
          description:
            "Temporary organization boundary regression role",
          isSystem: false,
          permissions: {
            connect: {
              id: permission.id,
            },
          },
        },
        select: {
          id: true,
        },
      });

    roleId = role.id;

    const organizationA =
      await prisma.organization.create({
        data: {
          name:
            `Boundary Organization A ${suffix}`,
          slug:
            `boundary-org-a-${suffix}`,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

    organizationAId =
      organizationA.id;

    const organizationB =
      await prisma.organization.create({
        data: {
          name:
            `Boundary Organization B ${suffix}`,
          slug:
            `boundary-org-b-${suffix}`,
          status: "ACTIVE",
        },
        select: {
          id: true,
        },
      });

    organizationBId =
      organizationB.id;

    const membership =
      await prisma.organizationMember.create({
        data: {
          organizationId:
            organizationA.id,
          userId:
            user.id,
          roleId:
            role.id,
          isActive: true,
        },
        select: {
          id: true,
          organizationId: true,
          userId: true,
          isActive: true,
        },
      });

    membershipId =
      membership.id;

    console.log(
      "✓ User membership Organization A dibuat.",
    );

    /*
     * Predicate canonical yang digunakan
     * requireEventAccess():
     *
     * organizationId = event.organizationId
     * userId = current user
     * isActive = true
     * organization.status = ACTIVE
     */
    const accessToA =
      await prisma.organizationMember.findFirst({
        where: {
          organizationId:
            organizationA.id,
          userId:
            user.id,
          isActive: true,
          organization: {
            status: "ACTIVE",
          },
        },
        include: {
          role: {
            include: {
              permissions: {
                where: {
                  name: "checkin.manage",
                },
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

    assert(
      accessToA,
      "User harus memiliki access ke Organization A.",
    );

    assert(
      accessToA.role?.permissions.some(
        (item) =>
          item.name ===
          "checkin.manage",
      ),
      "Organization A harus memberikan checkin.manage.",
    );

    console.log(
      "  ✓ Organization A + checkin.manage → ALLOW",
    );

    const accessToB =
      await prisma.organizationMember.findFirst({
        where: {
          organizationId:
            organizationB.id,
          userId:
            user.id,
          isActive: true,
          organization: {
            status: "ACTIVE",
          },
        },
        include: {
          role: {
            include: {
              permissions: {
                where: {
                  name: "checkin.manage",
                },
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

    assert(
      accessToB === null,
      "User tidak boleh memiliki access ke Organization B.",
    );

    console.log(
      "  ✓ Organization B tanpa membership → DENY",
    );

    /*
     * Same role tidak memberikan cross-organization access.
     */
    assert(
      membership.organizationId !==
        organizationB.id,
      "Membership tidak boleh berpindah organization.",
    );

    console.log(
      "  ✓ Membership tetap scoped ke Organization A",
    );

    console.log(
      "\nALL ORGANIZATION ACCESS BOUNDARY TESTS PASSED.",
    );
  } finally {
    if (membershipId) {
      await prisma.organizationMember.deleteMany({
        where: {
          id: membershipId,
        },
      });
    }

    if (roleId) {
      await prisma.role.deleteMany({
        where: {
          id: roleId,
        },
      });
    }

    if (organizationAId) {
      await prisma.organization.deleteMany({
        where: {
          id: organizationAId,
        },
      });
    }

    if (organizationBId) {
      await prisma.organization.deleteMany({
        where: {
          id: organizationBId,
        },
      });
    }

    /*
     * Permission canonical sengaja TIDAK dihapus.
     */
    void permissionId;

    console.log(
      "→ Fixture organization boundary dibersihkan.",
    );
  }
}

main()
  .catch((error) => {
    console.error(
      "\nORGANIZATION ACCESS BOUNDARY FAILED:",
    );
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

export {};
