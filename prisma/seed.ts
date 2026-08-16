import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL or DIRECT_URL is not defined.");
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type PermissionSeed = {
  name: string;
  description: string;
  module: string;
};

const permissions: PermissionSeed[] = [
  { name: "platform.view", description: "View platform dashboard", module: "platform" },
  { name: "users.view", description: "View users", module: "users" },
  { name: "users.manage", description: "Manage users", module: "users" },
  { name: "roles.manage", description: "Manage roles and permissions", module: "rbac" },
  { name: "eo.view", description: "View event organizers", module: "eo" },
  { name: "eo.manage", description: "Manage event organizers", module: "eo" },
  { name: "sports.manage", description: "Manage sports and sport templates", module: "sports" },
  { name: "forms.manage", description: "Manage dynamic form templates", module: "forms" },
  { name: "events.view", description: "View events", module: "events" },
  { name: "events.manage", description: "Create and manage events", module: "events" },
  { name: "participants.view", description: "View participants", module: "participants" },
  { name: "participants.manage", description: "Manage participant data", module: "participants" },
  { name: "orders.view", description: "View orders", module: "orders" },
  { name: "orders.manage", description: "Manage orders", module: "orders" },
  { name: "payments.view", description: "View payments", module: "finance" },
  { name: "payments.manage", description: "Manage payments and refunds", module: "finance" },
  { name: "settlements.view", description: "View settlements", module: "finance" },
  { name: "settlements.manage", description: "Manage settlements", module: "finance" },
  { name: "tickets.view", description: "View tickets", module: "tickets" },
  { name: "tickets.manage", description: "Issue and manage tickets", module: "tickets" },
  { name: "checkin.manage", description: "Manage event check-in", module: "checkin" },
  { name: "audit.view", description: "View audit logs", module: "security" },
  { name: "system.manage", description: "Manage system settings", module: "system" },
];

async function seedPermissions() {
  const created = [];
  for (const permission of permissions) {
    const item = await prisma.permission.upsert({
      where: { name: permission.name },
      update: permission,
      create: permission,
    });
    created.push(item);
  }
  return created;
}

async function main() {
  console.log("🌱 Starting IONtix V2 seed...");

  const seededPermissions = await seedPermissions();
  const permissionIds = seededPermissions.map(({ id }) => ({ id }));

  const superAdminRole = await prisma.role.upsert({
    where: { name: "SUPER_ADMIN" },
    update: {
      description: "Full platform administration",
      isSystem: true,
      permissions: {
        set: permissionIds,
      },
    },
    create: {
      name: "SUPER_ADMIN",
      description: "Full platform administration",
      isSystem: true,
      permissions: { connect: permissionIds },
    },
  });

  const eoRole = await prisma.role.upsert({
    where: { name: "EO" },
    update: { description: "Event organizer", isSystem: true },
    create: { name: "EO", description: "Event organizer", isSystem: true },
  });

  await prisma.role.upsert({
    where: { name: "PESERTA" },
    update: { description: "Participant / ticket buyer", isSystem: true },
    create: { name: "PESERTA", description: "Participant / ticket buyer", isSystem: true },
  });

  await prisma.role.upsert({
    where: { name: "SUPPORT_ADMIN" },
    update: { description: "Support and controlled administrative access", isSystem: false },
    create: { name: "SUPPORT_ADMIN", description: "Support and controlled administrative access", isSystem: false },
  });

  const password = process.env.IONTIX_SEED_ADMIN_PASSWORD ?? "CHANGE-ME-IMMEDIATELY";
  const adminEmail = process.env.IONTIX_SEED_ADMIN_EMAIL ?? "admin@iontix.com";
  const hashedPassword = await bcrypt.hash(password, 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      roleId: superAdminRole.id,
      password: hashedPassword,
      status: "ACTIVE",
      isDeleted: false,
    },
    create: {
      name: "Super Admin IONtix",
      email: adminEmail,
      password: hashedPassword,
      roleId: superAdminRole.id,
      status: "ACTIVE",
    },
  });

  const defaultSports = [
    ["Running", "running"],
    ["Trail Running", "trail-running"],
    ["Cycling", "cycling"],
    ["Swimming", "swimming"],
    ["Hockey", "hockey"],
    ["Taekwondo", "taekwondo"],
  ] as const;

  for (const [name, slug] of defaultSports) {
    await prisma.sport.upsert({
      where: { slug },
      update: { name, isActive: true },
      create: { name, slug, isActive: true },
    });
  }

  console.log(`✅ Seed complete. Admin: ${adminUser.email}`);
  console.log(`ℹ️ EO role id: ${eoRole.id}`);
  console.log("⚠️ Set IONTIX_SEED_ADMIN_PASSWORD before production seeding.");
}

main()
  .catch((error) => {
    console.error("❌ IONtix seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
