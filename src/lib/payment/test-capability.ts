import crypto from "node:crypto";

const CAPABILITY_TTL_SECONDS = 10 * 60;

type CapabilityPayload = {
  externalId: string;
  exp: number;
};

function getSecret(): string {
  const secret =
    process.env.IONTIX_TEST_CAPABILITY_SECRET;

  if (!secret) {
    throw new Error(
      "IONTIX_TEST_CAPABILITY_SECRET belum dikonfigurasi.",
    );
  }

  return secret;
}

function encodePayload(
  payload: CapabilityPayload,
): string {
  return Buffer.from(
    JSON.stringify(payload),
    "utf8",
  ).toString("base64url");
}

function sign(
  encodedPayload: string,
): string {
  return crypto
    .createHmac(
      "sha256",
      getSecret(),
    )
    .update(encodedPayload)
    .digest("base64url");
}

export function createIontixTestCapability(
  externalId: string,
): string {
  const payload: CapabilityPayload = {
    externalId,
    exp:
      Math.floor(
        Date.now() / 1000,
      ) +
      CAPABILITY_TTL_SECONDS,
  };

  const encoded =
    encodePayload(payload);

  return `${encoded}.${sign(encoded)}`;
}

export function verifyIontixTestCapability(
  token: string,
  externalId: string,
): boolean {
  try {
    const [encodedPayload, providedSignature] =
      token.split(".");

    if (
      !encodedPayload ||
      !providedSignature
    ) {
      return false;
    }

    const expectedSignature =
      sign(encodedPayload);

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "utf8",
      );

    const providedBuffer =
      Buffer.from(
        providedSignature,
        "utf8",
      );

    if (
      expectedBuffer.length !==
      providedBuffer.length
    ) {
      return false;
    }

    if (
      !crypto.timingSafeEqual(
        expectedBuffer,
        providedBuffer,
      )
    ) {
      return false;
    }

    const payload =
      JSON.parse(
        Buffer.from(
          encodedPayload,
          "base64url",
        ).toString("utf8"),
      ) as CapabilityPayload;

    return (
      payload.externalId ===
        externalId &&
      Number.isFinite(payload.exp) &&
      payload.exp >=
        Math.floor(
          Date.now() / 1000,
        )
    );
  } catch {
    return false;
  }
}
