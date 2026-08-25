import type {
  EventStatus,
  TicketStatus,
} from "@/generated/prisma/client";

export type CheckInEligibilityResult = {
  canCheckIn: boolean;
  result:
    | "VALID"
    | "ALREADY_USED"
    | "CANCELLED"
    | "EXPIRED"
    | "INVALID";
  error?: string;
};

export type CheckInEligibilityInput = {
  ticketStatus: TicketStatus;
  eventStatus: EventStatus;
  eventIsPublished: boolean;
  isAlreadyCheckedIn: boolean;
};

export function evaluateCheckInEligibility(
  input: CheckInEligibilityInput,
): CheckInEligibilityResult {
  if (input.isAlreadyCheckedIn) {
    return {
      canCheckIn: false,
      result: "ALREADY_USED",
      error: "Ticket sudah melakukan check-in.",
    };
  }

  if (
    input.ticketStatus === "CANCELLED" ||
    input.ticketStatus === "REFUNDED"
  ) {
    return {
      canCheckIn: false,
      result: "CANCELLED",
      error: "Tiket sudah dibatalkan atau direfund.",
    };
  }

  if (input.ticketStatus === "EXPIRED") {
    return {
      canCheckIn: false,
      result: "EXPIRED",
      error: "Tiket sudah expired.",
    };
  }

  if (input.ticketStatus !== "ACTIVE") {
    return {
      canCheckIn: false,
      result: "INVALID",
      error:
        "Tiket belum aktif dan belum dapat digunakan untuk check-in.",
    };
  }

  if (
    input.eventStatus !== "PUBLISHED" ||
    !input.eventIsPublished
  ) {
    return {
      canCheckIn: false,
      result: "INVALID",
      error:
        "Event belum aktif untuk proses check-in.",
    };
  }

  return {
    canCheckIn: true,
    result: "VALID",
  };
}
