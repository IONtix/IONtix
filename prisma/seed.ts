import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { ROLE_NAMES, ROLE_POLICY } from "../src/lib/admin/role-policy";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL is not defined.");
}

const pool = new Pool({
  connectionString,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
});

type PermissionSeed = {
  name: string;
  description: string;
  module: string;
};

const permissions: PermissionSeed[] = [
  {
    name: "platform.view",
    description: "View platform dashboard",
    module: "platform",
  },
  {
    name: "users.view",
    description: "View users",
    module: "users",
  },
  {
    name: "users.manage",
    description: "Manage users",
    module: "users",
  },
  {
    name: "roles.manage",
    description: "Manage roles and permissions",
    module: "rbac",
  },
  {
    name: "eo.view",
    description: "View event organizers",
    module: "eo",
  },
  {
    name: "eo.manage",
    description: "Manage event organizers",
    module: "eo",
  },
  {
    name: "sports.manage",
    description: "Manage sports and sport templates",
    module: "sports",
  },
  {
    name: "forms.manage",
    description: "Manage dynamic form templates",
    module: "forms",
  },
  {
    name: "events.view",
    description: "View events",
    module: "events",
  },
  {
    name: "events.manage",
    description: "Create and manage events",
    module: "events",
  },
  {
    name: "participants.view",
    description: "View participants",
    module: "participants",
  },
  {
    name: "participants.manage",
    description: "Manage participant data",
    module: "participants",
  },
  {
    name: "orders.view",
    description: "View orders",
    module: "orders",
  },
  {
    name: "orders.manage",
    description: "Manage orders",
    module: "orders",
  },
  {
    name: "payments.view",
    description: "View payments",
    module: "finance",
  },
  {
    name: "payments.manage",
    description: "Manage payments and refunds",
    module: "finance",
  },
  {
    name: "settlements.view",
    description: "View settlements",
    module: "finance",
  },
  {
    name: "settlements.manage",
    description: "Manage settlements",
    module: "finance",
  },
  {
    name: "tickets.view",
    description: "View tickets",
    module: "tickets",
  },
  {
    name: "tickets.manage",
    description: "Issue and manage tickets",
    module: "tickets",
  },
  {
    name: "checkin.manage",
    description: "Manage event check-in",
    module: "checkin",
  },
  {
    name: "audit.view",
    description: "View audit logs",
    module: "security",
  },
  {
    name: "system.manage",
    description: "Manage system settings",
    module: "system",
  },
];

async function seedPermissions() {
  const created = [];

  for (const permission of permissions) {
    const item = await prisma.permission.upsert({
      where: {
        name: permission.name,
      },
      update: permission,
      create: permission,
    });

    created.push(item);
  }

  return created;
}

