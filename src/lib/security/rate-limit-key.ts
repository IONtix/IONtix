import crypto from "node:crypto";

export function normalizeEmail(
  email: string,
): string {
  return email
    .trim()
    .toLowerCase();
}

export function hashRateLimitIdentifier(
  value: string,
): string {
  return crypto
    .createHash("sha256")
    .update(value, "utf8")
    .digest("hex");
}

export function getClientIp(
  headers: Headers | Record<string, unknown>,
): string {
  let forwarded: string | null =
    null;

  if (headers instanceof Headers) {
    forwarded =
      headers.get("x-forwarded-for");
  } else {
    const value =
      headers["x-forwarded-for"];

    forwarded =
      typeof value === "string"
        ? value
        : null;
  }

  if (forwarded) {
    const first =
      forwarded
        .split(",")[0]
        ?.trim();

    if (first) {
      return first;
    }
  }

  if (headers instanceof Headers) {
    return (
      headers.get("x-real-ip") ??
      "unknown"
    );
  }

  const realIp =
    headers["x-real-ip"];

  return typeof realIp === "string"
    ? realIp
    : "unknown";
}
