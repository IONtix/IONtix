/**
 * IONtix RBAC Role Policy
 *
 * File ini menjadi baseline policy permission untuk role bawaan
 * platform. File ini TIDAK mengubah database secara langsung.
 *
 * Database tetap menjadi source of truth untuk role/permission aktual.
 * Policy ini digunakan sebagai kontrak konfigurasi sebelum baseline
 * tersebut diterapkan melalui seed atau Role Manager.
 */

export const ROLE_NAMES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  EO: "EO",
  PESERTA: "PESERTA",
  SUPPORT_ADMIN: "SUPPORT_ADMIN",
} as const;

export type ManagedRoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

export const SUPER_ADMIN_PERMISSIONS = [
  "platform.view",

  "users.view",
  "users.manage",

  "roles.manage",

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

export const EO_PERMISSIONS = [
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

export const PESERTA_PERMISSIONS = [
  "events.view",

  "participants.view",

  "orders.view",

  "tickets.view",
] as const;

export const SUPPORT_ADMIN_PERMISSIONS = [
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

export const ROLE_POLICY = {
  [ROLE_NAMES.SUPER_ADMIN]: SUPER_ADMIN_PERMISSIONS,

  [ROLE_NAMES.EO]: EO_PERMISSIONS,

  [ROLE_NAMES.PESERTA]: PESERTA_PERMISSIONS,

  [ROLE_NAMES.SUPPORT_ADMIN]: SUPPORT_ADMIN_PERMISSIONS,
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
  return (
    roleName === ROLE_NAMES.SUPER_ADMIN ||
    roleName === ROLE_NAMES.EO ||
    roleName === ROLE_NAMES.PESERTA
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