async function seedRoles() {
  const seededPermissions = await seedPermissions();

  const permissionByName = new Map(
    seededPermissions.map((permission) => [permission.name, permission]),
  );

  function resolvePolicyPermissionIds(
    roleName: keyof typeof ROLE_POLICY,
  ): { id: string }[] {
    return ROLE_POLICY[roleName].map((permissionName) => {
      const permission = permissionByName.get(permissionName);

      if (!permission) {
        throw new Error(
          `Permission "${permissionName}" untuk role "${roleName}" tidak ditemukan di permission catalog.`,
        );
      }

      return {
        id: permission.id,
      };
    });
  }

  const superAdminPermissionIds = resolvePolicyPermissionIds(
    ROLE_NAMES.SUPER_ADMIN,
  );

  const eventOrganizerPermissionIds = resolvePolicyPermissionIds(
    ROLE_NAMES.EVENT_ORGANIZER,
  );

  const participantPermissionIds = resolvePolicyPermissionIds(
    ROLE_NAMES.PARTICIPANT,
  );

  const staffPermissionIds = resolvePolicyPermissionIds(
    ROLE_NAMES.STAFF,
  );

  const superAdminRole = await prisma.role.upsert({
    where: {
      name: ROLE_NAMES.SUPER_ADMIN,
    },
    update: {
      description: "Full platform administration",
      isSystem: true,
      permissions: {
        set: superAdminPermissionIds,
      },
    },
    create: {
      name: ROLE_NAMES.SUPER_ADMIN,
      description: "Full platform administration",
      isSystem: true,
      permissions: {
        connect: superAdminPermissionIds,
      },
    },
  });

  const eventOrganizerRole = await prisma.role.upsert({
    where: {
      name: ROLE_NAMES.EVENT_ORGANIZER,
    },
    update: {
      description: "Event organizer",
      isSystem: true,
      permissions: {
        set: eventOrganizerPermissionIds,
      },
    },
    create: {
      name: ROLE_NAMES.EVENT_ORGANIZER,
      description: "Event organizer",
      isSystem: true,
      permissions: {
        connect: eventOrganizerPermissionIds,
      },
    },
  });

  const participantRole = await prisma.role.upsert({
    where: {
      name: ROLE_NAMES.PARTICIPANT,
    },
    update: {
      description: "Participant / ticket buyer",
      isSystem: true,
      permissions: {
        set: participantPermissionIds,
      },
    },
    create: {
      name: ROLE_NAMES.PARTICIPANT,
      description: "Participant / ticket buyer",
      isSystem: true,
      permissions: {
        connect: participantPermissionIds,
      },
    },
  });

  await prisma.role.upsert({
    where: {
      name: ROLE_NAMES.STAFF,
    },
    update: {
      description: "Event operational staff",
      isSystem: true,
      permissions: {
        set: staffPermissionIds,
      },
    },
    create: {
      name: ROLE_NAMES.STAFF,
      description: "Event operational staff",
      isSystem: true,
      permissions: {
        connect: staffPermissionIds,
      },
    },
  });

  return {
    superAdminRole,
    eventOrganizerRole,
    participantRole,
  };
}

async function seedUsers(
  superAdminRoleId: string,
) {
  const adminEmail =
    process.env.IONTIX_SEED_ADMIN_EMAIL?.trim();

  const adminPassword =
    process.env.IONTIX_SEED_ADMIN_PASSWORD;

  if (!adminEmail) {
    throw new Error(
      "IONTIX_SEED_ADMIN_EMAIL wajib diisi untuk production seed.",
    );
  }

  if (!adminPassword) {
    throw new Error(
      "IONTIX_SEED_ADMIN_PASSWORD wajib diisi untuk production seed.",
    );
  }

  if (adminPassword.length < 12) {
    throw new Error(
      "IONTIX_SEED_ADMIN_PASSWORD minimal 12 karakter.",
    );
  }

  const hashedAdminPassword =
    await bcrypt.hash(
      adminPassword,
      12,
    );

  const adminUser =
    await prisma.user.upsert({
      where: {
        email: adminEmail,
      },
      update: {
        roleId:
          superAdminRoleId,
        password:
          hashedAdminPassword,
        status:
          "ACTIVE",
        isDeleted:
          false,
      },
      create: {
        name:
          "Super Admin IONtix",
        email:
          adminEmail,
        password:
          hashedAdminPassword,
        roleId:
          superAdminRoleId,
        status:
          "ACTIVE",
      },
    });

  return adminUser;
}

async function seedSports() {
  const defaultSports = [
    ["Running", "running"],
    ["Trail Running", "trail-running"],
    ["Cycling", "cycling"],
    ["Swimming", "swimming"],
    ["Hockey", "hockey"],
    ["Taekwondo", "taekwondo"],
  ] as const;

  const sports = [];

  for (
    const [name, slug]
    of defaultSports
  ) {
    const sport =
      await prisma.sport.upsert({
        where: {
          slug,
        },
        update: {
          name,
          isActive: true,
        },
        create: {
          name,
          slug,
          isActive: true,
        },
      });

    sports.push(sport);
  }

  return sports;
}

