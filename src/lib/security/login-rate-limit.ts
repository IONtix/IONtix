import {
  getClientIp,
  hashRateLimitIdentifier,
  normalizeEmail,
} from "@/lib/security/rate-limit-key";

import {
  peekRateLimit,
  consumeRateLimit,
} from "@/lib/security/rate-limit";

export type LoginRateLimitRequest = {
  email: string;
  headers: Headers;
};

export type LoginRateLimitKeys = {
  ipKey: string;
  accountKey: string;
};

export function getLoginRateLimitKeys(
  input: LoginRateLimitRequest,
): LoginRateLimitKeys {
  const email =
    normalizeEmail(input.email);

  const ip =
    getClientIp(input.headers);

  return {
    ipKey:
      `login:ip:${hashRateLimitIdentifier(ip)}`,
    accountKey:
      `login:account:${hashRateLimitIdentifier(email)}`,
  };
}

/**
 * Read-only login eligibility check.
 * Tidak mengonsumsi failure budget.
 */
export async function checkLoginRateLimit(
  input: LoginRateLimitRequest,
): Promise<{
  allowed: boolean;
}> {
  const keys =
    getLoginRateLimitKeys(input);

  const [
    ipResult,
    accountResult,
  ] = await Promise.all([
    peekRateLimit({
      key: keys.ipKey,
      limit: 10,
      windowSeconds: 15 * 60,
    }),
    peekRateLimit({
      key: keys.accountKey,
      limit: 5,
      windowSeconds: 15 * 60,
    }),
  ]);

  return {
    allowed:
      ipResult.allowed &&
      accountResult.allowed,
  };
}

/**
 * Record satu failed login attempt.
 */
export async function recordLoginFailure(
  input: LoginRateLimitRequest,
): Promise<void> {
  const keys =
    getLoginRateLimitKeys(input);

  await Promise.all([
    consumeRateLimit({
      key: keys.ipKey,
      limit: 10,
      windowSeconds: 15 * 60,
    }),
    consumeRateLimit({
      key: keys.accountKey,
      limit: 5,
      windowSeconds: 15 * 60,
    }),
  ]);
}
