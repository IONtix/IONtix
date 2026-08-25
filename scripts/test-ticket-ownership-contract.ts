import {
  userOwnsTicket,
} from "@/lib/ticket/ownership";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(
      `TEST FAILED: ${message}`,
    );
  }
}

function main(): void {
  console.log(
    "Running ticket ownership contract tests...",
  );

  assert(
    userOwnsTicket({
      currentUserId: "A",
      currentUserEmail:
        "a@example.com",
      ticketOwnerId: "A",
      ticketOwnerEmail:
        "a@example.com",
    }) === true,
    "Owner A harus dapat mengakses ticket.",
  );

  console.log(
    "  ✓ Current owner → ALLOW",
  );

  assert(
    userOwnsTicket({
      currentUserId: "B",
      currentUserEmail:
        "b@example.com",
      ticketOwnerId: "A",
      ticketOwnerEmail:
        "a@example.com",
    }) === false,
    "User B tidak boleh mengakses ticket A.",
  );

  console.log(
    "  ✓ Non-owner → DENY",
  );

  assert(
    userOwnsTicket({
      currentUserId: "B",
      currentUserEmail:
        "b@example.com",
      ticketOwnerId: "B",
      ticketOwnerEmail:
        "b@example.com",
    }) === true,
    "Owner baru B harus dapat mengakses.",
  );

  console.log(
    "  ✓ New owner after transfer → ALLOW",
  );

  assert(
    userOwnsTicket({
      currentUserId: "A",
      currentUserEmail:
        "a@example.com",
      ticketOwnerId: "B",
      ticketOwnerEmail:
        "b@example.com",
    }) === false,
    "Owner lama A harus kehilangan akses.",
  );

  console.log(
    "  ✓ Previous owner after transfer → DENY",
  );

  assert(
    userOwnsTicket({
      currentUserId: "A",
      currentUserEmail:
        "A@EXAMPLE.COM",
      ticketOwnerId: null,
      ticketOwnerEmail:
        "a@example.com",
    }) === true,
    "Legacy email fallback harus tetap bekerja.",
  );

  console.log(
    "  ✓ Legacy email fallback → ALLOW",
  );

  assert(
    userOwnsTicket({
      currentUserId: "A",
      currentUserEmail:
        "a@example.com",
      ticketOwnerId: null,
      ticketOwnerEmail:
        "b@example.com",
    }) === false,
    "Legacy non-owner harus ditolak.",
  );

  console.log(
    "  ✓ Legacy non-owner → DENY",
  );

  console.log(
    "\nALL TICKET OWNERSHIP CONTRACT TESTS PASSED.",
  );
}

main();

export {};
