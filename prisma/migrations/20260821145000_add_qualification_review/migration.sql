-- CreateEnum
CREATE TYPE "QualificationReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "QualificationReview" (
    "id" TEXT NOT NULL,
    "participantResponseId" TEXT NOT NULL,
    "participantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventFormId" TEXT NOT NULL,
    "eventFormFieldId" TEXT NOT NULL,
    "status" "QualificationReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QualificationReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "QualificationReview_participantResponseId_key" ON "QualificationReview"("participantResponseId");

-- CreateIndex
CREATE INDEX "QualificationReview_eventId_status_idx" ON "QualificationReview"("eventId", "status");

-- CreateIndex
CREATE INDEX "QualificationReview_participantId_eventId_idx" ON "QualificationReview"("participantId", "eventId");

-- CreateIndex
CREATE INDEX "QualificationReview_eventFormId_eventFormFieldId_idx" ON "QualificationReview"("eventFormId", "eventFormFieldId");

-- CreateIndex
CREATE INDEX "QualificationReview_reviewedByUserId_idx" ON "QualificationReview"("reviewedByUserId");
