import "dotenv/config";

import {
  createIontixTestCapability,
  verifyIontixTestCapability,
} from "@/lib/payment/test-capability";

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

async function main(): Promise<void> {
  console.log(
    "Running IONTIX_TEST capability regression...",
  );

  const originalSecret =
    process.env.IONTIX_TEST_CAPABILITY_SECRET;

  process.env.IONTIX_TEST_CAPABILITY_SECRET =
    "LOCAL-CAPABILITY-TEST-SECRET";

  try {
    const externalIdA =
      "IONTIX-CAPABILITY-A";

    const externalIdB =
      "IONTIX-CAPABILITY-B";

    const capability =
      createIontixTestCapability(
        externalIdA,
      );

    assert(
      capability.includes("."),
      "Capability harus memiliki payload + signature.",
    );

    console.log(
      "  ✓ Capability berhasil dibuat",
    );

    assert(
      verifyIontixTestCapability(
        capability,
        externalIdA,
      ) === true,
      "Capability valid untuk externalId yang benar harus ALLOW.",
    );

    console.log(
      "  ✓ Capability + externalId benar → ALLOW",
    );

    assert(
      verifyIontixTestCapability(
        capability,
        externalIdB,
      ) === false,
      "Capability payment A tidak boleh digunakan untuk payment B.",
    );

    console.log(
      "  ✓ Capability payment A + externalId B → DENY",
    );

    const parts =
      capability.split(".");

    assert(
      parts.length === 2,
      "Capability harus memiliki dua bagian.",
    );

    const tamperedPayload =
      `${parts[0]}x.${parts[1]}`;

    assert(
      verifyIontixTestCapability(
        tamperedPayload,
        externalIdA,
      ) === false,
      "Capability payload yang dimodifikasi harus DENY.",
    );

    console.log(
      "  ✓ Capability tampered → DENY",
    );

    const tamperedSignature =
      `${parts[0]}.${parts[1]}x`;

    assert(
      verifyIontixTestCapability(
        tamperedSignature,
        externalIdA,
      ) === false,
      "Capability signature yang dimodifikasi harus DENY.",
    );

    console.log(
      "  ✓ Capability signature tampered → DENY",
    );

    assert(
      verifyIontixTestCapability(
        "",
        externalIdA,
      ) === false,
      "Capability kosong harus DENY.",
    );

    console.log(
      "  ✓ Missing capability → DENY",
    );

    console.log(
      "\nALL IONTIX_TEST CAPABILITY TESTS PASSED.",
    );
  } finally {
    if (
      originalSecret ===
      undefined
    ) {
      delete process.env
        .IONTIX_TEST_CAPABILITY_SECRET;
    } else {
      process.env
        .IONTIX_TEST_CAPABILITY_SECRET =
        originalSecret;
    }
  }
}

main().catch((error) => {
  console.error();
  console.error(error);
  process.exitCode = 1;
});

export {};
