import {
  getClientIp,
  hashRateLimitIdentifier,
  normalizeEmail,
} from "@/lib/security/rate-limit-key";

import {
  consumeRateLimit,
} from "@/lib/security/rate-limit";

export type ForgotPasswordRateLimitInput = {
  email: string;
  headers: Headers;
};

export async function checkForgotPasswordRateLimit(
  input: ForgotPasswordRateLimitInput,
): Promise<{
  allowed: boolean;
}> {
  const email =
    normalizeEmail(input.email);

  const ip =
    getClientIp(input.headers);

  const ipKey =
    `forgot-password:ip:${hashRateLimitIdentifier(ip)}`;

  const emailKey =
    `forgot-password:email:${hashRateLimitIdentifier(email)}`;

  const [
    ipResult,
    emailResult,
  ] = await Promise.all([
    consumeRateLimit({
      key: ipKey,
      limit: 5,
      windowSeconds: 15 * 60,
    }),
    consumeRateLimit({
      key: emailKey,
      limit: 3,
      windowSeconds: 15 * 60,
    }),
  ]);

  return {
    allowed:
      ipResult.allowed &&
      emailResult.allowed,
  };
}
