type OrderOwnershipInput = {
  currentUserId: string;
  currentUserEmail: string;
  buyerUserId: string | null;
  orderEmail: string | null;
};

export function userOwnsOrder(
  input: OrderOwnershipInput,
): boolean {
  if (
    input.buyerUserId &&
    input.buyerUserId ===
      input.currentUserId
  ) {
    return true;
  }

  /*
   * Legacy compatibility:
   * order lama mungkin belum memiliki buyerUserId.
   *
   * Email hanya boleh menjadi fallback ketika
   * canonical buyerUserId tidak tersedia.
   */
  if (
    !input.buyerUserId &&
    input.orderEmail
  ) {
    return (
      input.currentUserEmail
        .trim()
        .toLowerCase() ===
      input.orderEmail
        .trim()
        .toLowerCase()
    );
  }

  return false;
}
