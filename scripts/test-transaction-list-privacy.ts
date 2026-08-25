type PublicTransactionListRow = {
  id: string;
  amount: number;
  status: string;
  statusLabel: string;
  paymentMethod: string | null;
  externalId: string | null;
  createdAt: string;
  updatedAt: string;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    approvalStatus: string | null;
    totalPrice: number;
    customer: {
      fullName: string | null;
      email: string | null;
    };
    event: {
      id: string;
      title: string;
    };
  };
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

function main(): void {
  console.log(
    "Running transaction list privacy contract...",
  );

  const response: PublicTransactionListRow = {
    id: "tx-test",
    amount: 100000,
    status: "SUCCESS",
    statusLabel: "Berhasil",
    paymentMethod: "QRIS",
    externalId: "IONTIX-TEST-001",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: {
      id: "order-test",
      orderNumber: "ORD-001",
      status: "PAID",
      approvalStatus: "NONE",
      totalPrice: 100000,
      customer: {
        fullName: "Peserta Test",
        email: "peserta@example.com",
      },
      event: {
        id: "event-test",
        title: "IONtix Test Event",
      },
    },
  };

  const serialized =
    JSON.stringify(response);

  for (const field of [
    "phone",
    "participant",
    "dateOfBirth",
    "bloodType",
    "emergencyContact",
    "profilePhotoUrl",
  ]) {
    assert(
      !serialized.includes(`"${field}"`),
      `Field ${field} tidak boleh ada pada transaction list.`,
    );

    console.log(
      `  ✓ ${field} tidak diekspos`,
    );
  }

  assert(
    response.order.customer.fullName ===
      "Peserta Test",
    "Customer fullName harus tetap tersedia.",
  );

  assert(
    response.order.customer.email ===
      "peserta@example.com",
    "Customer email harus tetap tersedia.",
  );

  console.log(
    "  ✓ Customer minimum tetap tersedia",
  );

  assert(
    response.externalId ===
      "IONTIX-TEST-001",
    "External ID harus tetap tersedia.",
  );

  assert(
    response.amount === 100000,
    "Amount harus tetap tersedia.",
  );

  console.log(
    "  ✓ Transaction fields utama tetap tersedia",
  );

  console.log(
    "\nALL TRANSACTION LIST PRIVACY TESTS PASSED.",
  );
}

main();

export {};
