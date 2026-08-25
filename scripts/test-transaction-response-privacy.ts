type PublicCustomer = {
  fullName: string | null;
  email: string | null;
};

type PublicTransactionResponse = {
  customer: PublicCustomer | null;
};

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

function assertNoForbiddenFields(
  value: unknown,
  label: string,
): void {
  const serialized =
    JSON.stringify(value);

  for (const field of [
    "phone",
    "participant",
    "dateOfBirth",
    "bloodType",
    "emergencyContact",
    "profilePhotoUrl",
    "userId",
  ]) {
    assert(
      !serialized.includes(
        `"${field}"`,
      ),
      `${label} masih mengekspos field ${field}.`,
    );

    console.log(
      `  ✓ ${label}: ${field} tidak diekspos`,
    );
  }
}

function main(): void {
  console.log(
    "Running transaction response privacy contract...",
  );

  const response:
    PublicTransactionResponse = {
      customer: {
        fullName:
          "Peserta Test",
        email:
          "peserta@example.com",
      },
    };

  assertNoForbiddenFields(
    response,
    "Transaction response",
  );

  assert(
    response.customer?.fullName ===
      "Peserta Test",
    "Customer fullName harus tetap tersedia.",
  );

  assert(
    response.customer?.email ===
      "peserta@example.com",
    "Customer email harus tetap tersedia.",
  );

  console.log(
    "  ✓ Customer data minimum tetap tersedia",
  );

  console.log(
    "\nALL TRANSACTION RESPONSE PRIVACY TESTS PASSED.",
  );
}

main();

export {};
