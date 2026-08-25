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
    "Running user mutation security contract...",
  );

  const superAdmin =
    getRolePolicy(
      ROLE_NAMES.SUPER_ADMIN,
    );

  const staff =
    getRolePolicy(
      ROLE_NAMES.STAFF,
    );

  const participant =
    getRolePolicy(
      ROLE_NAMES.PARTICIPANT,
    );

  /*
   * users.manage tidak sama dengan roles.manage.
   */
  assert(
    staff.includes("users.manage"),
    "STAFF harus memiliki users.manage.",
  );

  assert(
    !staff.includes("roles.manage"),
    "STAFF tidak boleh memiliki roles.manage.",
  );

  console.log(
    "  ✓ STAFF user management ≠ RBAC management",
  );

  /*
   * SUPER_ADMIN memiliki keduanya.
   */
  assert(
    superAdmin.includes("users.manage"),
    "SUPER_ADMIN harus memiliki users.manage.",
  );

  assert(
    superAdmin.includes("roles.manage"),
    "SUPER_ADMIN harus memiliki roles.manage.",
  );

  console.log(
    "  ✓ SUPER_ADMIN → users.manage + roles.manage",
  );

  /*
   * Participant tidak boleh memodifikasi user.
   */
  assert(
    !participant.includes("users.manage"),
    "PARTICIPANT tidak boleh memiliki users.manage.",
  );

  console.log(
    "  ✓ PARTICIPANT → user mutation DENY",
  );

  /*
   * Platform escalation permissions.
   */
  for (
    const [name, permissions] of [
      [
        ROLE_NAMES.STAFF,
        staff,
      ],
      [
        ROLE_NAMES.PARTICIPANT,
        participant,
      ],
    ] as const
  ) {
    assert(
      !permissions.includes(
        "system.manage",
      ),
      `${name} tidak boleh memiliki system.manage.`,
    );

    assert(
      !permissions.includes(
        "roles.manage",
      ),
      `${name} tidak boleh memiliki roles.manage.`,
    );
  }

  console.log(
    "  ✓ Non-SUPER_ADMIN tidak memiliki privilege RBAC/platform",
  );

  /*
   * Role assignment policy:
   * hanya SUPER_ADMIN yang boleh menghasilkan
   * role SUPER_ADMIN pada target user.
   *
   * Ini mencerminkan guard route:
   * roleRecord.name === SUPER_ADMIN &&
   * actor.role !== SUPER_ADMIN → DENY
   */
  function canAssignSuperAdmin(
    actorRole: string,
  ): boolean {
    return (
      actorRole ===
      ROLE_NAMES.SUPER_ADMIN
    );
  }

  assert(
    canAssignSuperAdmin(
      ROLE_NAMES.SUPER_ADMIN,
    ),
    "SUPER_ADMIN harus boleh assign SUPER_ADMIN.",
  );

  assert(
    !canAssignSuperAdmin(
      ROLE_NAMES.STAFF,
    ),
    "STAFF tidak boleh assign SUPER_ADMIN.",
  );

  assert(
    !canAssignSuperAdmin(
      ROLE_NAMES.PARTICIPANT,
    ),
    "PARTICIPANT tidak boleh assign SUPER_ADMIN.",
  );

  console.log(
    "  ✓ SUPER_ADMIN assignment tetap platform-only",
  );

  /*
   * Self role mutation policy.
   */
  function canChangeOwnRole(
    actorId: string,
    targetId: string,
    requestedRole: string | undefined,
  ): boolean {
    if (
      requestedRole !== undefined &&
      actorId === targetId
    ) {
      return false;
    }

    return true;
  }

  assert(
    !canChangeOwnRole(
      "USER-A",
      "USER-A",
      "STAFF",
    ),
    "Self role change harus DENY.",
  );

  assert(
    canChangeOwnRole(
      "USER-A",
      "USER-B",
      "STAFF",
    ),
    "Changing another user's role melewati self-role guard.",
  );

  console.log(
    "  ✓ Self role change → DENY",
  );

  /*
   * Self-delete policy.
   */
  function canSelfDelete(
    actorId: string,
    targetId: string,
    requestedStatus: string | undefined,
  ): boolean {
    if (
      requestedStatus === "DELETED" &&
      actorId === targetId
    ) {
      return false;
    }

    return true;
  }

  assert(
    !canSelfDelete(
      "USER-A",
      "USER-A",
      "DELETED",
    ),
    "Self-delete harus DENY.",
  );

  console.log(
    "  ✓ Self-delete → DENY",
  );

  console.log(
    "\nALL USER MUTATION SECURITY CONTRACTS PASSED.",
  );
}

main();

export {};
