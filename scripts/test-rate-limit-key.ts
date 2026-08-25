import {
  getClientIp,
  hashRateLimitIdentifier,
  normalizeEmail,
} from "@/lib/security/rate-limit-key";

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

function main() {
  console.log(
    "Running rate-limit key contract...",
  );

  assert(
    normalizeEmail(
      "  Admin@IONTIX.COM ",
    ) ===
      "admin@iontix.com",
    "Email harus dinormalisasi.",
  );

  const hashA =
    hashRateLimitIdentifier(
      "admin@iontix.com",
    );

  const hashB =
    hashRateLimitIdentifier(
      "admin@iontix.com",
    );

  assert(
    hashA === hashB,
    "Hash identifier harus deterministic.",
  );

  assert(
    hashA !==
      "admin@iontix.com",
    "Raw email tidak boleh menjadi hash key.",
  );

  const ip =
    getClientIp(
      new Headers({
        "x-forwarded-for":
          "203.0.113.10, 10.0.0.1",
      }),
    );

  assert(
    ip === "203.0.113.10",
    "IP pertama dari x-forwarded-for harus digunakan.",
  );

  const realIp =
    getClientIp(
      new Headers({
        "x-real-ip":
          "203.0.113.20",
      }),
    );

  assert(
    realIp ===
      "203.0.113.20",
    "x-real-ip harus menjadi fallback.",
  );

  console.log(
    "  ✓ Email normalization",
  );
  console.log(
    "  ✓ Stable identifier hashing",
  );
  console.log(
    "  ✓ Raw identifier tidak diekspos",
  );
  console.log(
    "  ✓ x-forwarded-for parsing",
  );
  console.log(
    "  ✓ x-real-ip fallback",
  );

  console.log(
    "\nALL RATE LIMIT KEY TESTS PASSED.",
  );
}

main();

export {};
