import "dotenv/config";

import prisma from "@/lib/prisma";

import {
  ROLE_NAMES,
  ROLE_POLICY,
} from "@/lib/admin/role-policy";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(
      `RBAC MIGRATION FAILED: ${message}`,
    );
  }
}

async function main(): Promise<void> {
  console.log(
    "Running controlled RBAC legacy-role migration...",
  );

  const participantPermissionNames =
    [...ROLE_POLICY[
      ROLE_NAMES.PARTICIPANT
    ]];

  const eventOrganizerPermissionNames =
    [...ROLE_POLICY[
      ROLE_NAMES.EVENT_ORGANIZER
    ]];

  const staffPermissionNames =
    [...ROLE_POLICY[
      ROLE_NAMES.STAFF
    ]];

  const [
    participantPermissions,
    eventOrganizerPermissions,
    staffPermissions,
  ] = await Promise.all([
    prisma.permission.findMany({
      where: {
        name: {
          in:
            participantPermissionNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.permission.findMany({
      where: {
        name: {
          in:
            eventOrganizerPermissionNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.permission.findMany({
      where: {
        name: {
          in:
            staffPermissionNames,
        },
      },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  assert(
    participantPermissions.length ===
      participantPermissionNames.length,
    "Permission PARTICIPANT belum lengkap.",
  );

  assert(
    eventOrganizerPermissions.length ===
      eventOrganizerPermissionNames.length,
    "Permission EVENT_ORGANIZER belum lengkap.",
  );

  assert(
    staffPermissions.length ===
      staffPermissionNames.length,
    "Permission STAFF belum lengkap.",
  );

  const existingCanonicalRoles =
    await prisma.role.findMany({
      where: {
        name: {
          in: [
            ROLE_NAMES.SUPER_ADMIN,
            ROLE_NAMES.EVENT_ORGANIZER,
            ROLE_NAMES.PARTICIPANT,
            ROLE_NAMES.STAFF,
          ],
        },
      },
      select: {
        id: true,
        name: true,
        isSystem: true,
      },
    });

  const participantRole =
    existingCanonicalRoles.find(
      (role) =>
        role.name ===
        ROLE_NAMES.PARTICIPANT,
    );

  const eventOrganizerRole =
    existingCanonicalRoles.find(
      (role) =>
        role.name ===
        ROLE_NAMES.EVENT_ORGANIZER,
    );

  const staffRole =
    existingCanonicalRoles.find(
      (role) =>
        role.name ===
        ROLE_NAMES.STAFF,
    );

  if (
    participantRole ||
    eventOrganizerRole ||
    staffRole
  ) {
    console.log(
      "Canonical role sudah sebagian tersedia; migration akan menggunakannya.",
    );
  }

  const result =
    await prisma.$transaction(
      async (tx) => {
        const participant =
          participantRole ??
          (await tx.role.create({
            data: {
              name:
                ROLE_NAMES.PARTICIPANT,
              description:
                "Participant / ticket buyer",
              isSystem: true,
              permissions: {
                connect:
                  participantPermissions.map(
                    (permission) => ({
                      id:
                        permission.id,
                    }),
                  ),
              },
            },
            select: {
              id: true,
              name: true,
            },
          }));

        const eventOrganizer =
          eventOrganizerRole ??
          (await tx.role.create({
            data: {
              name:
                ROLE_NAMES.EVENT_ORGANIZER,
              description:
                "Event organizer",
              isSystem: true,
              permissions: {
                connect:
                  eventOrganizerPermissions.map(
                    (permission) => ({
                      id:
                        permission.id,
                    }),
                  ),
              },
            },
            select: {
              id: true,
              name: true,
            },
          }));

        const staff =
          staffRole ??
          (await tx.role.create({
            data: {
              name:
                ROLE_NAMES.STAFF,
              description:
                "Event operational staff",
              isSystem: true,
              permissions: {
                connect:
                  staffPermissions.map(
                    (permission) => ({
                      id:
                        permission.id,
                    }),
                  ),
              },
            },
            select: {
              id: true,
              name: true,
            },
          }));

        /*
         * Sinkron permission pada canonical roles.
         * Ini tidak menyentuh user selain pemetaan role di bawah.
         */
        await tx.role.update({
          where: {
            id:
              participant.id,
          },
          data: {
            isSystem: true,
            permissions: {
              set:
                participantPermissions.map(
                  (permission) => ({
                    id:
                      permission.id,
                  }),
                ),
            },
          },
        });

        await tx.role.update({
          where: {
            id:
              eventOrganizer.id,
          },
          data: {
            isSystem: true,
            permissions: {
              set:
                eventOrganizerPermissions.map(
                  (permission) => ({
                    id:
                      permission.id,
                  }),
                ),
            },
          },
        });

        await tx.role.update({
          where: {
            id:
              staff.id,
          },
          data: {
            isSystem: true,
            permissions: {
              set:
                staffPermissions.map(
                  (permission) => ({
                    id:
                      permission.id,
                  }),
                ),
            },
          },
        });

        const legacyParticipantRole =
          await tx.role.findFirst({
            where: {
              name: "PESERTA",
            },
            select: {
              id: true,
              name: true,
            },
          });

        const legacyEventOrganizerRole =
          await tx.role.findFirst({
            where: {
              name: "EO",
            },
            select: {
              id: true,
              name: true,
            },
          });

        let participantUsers = 0;
        let eventOrganizerUsers = 0;

        if (
          legacyParticipantRole &&
          legacyParticipantRole.id !==
            participant.id
        ) {
          const migrated =
            await tx.user.updateMany({
              where: {
                roleId:
                  legacyParticipantRole.id,
              },
              data: {
                roleId:
                  participant.id,
              },
            });

          participantUsers =
            migrated.count;
        }

        if (
          legacyEventOrganizerRole &&
          legacyEventOrganizerRole.id !==
            eventOrganizer.id
        ) {
          const migrated =
            await tx.user.updateMany({
              where: {
                roleId:
                  legacyEventOrganizerRole.id,
              },
              data: {
                roleId:
                  eventOrganizer.id,
              },
            });

          eventOrganizerUsers =
            migrated.count;
        }

        return {
          participantRole:
            participant.id,
          eventOrganizerRole:
            eventOrganizer.id,
          staffRole:
            staff.id,
          participantUsers,
          eventOrganizerUsers,
        };
      },
    );

  console.log(
    "✓ Canonical PARTICIPANT tersedia.",
  );

  console.log(
    "✓ Canonical EVENT_ORGANIZER tersedia.",
  );

  console.log(
    "✓ Canonical STAFF tersedia.",
  );

  console.log(
    `✓ User PESERTA dipindahkan: ${result.participantUsers}`,
  );

  console.log(
    `✓ User EO dipindahkan: ${result.eventOrganizerUsers}`,
  );

  /*
   * Legacy roles tidak langsung dihapus.
   * Kita verifikasi dulu apakah masih digunakan.
   */
  const legacyRoles =
    await prisma.role.findMany({
      where: {
        name: {
          in: [
            "PESERTA",
            "EO",
          ],
        },
      },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            users: true,
            members: true,
          },
        },
      },
    });

  for (const role of legacyRoles) {
    console.log(
      `LEGACY ROLE ${role.name}: users=${role._count.users}, members=${role._count.members}`,
    );
  }

  console.log(
    "\nRBAC LEGACY ROLE MIGRATION COMPLETE.",
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
