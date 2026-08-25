import type {
  JsonValue,
} from "@/lib/platform-types";

import type {
  PaymentMethod,
  PaymentStatus,
} from "@/generated/prisma/client";

export type PaymentProviderName =
  | "IONTIX_TEST"
  | "MIDTRANS"
  | (string & {});

export interface PaymentCustomer {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface PaymentItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CreatePaymentInput {
  orderId: string;
  externalId: string;
  amount: number;
  currency: string;
  method?: PaymentMethod | null;
  customer?: PaymentCustomer;
  items?: PaymentItem[];
  expiresAt?: Date | null;
  metadata?: JsonValue | null;
}

export interface PaymentSession {
  provider: PaymentProviderName;
  externalId: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  checkoutUrl?: string | null;
  token?: string | null;
  expiresAt?: Date | null;
  providerTransactionId?: string | null;
  providerResponse?: JsonValue | null;
  metadata?: JsonValue | null;
}

export interface PaymentStatusResult {
  provider: PaymentProviderName;
  externalId: string;
  status: PaymentStatus;
  providerTransactionId?: string | null;
  paidAt?: Date | null;
  expiresAt?: Date | null;
  providerResponse?: JsonValue | null;
}

export interface PaymentNotification {
  provider: PaymentProviderName;
  externalId: string;
  status: PaymentStatus;
  providerTransactionId?: string | null;
  amount?: number | null;
  currency?: string | null;
  paidAt?: Date | null;
  expiresAt?: Date | null;
  rawPayload?: JsonValue | null;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;

  createPayment(
    input: CreatePaymentInput,
  ): Promise<PaymentSession>;

  getPaymentStatus(
    externalId: string,
  ): Promise<PaymentStatusResult>;

  verifyNotification(
    payload: unknown,
    headers?: Headers,
  ): Promise<PaymentNotification>;
}
