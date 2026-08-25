import type { Prisma } from "@/generated/prisma/client";

type AuditLogInput = {
  actorUserId?: string | null;
  action: string;
  module?: string;
  entityType?: string;
  entityId?: string;
  beforeData?: Prisma.InputJsonValue | null;
  afterData?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function writeAuditLog(
  tx: Prisma.TransactionClient,
  input: AuditLogInput,
) {
  return tx.auditLog.create({
    data: {
      actorUserId:
        input.actorUserId ?? null,
      action: input.action,
      module: input.module ?? null,
      entityType:
        input.entityType ?? null,
      entityId:
        input.entityId ?? null,
      beforeData:
        input.beforeData ?? undefined,
      afterData:
        input.afterData ?? undefined,
      metadata:
        input.metadata ?? undefined,
      ipAddress:
        input.ipAddress ?? null,
      userAgent:
        input.userAgent ?? null,
    },
  });
}
