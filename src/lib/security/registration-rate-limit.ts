import {
  getClientIp,
  hashRateLimitIdentifier,
} from "@/lib/security/rate-limit-key";

import {
  consumeRateLimit,
} from "@/lib/security/rate-limit";

export type RegistrationRateLimitInput = {
  headers: Headers;
};

export async function checkRegistrationRateLimit(
  input: RegistrationRateLimitInput,
): Promise<{
  allowed: boolean;
}> {
  const ip =
    getClientIp(input.headers);

  const ipKey =
    `register:ip:${hashRateLimitIdentifier(ip)}`;

  const result =
    await consumeRateLimit({
      key: ipKey,
      limit: 5,
      windowSeconds: 15 * 60,
    });

  return {
    allowed:
      result.allowed,
  };
}
