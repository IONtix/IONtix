-- CreateTable
CREATE TABLE "PaymentRetryLock" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRetryLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRetryLock_orderId_key" ON "PaymentRetryLock"("orderId");

-- CreateIndex
CREATE INDEX "PaymentRetryLock_expiresAt_idx" ON "PaymentRetryLock"("expiresAt");

-- AddForeignKey
ALTER TABLE "PaymentRetryLock" ADD CONSTRAINT "PaymentRetryLock_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
