import crypto from "node:crypto";

import prisma from "@/lib/prisma";

export type RateLimitInput = {
  key: string;
  limit: number;
  windowSeconds: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: Date;
  count: number;
};

function validateInput(
  input: RateLimitInput,
): void {
  if (
    !input.key.trim() ||
    !Number.isInteger(input.limit) ||
    input.limit <= 0 ||
    !Number.isInteger(
      input.windowSeconds,
    ) ||
    input.windowSeconds <= 0
  ) {
    throw new Error(
      "Konfigurasi rate limit tidak valid.",
    );
  }
}

function getWindow(
  now: Date,
  windowSeconds: number,
): {
  windowStart: Date;
  expiresAt: Date;
} {
  const windowMs =
    windowSeconds * 1000;

  const windowStart =
    new Date(
      Math.floor(
        now.getTime() /
          windowMs,
      ) * windowMs,
    );

  return {
    windowStart,
    expiresAt: new Date(
      windowStart.getTime() +
        windowMs,
    ),
  };
}

/**
 * Read-only check.
 *
 * Tidak menambah counter.
 */
export async function peekRateLimit(
  input: RateLimitInput,
): Promise<RateLimitResult> {
  validateInput(input);

  const now = new Date();
  const { expiresAt } =
    getWindow(
      now,
      input.windowSeconds,
    );

  const bucket =
    await prisma.rateLimitBucket.findUnique({
      where: {
        key: input.key.trim(),
      },
      select: {
        count: true,
        expiresAt: true,
      },
    });

  /*
   * Belum pernah ada bucket:
   * request masih boleh.
   */
  if (!bucket) {
    return {
      allowed: true,
      limit: input.limit,
      remaining: input.limit,
      resetAt: expiresAt,
      count: 0,
    };
  }

  /*
   * Bucket sudah expired:
   * dianggap kosong kembali.
   */
  if (
    bucket.expiresAt <= now
  ) {
    return {
      allowed: true,
      limit: input.limit,
      remaining: input.limit,
      resetAt: expiresAt,
      count: 0,
    };
  }

  return {
    allowed:
      bucket.count <
      input.limit,
    limit: input.limit,
    remaining: Math.max(
      input.limit -
        bucket.count,
      0,
    ),
    resetAt:
      bucket.expiresAt,
    count: bucket.count,
  };
}

/**
 * Consume satu attempt secara atomic.
 *
 * Dipakai hanya ketika kita memang ingin
 * menambah counter.
 */
export async function consumeRateLimit(
  input: RateLimitInput,
): Promise<RateLimitResult> {
  validateInput(input);

  const now = new Date();

  const {
    windowStart,
    expiresAt,
  } = getWindow(
    now,
    input.windowSeconds,
  );

  const key =
    input.key.trim();

  const id =
    crypto.randomUUID();

  const rows =
    await prisma.$queryRaw<
      Array<{
        id: string;
        count: number;
        windowStart: Date;
        expiresAt: Date;
      }>
    >`
      INSERT INTO "RateLimitBucket" (
        id,
        key,
        count,
        "windowStart",
        "expiresAt",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${id},
        ${key},
        1,
        ${windowStart},
        ${expiresAt},
        NOW(),
        NOW()
      )
      ON CONFLICT (key)
      DO UPDATE SET
        count = CASE
          WHEN "RateLimitBucket"."expiresAt" <= ${now}
            THEN 1
          ELSE "RateLimitBucket"."count" + 1
        END,
        "windowStart" = CASE
          WHEN "RateLimitBucket"."expiresAt" <= ${now}
            THEN ${windowStart}
          ELSE "RateLimitBucket"."windowStart"
        END,
        "expiresAt" = CASE
          WHEN "RateLimitBucket"."expiresAt" <= ${now}
            THEN ${expiresAt}
          ELSE "RateLimitBucket"."expiresAt"
        END,
        "updatedAt" = NOW()
      RETURNING
        id,
        count,
        "windowStart",
        "expiresAt"
    `;

  const row =
    rows[0];

  if (!row) {
    throw new Error(
      "Rate limit bucket gagal diperbarui.",
    );
  }

  return {
    allowed:
      row.count <=
      input.limit,
    limit:
      input.limit,
    remaining:
      Math.max(
        input.limit -
          row.count,
        0,
      ),
    resetAt:
      row.expiresAt,
    count:
      row.count,
  };
}