async function seedRunningRegistration() {
  const running = await prisma.sport.findUnique({
    where: {
      slug: "running",
    },
    select: {
      id: true,
    },
  });

  if (!running) {
    throw new Error(
      "Sport Running belum tersedia.",
    );
  }

  const template =
    await prisma.formTemplate.upsert({
      where: {
        sportId_slug: {
          sportId: running.id,
          slug: "running-registration",
        },
      },
      update: {
        name:
          "Running Registration",
        description:
          "Template registrasi standar untuk event running.",
        isSystem: true,
        isActive: true,
        allowEOEdit: true,
      },
      create: {
        sportId: running.id,
        name:
          "Running Registration",
        slug:
          "running-registration",
        description:
          "Template registrasi standar untuk event running.",
        isSystem: true,
        isActive: true,
        allowEOEdit: true,
      },
    });

  const version =
    await prisma.formVersion.upsert({
      where: {
        formTemplateId_version: {
          formTemplateId:
            template.id,
          version: 1,
        },
      },
      update: {
        status: "PUBLISHED",
        publishedAt:
          new Date(
            "2026-08-20T09:15:11.720Z",
          ),
      },
      create: {
        formTemplateId:
          template.id,
        version: 1,
        status: "PUBLISHED",
        publishedAt:
          new Date(
            "2026-08-20T09:15:11.720Z",
          ),
      },
    });

  const fields = [
    {
      key: "full_name",
      label: "Nama Lengkap",
      fieldType: "TEXT",
      order: 10,
      isRequired: true,
      isSystem: true,
      isEditableByEO: false,
      isVisible: true,
    },
    {
      key: "email",
      label: "Email",
      fieldType: "EMAIL",
      order: 20,
      isRequired: true,
      isSystem: true,
      isEditableByEO: false,
      isVisible: true,
    },
    {
      key: "phone",
      label: "Nomor Telepon",
      fieldType: "PHONE",
      order: 30,
      isRequired: true,
      isSystem: true,
      isEditableByEO: false,
      isVisible: true,
    },
    {
      key: "date_of_birth",
      label: "Tanggal Lahir",
      fieldType: "DATE",
      order: 40,
      isRequired: true,
      isSystem: false,
      isEditableByEO: true,
      isVisible: true,
    },
    {
      key: "gender",
      label: "Jenis Kelamin",
      fieldType: "GENDER",
      order: 50,
      isRequired: true,
      isSystem: false,
      isEditableByEO: true,
      isVisible: true,
    },
    {
      key: "emergency_contact",
      label: "Kontak Darurat",
      fieldType: "EMERGENCY_CONTACT",
      order: 60,
      isRequired: true,
      isSystem: false,
      isEditableByEO: true,
      isVisible: true,
    },
  ] as const;

  for (const field of fields) {
    await prisma.formField.upsert({
      where: {
        formVersionId_key: {
          formVersionId:
            version.id,
          key: field.key,
        },
      },
      update: {
        label: field.label,
        fieldType: field.fieldType,
        order: field.order,
        isRequired: field.isRequired,
        isSystem: field.isSystem,
        isEditableByEO: field.isEditableByEO,
        isVisible: field.isVisible,
      },
      create: {
        formVersionId:
          version.id,
        key: field.key,
        label: field.label,
        fieldType: field.fieldType,
        order: field.order,
        isRequired: field.isRequired,
        isSystem: field.isSystem,
        isEditableByEO: field.isEditableByEO,
        isVisible: field.isVisible,
      },
    });
  }

  return {
    template,
    version,
  };
}

async function main() {
  console.log(
    "🌱 Starting IONtix production seed...",
  );

  const {
    superAdminRole,
  } = await seedRoles();

  const adminUser =
    await seedUsers(
      superAdminRole.id,
    );

  const sports =
    await seedSports();

  const runningRegistration =
    await seedRunningRegistration();

  console.log("");
  console.log(
    "✅ Production seed complete.",
  );
  console.log(
    `✅ Super Admin: ${adminUser.email}`,
  );
  console.log(
    `✅ Sports seeded: ${sports.length}`,
  );
  console.log(
    `✅ Form template: ${runningRegistration.template.name}`,
  );
  console.log(
    `✅ Form version: ${runningRegistration.version.version}`,
  );
  console.log("");
  console.log(
    "✅ Demo organization/event/payment data tidak dibuat.",
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
