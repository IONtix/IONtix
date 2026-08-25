import {
  ROLE_NAMES,
  getRolePolicy,
} from "@/lib/admin/role-policy";

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

function main(): void {
  console.log(
    "Running user-management privilege contract...",
  );

  const superAdmin =
    getRolePolicy(
      ROLE_NAMES.SUPER_ADMIN,
    );

  const eventOrganizer =
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
      "users.manage",
    ),
    "SUPER_ADMIN harus memiliki users.manage.",
  );

  assert(
    superAdmin.includes(
      "roles.manage",
    ),
    "SUPER_ADMIN harus memiliki roles.manage.",
  );

  console.log(
    "  ✓ SUPER_ADMIN → users.manage + roles.manage",
  );

  assert(
    !eventOrganizer.includes(
      "users.manage",
    ),
    "EVENT_ORGANIZER tidak boleh memiliki users.manage.",
  );

  assert(
    !eventOrganizer.includes(
      "roles.manage",
    ),
    "EVENT_ORGANIZER tidak boleh memiliki roles.manage.",
  );

  console.log(
    "  ✓ EVENT_ORGANIZER → user administration terbatas",
  );

  assert(
    staff.includes(
      "users.manage",
    ),
    "STAFF baseline harus memiliki users.manage.",
  );

  assert(
    !staff.includes(
      "roles.manage",
    ),
    "STAFF tidak boleh memiliki roles.manage.",
  );

  console.log(
    "  ✓ STAFF → users.manage ALLOW / roles.manage DENY",
  );

  assert(
    !participant.includes(
      "users.manage",
    ),
    "PARTICIPANT tidak boleh memiliki users.manage.",
  );

  assert(
    !participant.includes(
      "roles.manage",
    ),
    "PARTICIPANT tidak boleh memiliki roles.manage.",
  );

  console.log(
    "  ✓ PARTICIPANT → user administration DENY",
  );

  /*
   * Platform escalation guard:
   * non-SUPER_ADMIN harus selalu gagal mendapatkan
   * privilege SUPER_ADMIN melalui baseline role policy.
   */
  for (const [name, permissions] of [
    [
      ROLE_NAMES.EVENT_ORGANIZER,
      eventOrganizer,
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
        "system.manage",
      ),
      `${name} tidak boleh memiliki system.manage.`,
    );
  }

  console.log(
    "  ✓ system.manage tetap SUPER_ADMIN-only",
  );

  console.log(
    "\nALL USER-MANAGEMENT PRIVILEGE CONTRACT TESTS PASSED.",
  );
}

main();

export {};
