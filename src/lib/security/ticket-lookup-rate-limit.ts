import {
  getClientIp,
  hashRateLimitIdentifier,
  normalizeEmail,
} from "@/lib/security/rate-limit-key";

import {
  consumeRateLimit,
} from "@/lib/security/rate-limit";

export type TicketLookupRateLimitInput = {
  email: string;
  headers: Headers;
};

export async function checkTicketLookupRateLimit(
  input: TicketLookupRateLimitInput,
): Promise<{
  allowed: boolean;
}> {
  const email =
    normalizeEmail(input.email);

  const ip =
    getClientIp(input.headers);

  const ipKey =
    `cek-tiket:ip:${hashRateLimitIdentifier(ip)}`;

  const emailKey =
    `cek-tiket:email:${hashRateLimitIdentifier(email)}`;

  const [
    ipResult,
    emailResult,
  ] = await Promise.all([
    consumeRateLimit({
      key: ipKey,
      limit: 20,
      windowSeconds: 15 * 60,
    }),
    consumeRateLimit({
      key: emailKey,
      limit: 10,
      windowSeconds: 15 * 60,
    }),
  ]);

  return {
    allowed:
      ipResult.allowed &&
      emailResult.allowed,
  };
}
