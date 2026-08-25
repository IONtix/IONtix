import { AuthorizationError } from "@/lib/auth/authorization";
import { userOwnsOrder } from "@/lib/order/ownership";

type OrderAuthorizationInput = {
  currentUserId: string;
  currentUserEmail: string;
  buyerUserId: string | null;
  orderEmail: string | null;
  eventPermissionGranted: boolean;
};

export function assertOrderParticipantOrManagerAccess(
  input: OrderAuthorizationInput,
): void {
  if (
    input.eventPermissionGranted
  ) {
    return;
  }

  if (
    userOwnsOrder({
      currentUserId:
        input.currentUserId,
      currentUserEmail:
        input.currentUserEmail,
      buyerUserId:
        input.buyerUserId,
      orderEmail:
        input.orderEmail,
    })
  ) {
    return;
  }

  throw new AuthorizationError(
    "Anda tidak memiliki akses ke pesanan ini.",
    403,
  );
}

export function assertOrderClaimAccess(
  input: OrderAuthorizationInput,
): void {
  if (
    input.eventPermissionGranted
  ) {
    return;
  }

  if (
    userOwnsOrder({
      currentUserId:
        input.currentUserId,
      currentUserEmail:
        input.currentUserEmail,
      buyerUserId:
        input.buyerUserId,
      orderEmail:
        input.orderEmail,
    })
  ) {
    return;
  }

  throw new AuthorizationError(
    "Anda tidak memiliki akses untuk mengambil racepack order ini.",
    403,
  );
}
