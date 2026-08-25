import { userOwnsOrder } from "@/lib/order/ownership";

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
    "Running order ownership contract tests...",
  );

  assert(
    userOwnsOrder({
      currentUserId: "USER-A",
      currentUserEmail: "a@example.com",
      buyerUserId: "USER-A",
      orderEmail: "someone-else@example.com",
    }) === true,
    "Canonical buyerUserId harus ALLOW.",
  );

  console.log(
    "  ✓ buyerUserId owner → ALLOW",
  );

  assert(
    userOwnsOrder({
      currentUserId: "USER-B",
      currentUserEmail: "b@example.com",
      buyerUserId: "USER-A",
      orderEmail: "b@example.com",
    }) === false,
    "Email tidak boleh mengalahkan buyerUserId.",
  );

  console.log(
    "  ✓ buyerUserId mismatch → DENY",
  );

  assert(
    userOwnsOrder({
      currentUserId: "USER-A",
      currentUserEmail: "a@example.com",
      buyerUserId: null,
      orderEmail: "A@EXAMPLE.COM",
    }) === true,
    "Legacy email fallback harus ALLOW.",
  );

  console.log(
    "  ✓ Legacy email fallback → ALLOW",
  );

  assert(
    userOwnsOrder({
      currentUserId: "USER-B",
      currentUserEmail: "b@example.com",
      buyerUserId: null,
      orderEmail: "a@example.com",
    }) === false,
    "Legacy non-owner harus DENY.",
  );

  console.log(
    "  ✓ Legacy non-owner → DENY",
  );

  assert(
    userOwnsOrder({
      currentUserId: "USER-A",
      currentUserEmail: "a@example.com",
      buyerUserId: null,
      orderEmail: null,
    }) === false,
    "Tanpa canonical owner dan legacy email harus DENY.",
  );

  console.log(
    "  ✓ No ownership evidence → DENY",
  );

  console.log(
    "\nALL ORDER OWNERSHIP CONTRACT TESTS PASSED.",
  );
}

main();

export {};
