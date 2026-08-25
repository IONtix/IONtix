import {
  hashRateLimitIdentifier,
} from "@/lib/security/rate-limit-key";

import {
  consumeRateLimit,
} from "@/lib/security/rate-limit";

export type PaymentRetryRateLimitInput = {
  userId: string;
  orderId: string;
};

export async function checkPaymentRetryRateLimit(
  input: PaymentRetryRateLimitInput,
): Promise<{
  allowed: boolean;
}> {
  const userKey =
    `retry:user:${hashRateLimitIdentifier(
      input.userId,
    )}`;

  const orderKey =
    `retry:order:${hashRateLimitIdentifier(
      input.orderId,
    )}`;

  const [
    userResult,
    orderResult,
  ] = await Promise.all([
    consumeRateLimit({
      key: userKey,
      limit: 10,
      windowSeconds: 15 * 60,
    }),
    consumeRateLimit({
      key: orderKey,
      limit: 3,
      windowSeconds: 15 * 60,
    }),
  ]);

  return {
    allowed:
      userResult.allowed &&
      orderResult.allowed,
  };
}
