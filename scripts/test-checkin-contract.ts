import type {
  EventStatus,
  TicketStatus,
} from "@/generated/prisma/client";

import {
  evaluateCheckInEligibility,
} from "@/lib/checkin/rules";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(
      `TEST FAILED: ${message}`,
    );
  }
}

function main(): void {
  console.log(
    "Running QR/check-in contract tests...",
  );

  const cases: Array<{
    name: string;
    ticketStatus: TicketStatus;
    eventStatus: EventStatus;
    eventIsPublished: boolean;
    isAlreadyCheckedIn: boolean;
    expectedResult:
      | "VALID"
      | "ALREADY_USED"
      | "CANCELLED"
      | "EXPIRED"
      | "INVALID";
    expectedCanCheckIn: boolean;
  }> = [
    {
      name:
        "ACTIVE + PUBLISHED + belum check-in → VALID",
      ticketStatus: "ACTIVE",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedResult: "VALID",
      expectedCanCheckIn: true,
    },
    {
      name:
        "ACTIVE + sudah check-in → ALREADY_USED",
      ticketStatus: "ACTIVE",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: true,
      expectedResult: "ALREADY_USED",
      expectedCanCheckIn: false,
    },
    {
      name:
        "USED → ALREADY_USED",
      ticketStatus: "USED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: true,
      expectedResult: "ALREADY_USED",
      expectedCanCheckIn: false,
    },
    {
      name:
        "CANCELLED → CANCELLED",
      ticketStatus: "CANCELLED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedResult: "CANCELLED",
      expectedCanCheckIn: false,
    },
    {
      name:
        "REFUNDED → CANCELLED",
      ticketStatus: "REFUNDED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedResult: "CANCELLED",
      expectedCanCheckIn: false,
    },
    {
      name:
        "EXPIRED → EXPIRED",
      ticketStatus: "EXPIRED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedResult: "EXPIRED",
      expectedCanCheckIn: false,
    },
    {
      name:
        "RESERVED → INVALID",
      ticketStatus: "RESERVED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedResult: "INVALID",
      expectedCanCheckIn: false,
    },
    {
      name:
        "TRANSFERRED → INVALID",
      ticketStatus: "TRANSFERRED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedResult: "INVALID",
      expectedCanCheckIn: false,
    },
    {
      name:
        "ACTIVE + event DRAFT → INVALID",
      ticketStatus: "ACTIVE",
      eventStatus: "DRAFT",
      eventIsPublished: false,
      isAlreadyCheckedIn: false,
      expectedResult: "INVALID",
      expectedCanCheckIn: false,
    },
    {
      name:
        "ACTIVE + event PUBLISHED tetapi unpublished flag → INVALID",
      ticketStatus: "ACTIVE",
      eventStatus: "PUBLISHED",
      eventIsPublished: false,
      isAlreadyCheckedIn: false,
      expectedResult: "INVALID",
      expectedCanCheckIn: false,
    },
  ];

  for (const testCase of cases) {
    const result =
      evaluateCheckInEligibility({
        ticketStatus:
          testCase.ticketStatus,
        eventStatus:
          testCase.eventStatus,
        eventIsPublished:
          testCase.eventIsPublished,
        isAlreadyCheckedIn:
          testCase.isAlreadyCheckedIn,
      });

    assert(
      result.result ===
        testCase.expectedResult,
      `${testCase.name}: result tidak sesuai.`,
    );

    assert(
      result.canCheckIn ===
        testCase.expectedCanCheckIn,
      `${testCase.name}: canCheckIn tidak sesuai.`,
    );

    console.log(
      `  ✓ ${testCase.name}`,
    );
  }

  console.log(
    "\nALL QR/CHECK-IN CONTRACT TESTS PASSED.",
  );
}

main();

export {};
