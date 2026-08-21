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
  eventOrganizerRoleId: string,
) {
  const adminPassword =
    process.env.IONTIX_SEED_ADMIN_PASSWORD ?? "CHANGE-ME-IMMEDIATELY";

  const adminEmail = process.env.IONTIX_SEED_ADMIN_EMAIL ?? "admin@iontix.com";

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);

  const adminUser = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },
    update: {
      roleId: superAdminRoleId,
      password: hashedAdminPassword,
      status: "ACTIVE",
      isDeleted: false,
    },
    create: {
      name: "Super Admin IONtix",
      email: adminEmail,
      password: hashedAdminPassword,
      roleId: superAdminRoleId,
      status: "ACTIVE",
    },
  });

  const eventOrganizerPassword =
    process.env.IONTIX_SEED_EO_PASSWORD ?? "CHANGE-ME-IMMEDIATELY";

  const eventOrganizerEmail =
    process.env.IONTIX_SEED_EO_EMAIL ?? "eo.demo@iontix.com";

  const hashedEventOrganizerPassword = await bcrypt.hash(
    eventOrganizerPassword,
    12,
  );

  const eventOrganizerUser = await prisma.user.upsert({
    where: {
      email: eventOrganizerEmail,
    },
    update: {
      roleId: eventOrganizerRoleId,
      password: hashedEventOrganizerPassword,
      status: "ACTIVE",
      isDeleted: false,
    },
    create: {
      name: "IONtix Demo Organizer",
      email: eventOrganizerEmail,
      password: hashedEventOrganizerPassword,
      roleId: eventOrganizerRoleId,
      status: "ACTIVE",
    },
  });

  return {
    adminUser,
    eventOrganizerUser,
  };
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

  for (const [name, slug] of defaultSports) {
    const sport = await prisma.sport.upsert({
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

async function seedDemoOrganization(
  eventOrganizerUserId: string,
  eventOrganizerRoleId: string,
) {
  const organization = await prisma.organization.upsert({
    where: {
      slug: "iontix-demo",
    },
    update: {
      name: "IONtix Demo Organizer",
      email: "eo.demo@iontix.com",
      phone: "081234567890",
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
    create: {
      name: "IONtix Demo Organizer",
      slug: "iontix-demo",
      legalName: "IONtix Demo Organizer",
      email: "eo.demo@iontix.com",
      phone: "081234567890",
      website: "https://iontix.local",
      description: "Organization demo untuk pengujian platform IONtix V2.",
      status: "ACTIVE",
      verifiedAt: new Date(),
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: eventOrganizerUserId,
      },
    },
    update: {
      roleId: eventOrganizerRoleId,
      isOwner: true,
      isActive: true,
      title: "Owner",
    },
    create: {
      organizationId: organization.id,
      userId: eventOrganizerUserId,
      roleId: eventOrganizerRoleId,
      isOwner: true,
      isActive: true,
      title: "Owner",
    },
  });

  return organization;
}

async function seedDemoEvent(organizationId: string, eventOrganizerUserId: string) {
  const running = await prisma.sport.findUnique({
    where: {
      slug: "running",
    },
  });

  if (!running) {
    throw new Error("Sport Running belum tersedia.");
  }

  const startDate = new Date("2026-10-17T06:00:00+07:00");

  const endDate = new Date("2026-10-17T11:00:00+07:00");

  const event = await prisma.event.upsert({
    where: {
      slug: "iontix-demo-run-2026",
    },
    update: {
      organizationId,
      eoId: eventOrganizerUserId,
      sportId: running.id,
      title: "IONtix Demo Run 2026",
      description:
        "Event demo resmi untuk menguji workflow event, checkout, payment, ticketing, dan check-in IONtix V2.",
      date: startDate,
      endDate,
      timezone: "Asia/Jakarta",
      location: "Jakarta Demo Venue",
      mapsUrl: "https://maps.google.com/",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
    },
    create: {
      organizationId,
      eoId: eventOrganizerUserId,
      sportId: running.id,
      title: "IONtix Demo Run 2026",
      slug: "iontix-demo-run-2026",
      description:
        "Event demo resmi untuk menguji workflow event, checkout, payment, ticketing, dan check-in IONtix V2.",
      date: startDate,
      endDate,
      timezone: "Asia/Jakarta",
      location: "Jakarta Demo Venue",
      mapsUrl: "https://maps.google.com/",
      status: "PUBLISHED",
      isPublished: true,
      publishedAt: new Date(),
    },
  });

  return event;
}

async function seedDemoTicketCategory(eventId: string) {
  const category = await prisma.ticketCategory.findFirst({
    where: {
      eventId,
      name: "5K General",
    },
  });

  if (category) {
    return prisma.ticketCategory.update({
      where: {
        id: category.id,
      },
      data: {
        price: 150000,
        capacity: 100,
        requireApproval: false,
        saleStartsAt: new Date("2026-08-16T00:00:00+07:00"),
        saleEndsAt: new Date("2026-10-16T23:59:59+07:00"),
        isActive: true,
        sortOrder: 1,
        description: "Kategori demo untuk pengujian checkout IONtix V2.",
      },
    });
  }

  return prisma.ticketCategory.create({
    data: {
      eventId,
      name: "5K General",
      price: 150000,
      capacity: 100,
      requireApproval: false,
      saleStartsAt: new Date("2026-08-16T00:00:00+07:00"),
      saleEndsAt: new Date("2026-10-16T23:59:59+07:00"),
      isActive: true,
      sortOrder: 1,
      description: "Kategori demo untuk pengujian checkout IONtix V2.",
    },
  });
}

async function seedDemoAddon(eventId: string) {
  const existing = await prisma.addon.findFirst({
    where: {
      eventId,
      name: "Official Race Jersey",
    },
  });

  if (existing) {
    return prisma.addon.update({
      where: {
        id: existing.id,
      },
      data: {
        type: "MERCHANDISE",
        price: 85000,
        capacity: 100,
        isActive: true,
        description: "Add-on demo untuk pengujian checkout.",
      },
    });
  }

  return prisma.addon.create({
    data: {
      eventId,
      type: "MERCHANDISE",
      name: "Official Race Jersey",
      price: 85000,
      capacity: 100,
      isActive: true,
      description: "Add-on demo untuk pengujian checkout.",
    },
  });
}

async function main() {
  console.log("🌱 Starting IONtix V2 seed...");

  const { superAdminRole, eventOrganizerRole } = await seedRoles();

  const { adminUser, eventOrganizerUser } = await seedUsers(
    superAdminRole.id,
    eventOrganizerRole.id,
  );

  await seedSports();

  const organization = await seedDemoOrganization(eventOrganizerUser.id, eventOrganizerRole.id);

  const demoEvent = await seedDemoEvent(organization.id, eventOrganizerUser.id);

  const demoCategory = await seedDemoTicketCategory(demoEvent.id);

  const demoAddon = await seedDemoAddon(demoEvent.id);

  console.log("");
  console.log("✅ Seed complete.");
  console.log(`✅ Super Admin: ${adminUser.email}`);
  console.log(`✅ Event Organizer Demo: ${eventOrganizerUser.email}`);
  console.log(`✅ Organization: ${organization.name}`);
  console.log(`✅ Event: ${demoEvent.title}`);
  console.log(`✅ Category: ${demoCategory.name} | Rp ${demoCategory.price}`);
  console.log(`✅ Add-on: ${demoAddon.name} | Rp ${demoAddon.price}`);
  console.log("");
  console.log("⚠️ Gunakan password seed dari environment variables.");
  console.log("   IONTIX_SEED_ADMIN_PASSWORD");
  console.log("   IONTIX_SEED_EO_PASSWORD");
  console.log("");
}

main()
  .catch((error) => {
    console.error("❌ IONtix seed failed:", error);

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
