import {
  ROLE_NAMES,
  getRolePolicy,
} from "@/lib/admin/role-policy";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function main(): void {
  console.log(
    "Running RBAC mutation privilege contract...",
  );

  const superAdmin =
    getRolePolicy(
      ROLE_NAMES.SUPER_ADMIN,
    );

  const eo =
    getRolePolicy(
      ROLE_NAMES.EVENT_ORGANIZER,
    );

  const staff =
    getRolePolicy(
      ROLE_NAMES.STAFF,
    );

  const participant =
    getRolePolicy(
      ROLE_NAMES.PARTICIPANT,
    );

  assert(
    superAdmin.includes(
      "roles.manage",
    ),
    "SUPER_ADMIN harus memiliki roles.manage.",
  );

  console.log(
    "  ✓ SUPER_ADMIN → roles.manage ALLOW",
  );

  for (const [name, permissions] of [
    [
      ROLE_NAMES.EVENT_ORGANIZER,
      eo,
    ],
    [
      ROLE_NAMES.STAFF,
      staff,
    ],
    [
      ROLE_NAMES.PARTICIPANT,
      participant,
    ],
  ] as const) {
    assert(
      !permissions.includes(
        "roles.manage",
      ),
      `${name} tidak boleh memiliki roles.manage.`,
    );

    console.log(
      `  ✓ ${name} → roles.manage DENY`,
    );
  }

  /*
   * Platform SUPER_ADMIN creation must remain
   * a platform-level capability.
   */
  assert(
    !eo.includes(
      "system.manage",
    ),
    "EVENT_ORGANIZER tidak boleh memiliki system.manage.",
  );

  assert(
    !staff.includes(
      "system.manage",
    ),
    "STAFF tidak boleh memiliki system.manage.",
  );

  assert(
    !participant.includes(
      "system.manage",
    ),
    "PARTICIPANT tidak boleh memiliki system.manage.",
  );

  console.log(
    "  ✓ Platform system.manage tetap SUPER_ADMIN-only",
  );

  console.log(
    "\nALL RBAC MUTATION CONTRACT TESTS PASSED.",
  );
}

main();

export {};
