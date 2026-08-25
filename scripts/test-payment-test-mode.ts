import {
  isIontixTestHttpEnabled,
  isIontixTestHttpAuthorized,
} from "@/lib/payment/test-mode";

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
    "Running IONTIX_TEST HTTP isolation tests...",
  );

  assert(
    isIontixTestHttpEnabled({
      NODE_ENV: "development",
      IONTIX_TEST_ENABLED: "true",
    }) === true,
    "development + explicit flag harus allow.",
  );

  console.log(
    "  ✓ development + enabled → ALLOW",
  );

  assert(
    isIontixTestHttpEnabled({
      NODE_ENV: "development",
      IONTIX_TEST_ENABLED: undefined,
    }) === false,
    "development tanpa explicit flag harus deny.",
  );

  console.log(
    "  ✓ development + disabled → DENY",
  );

  assert(
    isIontixTestHttpEnabled({
      NODE_ENV: "preview",
      IONTIX_TEST_ENABLED: "true",
    }) === true,
    "preview + explicit flag harus allow.",
  );

  console.log(
    "  ✓ preview + enabled → ALLOW",
  );

  assert(
    isIontixTestHttpEnabled({
      NODE_ENV: "production",
      IONTIX_TEST_ENABLED: "true",
    }) === false,
    "production harus selalu deny.",
  );

  console.log(
    "  ✓ production + enabled → DENY",
  );

  assert(
    isIontixTestHttpEnabled({
      NODE_ENV: "production",
      IONTIX_TEST_ENABLED: undefined,
    }) === false,
    "production tanpa flag harus deny.",
  );

  console.log(
    "  ✓ production + disabled → DENY",
  );


  const authorizedRequest =
    new Request(
      "http://localhost/api/payments/iontix-test/confirm",
      {
        headers: {
          "x-iontix-test-secret":
            "test-secret-123",
        },
      },
    );

  assert(
    isIontixTestHttpAuthorized(
      authorizedRequest,
      {
        NODE_ENV:
          "preview",
        IONTIX_TEST_ENABLED:
          "true",
        IONTIX_TEST_HTTP_SECRET:
          "test-secret-123",
      },
    ) === true,
    "Preview dengan flag + secret benar harus allow.",
  );

  console.log(
    "  ✓ preview + valid secret → ALLOW",
  );

  const invalidSecretRequest =
    new Request(
      "http://localhost/api/payments/iontix-test/confirm",
      {
        headers: {
          "x-iontix-test-secret":
            "wrong-secret",
        },
      },
    );

  assert(
    isIontixTestHttpAuthorized(
      invalidSecretRequest,
      {
        NODE_ENV:
          "preview",
        IONTIX_TEST_ENABLED:
          "true",
        IONTIX_TEST_HTTP_SECRET:
          "test-secret-123",
      },
    ) === false,
    "Secret salah harus deny.",
  );

  console.log(
    "  ✓ preview + invalid secret → DENY",
  );

  const missingSecretRequest =
    new Request(
      "http://localhost/api/payments/iontix-test/confirm",
    );

  assert(
    isIontixTestHttpAuthorized(
      missingSecretRequest,
      {
        NODE_ENV:
          "preview",
        IONTIX_TEST_ENABLED:
          "true",
        IONTIX_TEST_HTTP_SECRET:
          "test-secret-123",
      },
    ) === false,
    "Secret kosong harus deny.",
  );

  console.log(
    "  ✓ preview + missing secret → DENY",
  );

  const productionRequest =
    new Request(
      "http://localhost/api/payments/iontix-test/confirm",
      {
        headers: {
          "x-iontix-test-secret":
            "test-secret-123",
        },
      },
    );

  assert(
    isIontixTestHttpAuthorized(
      productionRequest,
      {
        NODE_ENV:
          "production",
        IONTIX_TEST_ENABLED:
          "true",
        IONTIX_TEST_HTTP_SECRET:
          "test-secret-123",
      },
    ) === false,
    "Production harus selalu deny walaupun secret benar.",
  );

  console.log(
    "  ✓ production + valid secret → DENY",
  );

  console.log(
    "\nALL IONTIX_TEST HTTP ISOLATION TESTS PASSED.",
  );
}

main();

export {};
