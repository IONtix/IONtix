export type TicketOwnershipInput = {
  currentUserId: string;
  currentUserEmail?: string | null;
  ticketOwnerId?: string | null;
  ticketOwnerEmail?: string | null;
};

export function userOwnsTicket(
  input: TicketOwnershipInput,
): boolean {
  const currentUserEmail =
    input.currentUserEmail
      ?.trim()
      .toLowerCase() ?? "";

  const ticketOwnerEmail =
    input.ticketOwnerEmail
      ?.trim()
      .toLowerCase() ?? "";

  if (
    input.ticketOwnerId &&
    input.ticketOwnerId ===
      input.currentUserId
  ) {
    return true;
  }

  /*
   * Legacy fallback hanya boleh digunakan
   * ketika ticket belum memiliki userId.
   */
  return Boolean(
    !input.ticketOwnerId &&
      currentUserEmail &&
      ticketOwnerEmail &&
      currentUserEmail ===
        ticketOwnerEmail,
  );
}
