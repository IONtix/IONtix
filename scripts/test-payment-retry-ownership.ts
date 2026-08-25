import "dotenv/config";

import { OrderStatus, PaymentStatus } from "@/generated/prisma/client";
import { userOwnsOrder } from "@/lib/order/ownership";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function expectDenied(
  condition: boolean,
  label: string,
): void {
  assert(
    condition,
    `${label} harus ditolak.`,
  );

  console.log(
    `  ✓ ${label} → DENY`,
  );
}

function canRetryOrder(input: {
  buyerUserId: string | null;
  currentUserId: string;
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentExpired: boolean;
}): boolean {
  if (
    input.buyerUserId !==
    input.currentUserId
  ) {
    return false;
  }

  if (
    input.orderStatus ===
      OrderStatus.PAID ||
    input.orderStatus ===
      OrderStatus.EXPIRED ||
    input.orderStatus ===
      OrderStatus.CANCELLED ||
    input.orderStatus ===
      OrderStatus.FAILED
  ) {
    return false;
  }

  if (
    input.paymentStatus ===
    PaymentStatus.SUCCESS
  ) {
    return false;
  }

  if (input.paymentExpired) {
    return false;
  }

  return true;
}

function main(): void {
  console.log(
    "Running payment retry authorization contract tests...",
  );

  const owner = "USER-A";
  const attacker = "USER-B";

  assert(
    userOwnsOrder({
      currentUserId: owner,
      currentUserEmail:
        "a@example.com",
      buyerUserId: owner,
      orderEmail:
        "a@example.com",
    }),
    "Owner harus memiliki ownership order.",
  );

  assert(
    canRetryOrder({
      buyerUserId: owner,
      currentUserId: owner,
      orderStatus:
        OrderStatus.PENDING_PAYMENT,
      paymentStatus:
        PaymentStatus.PENDING,
      paymentExpired: false,
    }),
    "Owner dengan order pending harus dapat retry.",
  );

  console.log(
    "  ✓ Owner + PENDING_PAYMENT → ALLOW",
  );

  expectDenied(
    !canRetryOrder({
      buyerUserId: owner,
      currentUserId: attacker,
      orderStatus:
        OrderStatus.PENDING_PAYMENT,
      paymentStatus:
        PaymentStatus.PENDING,
      paymentExpired: false,
    }),
    "Non-owner",
  );

  expectDenied(
    !canRetryOrder({
      buyerUserId: owner,
      currentUserId: owner,
      orderStatus:
        OrderStatus.PAID,
      paymentStatus:
        PaymentStatus.SUCCESS,
      paymentExpired: false,
    }),
    "PAID order",
  );

  expectDenied(
    !canRetryOrder({
      buyerUserId: owner,
      currentUserId: owner,
      orderStatus:
        OrderStatus.EXPIRED,
      paymentStatus:
        PaymentStatus.PENDING,
      paymentExpired: false,
    }),
    "EXPIRED order",
  );

  expectDenied(
    !canRetryOrder({
      buyerUserId: owner,
      currentUserId: owner,
      orderStatus:
        OrderStatus.PENDING_PAYMENT,
      paymentStatus:
        PaymentStatus.SUCCESS,
      paymentExpired: false,
    }),
    "SUCCESS payment",
  );

  expectDenied(
    !canRetryOrder({
      buyerUserId: owner,
      currentUserId: owner,
      orderStatus:
        OrderStatus.PENDING_PAYMENT,
      paymentStatus:
        PaymentStatus.PENDING,
      paymentExpired: true,
    }),
    "Expired payment",
  );

  /*
   * Critical IDOR regression:
   * matching email is irrelevant when buyerUserId
   * points to another user.
   */
  expectDenied(
    !userOwnsOrder({
      currentUserId: attacker,
      currentUserEmail:
        "a@example.com",
      buyerUserId: owner,
      orderEmail:
        "a@example.com",
    }),
    "Attacker + same email",
  );

  console.log(
    "\nALL PAYMENT RETRY AUTHORIZATION TESTS PASSED.",
  );
}

main();

export {};
