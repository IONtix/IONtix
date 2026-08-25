/**
 * Canonical payment webhook boundary.
 *
 * Provider-specific verification harus dilakukan
 * oleh PaymentProvider.verifyNotification().
 *
 * Setelah notification dinormalisasi:
 *
 * Provider
 *   -> PaymentNotification
 *   -> confirmPayment()
 *   -> Payment / Order / Transaction / Ticket
 *
 * Jangan mengubah state database langsung dari provider.
 */
export const PAYMENT_WEBHOOK_PATH =
  "/api/payments/webhook/[provider]";
