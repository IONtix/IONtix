import {
  getClientIp,
  hashRateLimitIdentifier,
} from "@/lib/security/rate-limit-key";

import {
  consumeRateLimit,
} from "@/lib/security/rate-limit";

export type ResetPasswordRateLimitInput = {
  token: string;
  headers: Headers;
};

export async function checkResetPasswordRateLimit(
  input: ResetPasswordRateLimitInput,
): Promise<{
  allowed: boolean;
}> {
  const ip =
    getClientIp(input.headers);

  const ipKey =
    `reset-password:ip:${hashRateLimitIdentifier(ip)}`;

  const tokenKey =
    `reset-password:token:${hashRateLimitIdentifier(input.token)}`;

  const [
    ipResult,
    tokenResult,
  ] = await Promise.all([
    consumeRateLimit({
      key: ipKey,
      limit: 10,
      windowSeconds: 15 * 60,
    }),
    consumeRateLimit({
      key: tokenKey,
      limit: 5,
      windowSeconds: 15 * 60,
    }),
  ]);

  return {
    allowed:
      ipResult.allowed &&
      tokenResult.allowed,
  };
}
