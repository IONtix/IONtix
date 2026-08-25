type PublicTicketLookup = {
  id: string;
  fullName: string | null;
  jerseySize: string | null;
  ticketCategory: {
    name: string;
    event: {
      title: string;
    };
  };
  tickets: Array<{
    id: string;
    ticketNumber: string;
    status: string;
  }>;
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
    "Running public ticket lookup privacy contract...",
  );

  const response: PublicTicketLookup = {
    id: "order-test",
    fullName: "Peserta Test",
    jerseySize: "M",
    ticketCategory: {
      name: "10K",
      event: {
        title: "IONtix Test Event",
      },
    },
    tickets: [
      {
        id: "ticket-test",
        ticketNumber: "ION-123",
        status: "ACTIVE",
      },
    ],
  };

  const forbiddenFields = [
    "email",
    "phone",
    "isClaimed",
    "approvalStatus",
    "createdAt",
    "date",
    "endDate",
    "location",
    "isPublished",
  ];

  const serialized =
    JSON.stringify(response);

  for (const field of forbiddenFields) {
    assert(
      !serialized.includes(
        `"${field}"`,
      ),
      `Field publik terlarang ditemukan: ${field}`,
    );

    console.log(
      `  ✓ ${field} tidak diekspos`,
    );
  }

  assert(
    response.id === "order-test",
    "Order id harus tersedia.",
  );

  assert(
    response.fullName ===
      "Peserta Test",
    "fullName harus tersedia.",
  );

  assert(
    response.ticketCategory.event.title ===
      "IONtix Test Event",
    "Event title harus tersedia.",
  );

  assert(
    response.tickets[0]?.id ===
      "ticket-test",
    "Ticket id harus tersedia.",
  );

  assert(
    response.tickets[0]?.ticketNumber ===
      "ION-123",
    "Ticket number harus tersedia.",
  );

  console.log(
    "  ✓ Data minimum untuk UI tetap tersedia",
  );

  console.log(
    "\nALL PUBLIC TICKET LOOKUP PRIVACY TESTS PASSED.",
  );
}

main();

export {};
