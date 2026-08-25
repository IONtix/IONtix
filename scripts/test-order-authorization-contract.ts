import "dotenv/config";

import { AuthorizationError } from "@/lib/auth/authorization";
import {
  assertOrderParticipantOrManagerAccess,
  assertOrderClaimAccess,
} from "@/lib/order/authorization";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function expectDenied(
  fn: () => void,
  label: string,
): void {
  try {
    fn();

    throw new Error(
      `TEST FAILED: ${label} harus ditolak.`,
    );
  } catch (error) {
    assert(
      error instanceof AuthorizationError,
      `${label} harus menghasilkan AuthorizationError.`,
    );

    assert(
      error.status === 403,
      `${label} harus menghasilkan HTTP 403.`,
    );

    console.log(
      `  ✓ ${label} → DENY`,
    );
  }
}

function main(): void {
  console.log(
    "Running order authorization contract tests...",
  );

  const owner = {
    currentUserId: "USER-A",
    currentUserEmail: "a@example.com",
    buyerUserId: "USER-A",
    orderEmail: "a@example.com",
    eventPermissionGranted: false,
  };

  assert(
    (() => {
      assertOrderParticipantOrManagerAccess(
        owner,
      );
      return true;
    })(),
    "Owner harus boleh melihat order.",
  );

  console.log(
    "  ✓ Owner → ALLOW",
  );

  expectDenied(
    () =>
      assertOrderParticipantOrManagerAccess({
        ...owner,
        currentUserId: "USER-B",
        currentUserEmail: "b@example.com",
      }),
    "Non-owner",
  );

  assert(
    (() => {
      assertOrderParticipantOrManagerAccess({
        ...owner,
        eventPermissionGranted: true,
        currentUserId: "USER-B",
        currentUserEmail: "b@example.com",
      });
      return true;
    })(),
    "Event manager harus bypass ownership.",
  );

  console.log(
    "  ✓ Authorized event manager → ALLOW",
  );

  assert(
    (() => {
      assertOrderParticipantOrManagerAccess({
        currentUserId: "USER-A",
        currentUserEmail: "a@example.com",
        buyerUserId: null,
        orderEmail: "A@EXAMPLE.COM",
        eventPermissionGranted: false,
      });
      return true;
    })(),
    "Legacy email owner harus fallback ALLOW.",
  );

  console.log(
    "  ✓ Legacy owner → ALLOW",
  );

  expectDenied(
    () =>
      assertOrderParticipantOrManagerAccess({
        currentUserId: "USER-B",
        currentUserEmail: "b@example.com",
        buyerUserId: null,
        orderEmail: "a@example.com",
        eventPermissionGranted: false,
      }),
    "Legacy non-owner",
  );

  assert(
    (() => {
      assertOrderClaimAccess(owner);
      return true;
    })(),
    "Owner claim harus boleh.",
  );

  console.log(
    "  ✓ Claim owner → ALLOW",
  );

  expectDenied(
    () =>
      assertOrderClaimAccess({
        ...owner,
        currentUserId: "USER-B",
        currentUserEmail: "b@example.com",
      }),
    "Claim non-owner",
  );

  assert(
    (() => {
      assertOrderClaimAccess({
        ...owner,
        eventPermissionGranted: true,
        currentUserId: "USER-B",
        currentUserEmail: "b@example.com",
      });
      return true;
    })(),
    "Claim manager harus bypass ownership.",
  );

  console.log(
    "  ✓ Claim event manager → ALLOW",
  );

  console.log(
    "\nALL ORDER AUTHORIZATION CONTRACT TESTS PASSED.",
  );
}

main();

export {};
