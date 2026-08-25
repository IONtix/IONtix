import crypto from "node:crypto";

type TestModeEnvironment = {
  NODE_ENV?: string;
  IONTIX_TEST_ENABLED?: string;
  IONTIX_TEST_HTTP_SECRET?: string;
};

export const IONTIX_TEST_SECRET_HEADER =
  "x-iontix-test-secret";

export function isIontixTestHttpEnabled(
  env: TestModeEnvironment = process.env,
): boolean {
  /*
   * Production selalu menolak IONTIX_TEST HTTP,
   * walaupun flag diaktifkan.
   *
   * Development/preview hanya boleh aktif jika
   * IONTIX_TEST_ENABLED=true.
   */
  return (
    env.NODE_ENV !== "production" &&
    env.IONTIX_TEST_ENABLED === "true"
  );
}

export function isIontixTestHttpAuthorized(
  request: Request,
  env: TestModeEnvironment = process.env,
): boolean {
  if (
    !isIontixTestHttpEnabled(env)
  ) {
    return false;
  }

  const configuredSecret =
    env.IONTIX_TEST_HTTP_SECRET;

  if (
    !configuredSecret
  ) {
    return false;
  }

  const providedSecret =
    request.headers.get(
      IONTIX_TEST_SECRET_HEADER,
    );

  if (
    !providedSecret
  ) {
    return false;
  }

  const expected =
    Buffer.from(
      configuredSecret,
      "utf8",
    );

  const provided =
    Buffer.from(
      providedSecret,
      "utf8",
    );

  if (
    expected.length !==
    provided.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expected,
    provided,
  );
}
