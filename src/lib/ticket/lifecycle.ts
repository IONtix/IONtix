import type {
  PaymentStatus,
  TicketStatus,
} from "@/generated/prisma/client";

export function ticketStatusForPaymentLifecycle(
  paymentStatus: PaymentStatus,
  currentTicketStatus: TicketStatus,
): TicketStatus | null {
  /*
   * Refund penuh adalah transisi pasca-pembayaran.
   * Ticket ACTIVE menjadi REFUNDED.
   *
   * Jangan menurunkan state untuk callback terminal lain
   * di sini; stale callback protection ditangani oleh
   * payment confirmation layer.
   */
  if (
    paymentStatus === "REFUNDED" &&
    currentTicketStatus === "ACTIVE"
  ) {
    return "REFUNDED";
  }

  return null;
}
