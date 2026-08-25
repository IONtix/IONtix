import type {
  CreatePaymentInput,
  PaymentNotification,
  PaymentProvider,
  PaymentProviderName,
  PaymentSession,
  PaymentStatusResult,
} from "./types";

export class PaymentProviderError extends Error {
  readonly provider: PaymentProviderName;
  readonly cause?: unknown;

  constructor(
    message: string,
    provider: PaymentProviderName,
    cause?: unknown,
  ) {
    super(message);
    this.name = "PaymentProviderError";
    this.provider = provider;
    this.cause = cause;
  }
}

export class PaymentService {
  private readonly providers = new Map<
    PaymentProviderName,
    PaymentProvider
  >();

  registerProvider(
    provider: PaymentProvider,
  ): void {
    this.providers.set(
      provider.name,
      provider,
    );
  }

  getProvider(
    providerName: PaymentProviderName,
  ): PaymentProvider {
    const provider =
      this.providers.get(providerName);

    if (!provider) {
      throw new PaymentProviderError(
        `Payment provider "${providerName}" belum terdaftar.`,
        providerName,
      );
    }

    return provider;
  }

  async createPayment(
    providerName: PaymentProviderName,
    input: CreatePaymentInput,
  ): Promise<PaymentSession> {
    const provider =
      this.getProvider(providerName);

    try {
      return await provider.createPayment(
        input,
      );
    } catch (error: unknown) {
      if (
        error instanceof
        PaymentProviderError
      ) {
        throw error;
      }

      throw new PaymentProviderError(
        "Gagal membuat payment session.",
        providerName,
        error,
      );
    }
  }

  async getPaymentStatus(
    providerName: PaymentProviderName,
    externalId: string,
  ): Promise<PaymentStatusResult> {
    const provider =
      this.getProvider(providerName);

    try {
      return await provider.getPaymentStatus(
        externalId,
      );
    } catch (error: unknown) {
      if (
        error instanceof
        PaymentProviderError
      ) {
        throw error;
      }

      throw new PaymentProviderError(
        "Gagal mengambil status pembayaran.",
        providerName,
        error,
      );
    }
  }

  async verifyNotification(
    providerName: PaymentProviderName,
    payload: unknown,
    headers?: Headers,
  ): Promise<PaymentNotification> {
    const provider =
      this.getProvider(providerName);

    try {
      return await provider.verifyNotification(
        payload,
        headers,
      );
    } catch (error: unknown) {
      if (
        error instanceof
        PaymentProviderError
      ) {
        throw error;
      }

      throw new PaymentProviderError(
        error instanceof Error
          ? error.message
          : "Gagal memverifikasi notifikasi pembayaran.",
        providerName,
        error,
      );
    }
  }
}

export const paymentService =
  new PaymentService();
