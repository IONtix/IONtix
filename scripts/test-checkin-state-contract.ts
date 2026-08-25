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

type StateCase = {
  name: string;
  ticketStatus: TicketStatus;
  eventStatus: EventStatus;
  eventIsPublished: boolean;
  isAlreadyCheckedIn: boolean;
  expectedCanCheckIn: boolean;
  expectedResult:
    | "VALID"
    | "ALREADY_USED"
    | "CANCELLED"
    | "EXPIRED"
    | "INVALID";
};

function main(): void {
  console.log(
    "Running check-in state machine contract tests...",
  );

  const activeState: StateCase = {
    name:
      "ACTIVE / PUBLISHED / belum digunakan",
    ticketStatus: "ACTIVE",
    eventStatus: "PUBLISHED",
    eventIsPublished: true,
    isAlreadyCheckedIn: false,
    expectedCanCheckIn: true,
    expectedResult: "VALID",
  };

  const terminalStates: StateCase[] = [
    {
      name:
        "ACTIVE + already checked in",
      ticketStatus: "ACTIVE",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: true,
      expectedCanCheckIn: false,
      expectedResult:
        "ALREADY_USED",
    },
    {
      name: "USED",
      ticketStatus: "USED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: true,
      expectedCanCheckIn: false,
      expectedResult:
        "ALREADY_USED",
    },
    {
      name: "CANCELLED",
      ticketStatus: "CANCELLED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedCanCheckIn: false,
      expectedResult:
        "CANCELLED",
    },
    {
      name: "REFUNDED",
      ticketStatus: "REFUNDED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedCanCheckIn: false,
      expectedResult:
        "CANCELLED",
    },
    {
      name: "EXPIRED",
      ticketStatus: "EXPIRED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedCanCheckIn: false,
      expectedResult:
        "EXPIRED",
    },
    {
      name: "RESERVED",
      ticketStatus: "RESERVED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedCanCheckIn: false,
      expectedResult:
        "INVALID",
    },
    {
      name: "TRANSFERRED",
      ticketStatus: "TRANSFERRED",
      eventStatus: "PUBLISHED",
      eventIsPublished: true,
      isAlreadyCheckedIn: false,
      expectedCanCheckIn: false,
      expectedResult:
        "INVALID",
    },
  ];

  console.log(
    "→ Active state...",
  );

  {
    const result =
      evaluateCheckInEligibility(
        activeState,
      );

    assert(
      result.canCheckIn === true,
      "ACTIVE ticket harus dapat check-in.",
    );

    assert(
      result.result === "VALID",
      "ACTIVE ticket harus menghasilkan VALID.",
    );

    console.log(
      "  ✓ ACTIVE → VALID",
    );
  }

  console.log(
    "→ Terminal / non-eligible states...",
  );

  for (const state of terminalStates) {
    const result =
      evaluateCheckInEligibility(
        state,
      );

    assert(
      result.canCheckIn ===
        state.expectedCanCheckIn,
      `${state.name}: canCheckIn salah.`,
    );

    assert(
      result.result ===
        state.expectedResult,
      `${state.name}: result salah.`,
    );

    console.log(
      `  ✓ ${state.name} → ${state.expectedResult}`,
    );
  }

  console.log(
    "→ Event eligibility...",
  );

  const eventCases = [
    {
      name:
        "ACTIVE + event DRAFT",
      eventStatus:
        "DRAFT" as EventStatus,
      eventIsPublished: false,
    },
    {
      name:
        "ACTIVE + PUBLISHED + unpublished flag",
      eventStatus:
        "PUBLISHED" as EventStatus,
      eventIsPublished: false,
    },
    {
      name:
        "ACTIVE + SUSPENDED",
      eventStatus:
        "SUSPENDED" as EventStatus,
      eventIsPublished: true,
    },
    {
      name:
        "ACTIVE + CANCELLED",
      eventStatus:
        "CANCELLED" as EventStatus,
      eventIsPublished: false,
    },
  ];

  for (const eventCase of eventCases) {
    const result =
      evaluateCheckInEligibility({
        ticketStatus: "ACTIVE",
        eventStatus:
          eventCase.eventStatus,
        eventIsPublished:
          eventCase.eventIsPublished,
        isAlreadyCheckedIn: false,
      });

    assert(
      result.canCheckIn === false,
      `${eventCase.name}: check-in tidak boleh diizinkan.`,
    );

    assert(
      result.result === "INVALID",
      `${eventCase.name}: result harus INVALID.`,
    );

    console.log(
      `  ✓ ${eventCase.name} → INVALID`,
    );
  }

  console.log(
    "→ Idempotent state...",
  );

  const alreadyUsedSignals = [
    {
      name: "CheckIn CHECKED_IN",
      value: true,
    },
    {
      name: "legacy isScanned",
      value: true,
    },
    {
      name: "legacy checkedInAt",
      value: true,
    },
  ];

  for (const signal of alreadyUsedSignals) {
    const result =
      evaluateCheckInEligibility({
        ticketStatus: "ACTIVE",
        eventStatus:
          "PUBLISHED",
        eventIsPublished: true,
        isAlreadyCheckedIn:
          signal.value,
      });

    assert(
      result.canCheckIn === false,
      `${signal.name}: ticket tidak boleh check-in ulang.`,
    );

    assert(
      result.result === "ALREADY_USED",
      `${signal.name}: harus menghasilkan ALREADY_USED.`,
    );

    console.log(
      `  ✓ ${signal.name} → ALREADY_USED`,
    );
  }

  console.log(
    "\nALL CHECK-IN STATE CONTRACT TESTS PASSED.",
  );
}

main();

export {};
