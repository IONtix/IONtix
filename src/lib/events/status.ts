export const EVENT_STATUS_VALUES = [
  "DRAFT",
  "PENDING_REVIEW",
  "PUBLISHED",
  "SUSPENDED",
  "SOLD_OUT",
  "COMPLETED",
  "CANCELLED",
  "ARCHIVED",
] as const;

export type EventStatusValue =
  (typeof EVENT_STATUS_VALUES)[number];

export type EventStatusMeta = {
  label: string;
  description: string;
  tone:
    | "neutral"
    | "warning"
    | "success"
    | "danger"
    | "info";
};

const STATUS_META: Record<EventStatusValue, EventStatusMeta> = {
  DRAFT: {
    label: "Draft",
    description: "Event belum dikirim untuk review.",
    tone: "neutral",
  },
  PENDING_REVIEW: {
    label: "Menunggu Review",
    description: "Event sedang menunggu persetujuan Super Admin.",
    tone: "warning",
  },
  PUBLISHED: {
    label: "Dipublikasikan",
    description: "Event aktif dan tersedia untuk publik.",
    tone: "success",
  },
  SUSPENDED: {
    label: "Ditangguhkan",
    description: "Event sementara tidak aktif.",
    tone: "danger",
  },
  SOLD_OUT: {
    label: "Sold Out",
    description: "Seluruh kuota tiket telah habis.",
    tone: "info",
  },
  COMPLETED: {
    label: "Selesai",
    description: "Event telah selesai dilaksanakan.",
    tone: "info",
  },
  CANCELLED: {
    label: "Dibatalkan",
    description: "Event telah dibatalkan.",
    tone: "danger",
  },
  ARCHIVED: {
    label: "Diarsipkan",
    description: "Event telah diarsipkan.",
    tone: "neutral",
  },
};

export function getEventStatusMeta(
  status: string | null | undefined,
): EventStatusMeta {
  const normalizedStatus = status?.trim().toUpperCase();

  if (
    normalizedStatus &&
    normalizedStatus in STATUS_META
  ) {
    return STATUS_META[normalizedStatus as EventStatusValue];
  }

  return STATUS_META.DRAFT;
}

export function isPublishedEvent(
  status: string | null | undefined,
): boolean {
  return status === "PUBLISHED";
}
