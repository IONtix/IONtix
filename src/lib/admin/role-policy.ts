/**
 * IONtix RBAC Role Policy
 *
 * File ini menjadi baseline policy permission untuk role bawaan
 * platform. File ini TIDAK mengubah database secara langsung.
 *
 * Database tetap menjadi source of truth untuk role/permission aktual.
 * Policy ini digunakan sebagai kontrak konfigurasi sebelum baseline
 * tersebut diterapkan melalui seed atau Role Manager.
 *
 * Canonical system roles:
 * - SUPER_ADMIN
 * - EVENT_ORGANIZER
 * - STAFF
 * - PARTICIPANT
 */

export const ROLE_NAMES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  EVENT_ORGANIZER: "EVENT_ORGANIZER",
  STAFF: "STAFF",
  PARTICIPANT: "PARTICIPANT",
} as const;

export type ManagedRoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

export const SUPER_ADMIN_PERMISSIONS = [
  "platform.view",

  "users.view",
  "users.manage",

  "roles.manage",

  // Legacy permission names retained temporarily for compatibility.
  "eo.view",
  "eo.manage",

  "sports.manage",

  "forms.manage",

  "events.view",
  "events.manage",

  "participants.view",
  "participants.manage",

  "orders.view",
  "orders.manage",

  "payments.view",
  "payments.manage",

  "settlements.view",
  "settlements.manage",

  "tickets.view",
  "tickets.manage",

  "checkin.manage",

  "audit.view",

  "system.manage",
] as const;

export const EVENT_ORGANIZER_PERMISSIONS = [
  "events.view",
  "events.manage",

  "participants.view",
  "participants.manage",

  "orders.view",
  "orders.manage",

  "payments.view",

  "tickets.view",
  "tickets.manage",

  "checkin.manage",

  "forms.manage",

  "sports.manage",
] as const;

/**
 * Staff adalah role operasional event.
 *
 * Untuk tahap awal kita mempertahankan permission Support Admin
 * yang sudah ada sebagai baseline operasional. Scope akan diperketat
 * kemudian berdasarkan kebutuhan nyata staff event.
 */
export const STAFF_PERMISSIONS = [
  "users.view",
  "users.manage",

  "events.view",

  "participants.view",

  "orders.view",

  "payments.view",

  "tickets.view",

  "checkin.manage",

  "audit.view",
] as const;

export const PARTICIPANT_PERMISSIONS = [
  "events.view",

  "participants.view",

  "orders.view",

  "tickets.view",
] as const;

export const ROLE_POLICY = {
  [ROLE_NAMES.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS,

  [ROLE_NAMES.EVENT_ORGANIZER]: EVENT_ORGANIZER_PERMISSIONS,

  [ROLE_NAMES.STAFF]: STAFF_PERMISSIONS,

  [ROLE_NAMES.PARTICIPANT]: PARTICIPANT_PERMISSIONS,
} as const;

export type RolePolicyPermission =
  (typeof ROLE_POLICY)[ManagedRoleName][number];

export function getRolePolicy(roleName: string): readonly string[] {
  const normalized = roleName.trim().toUpperCase();

  return ROLE_POLICY[normalized as ManagedRoleName] ?? [];
}

export function isManagedRole(roleName: string): roleName is ManagedRoleName {
  const normalized = roleName.trim().toUpperCase();

  return normalized in ROLE_POLICY;
}

export function isSystemRole(roleName: string): boolean {
  const normalized = roleName.trim().toUpperCase();

  return (
    normalized === ROLE_NAMES.SUPER_ADMIN ||
    normalized === ROLE_NAMES.EVENT_ORGANIZER ||
    normalized === ROLE_NAMES.STAFF ||
    normalized === ROLE_NAMES.PARTICIPANT
  );
}

export function getMissingPermissions(
  roleName: string,
  availablePermissions: readonly string[],
): string[] {
  const required = getRolePolicy(roleName);

  const available = new Set(availablePermissions);

  return required.filter((permission) => !available.has(permission));
}

export function getUnknownPermissions(
  roleName: string,
  availablePermissions: readonly string[],
): string[] {
  const policy = new Set(getRolePolicy(roleName));

  return availablePermissions.filter((permission) => !policy.has(permission));
}
