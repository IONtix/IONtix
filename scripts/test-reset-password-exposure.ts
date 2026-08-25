import {
  isResetPasswordDevExposureEnabled,
} from "@/lib/auth/reset-password-mode";

function assert(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) {
    throw new Error(`TEST FAILED: ${message}`);
  }
}

function main(): void {
  console.log(
    "Running reset-password exposure tests...",
  );

  assert(
    isResetPasswordDevExposureEnabled({
      NODE_ENV: "production",
      AUTH_RESET_DEV_EXPOSE_TOKEN: "true",
    }) === false,
    "Production harus selalu DENY.",
  );

  console.log(
    "  ✓ production + enabled → DENY",
  );

  assert(
    isResetPasswordDevExposureEnabled({
      NODE_ENV: "production",
      AUTH_RESET_DEV_EXPOSE_TOKEN: undefined,
    }) === false,
    "Production tanpa flag harus DENY.",
  );

  console.log(
    "  ✓ production + disabled → DENY",
  );

  assert(
    isResetPasswordDevExposureEnabled({
      NODE_ENV: "development",
      AUTH_RESET_DEV_EXPOSE_TOKEN: undefined,
    }) === false,
    "Development tanpa flag harus DENY.",
  );

  console.log(
    "  ✓ development + disabled → DENY",
  );

  assert(
    isResetPasswordDevExposureEnabled({
      NODE_ENV: "development",
      AUTH_RESET_DEV_EXPOSE_TOKEN: "true",
    }) === true,
    "Development dengan explicit flag harus ALLOW.",
  );

  console.log(
    "  ✓ development + enabled → ALLOW",
  );

  assert(
    isResetPasswordDevExposureEnabled({
      NODE_ENV: "preview",
      AUTH_RESET_DEV_EXPOSE_TOKEN: "true",
    }) === true,
    "Preview dengan explicit flag mengikuti feature flag.",
  );

  console.log(
    "  ✓ preview + enabled → ALLOW",
  );

  console.log(
    "\nALL RESET-PASSWORD EXPOSURE TESTS PASSED.",
  );
}

main();

export {};
