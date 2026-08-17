import {
  ROLE_POLICY,
  ROLE_NAMES,
  isManagedRole,
} from "@/lib/admin/role-policy";

export interface RolePolicyValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface PermissionCatalogItem {
  name: string;
  module?: string | null;
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

export function validatePermissionCatalog(
  catalog: readonly PermissionCatalogItem[],
): RolePolicyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const permissionNames = catalog.map((permission) => permission.name);

  const duplicates = permissionNames.filter(
    (name, index) => permissionNames.indexOf(name) !== index,
  );

  for (const duplicate of unique(duplicates)) {
    errors.push(`Permission "${duplicate}" terdaftar lebih dari satu kali.`);
  }

  const catalogSet = new Set(permissionNames);

  for (const [roleName, policyPermissions] of Object.entries(ROLE_POLICY)) {
    for (const permission of policyPermissions) {
      if (!catalogSet.has(permission)) {
        errors.push(
          `Role "${roleName}" membutuhkan permission "${permission}" tetapi permission tersebut tidak ada di catalog.`,
        );
      }
    }
  }

  const superAdminPermissions = new Set(ROLE_POLICY[ROLE_NAMES.SUPER_ADMIN]);

  for (const permission of superAdminPermissions) {
    if (!catalogSet.has(permission)) {
      errors.push(`SUPER_ADMIN kehilangan permission catalog "${permission}".`);
    }
  }

  return {
    valid: errors.length === 0,
    errors: unique(errors),
    warnings: unique(warnings),
  };
}

export function validateRolePolicy(
  roleName: string,
  catalog: readonly PermissionCatalogItem[],
): RolePolicyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const normalizedRole = roleName.trim().toUpperCase();

  if (!isManagedRole(normalizedRole)) {
    return {
      valid: false,
      errors: [`Role "${roleName}" tidak mempunyai policy bawaan.`],
      warnings: [],
    };
  }

  const catalogSet = new Set(catalog.map((permission) => permission.name));

  const permissions = ROLE_POLICY[normalizedRole];

  for (const permission of permissions) {
    if (!catalogSet.has(permission)) {
      errors.push(
        `Role "${normalizedRole}" membutuhkan permission "${permission}" yang tidak tersedia di catalog.`,
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors: unique(errors),
    warnings: unique(warnings),
  };
}

export function getPolicyPermissionNames(roleName: string): readonly string[] {
  const normalizedRole = roleName.trim().toUpperCase();

  if (!isManagedRole(normalizedRole)) {
    return [];
  }

  return ROLE_POLICY[normalizedRole];
}

export function getMissingPolicyPermissions(
  roleName: string,
  catalog: readonly PermissionCatalogItem[],
): string[] {
  const catalogSet = new Set(catalog.map((permission) => permission.name));

  return getPolicyPermissionNames(roleName).filter(
    (permission) => !catalogSet.has(permission),
  );
}
