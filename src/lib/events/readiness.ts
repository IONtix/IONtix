import prisma from "@/lib/prisma";

export type ReadinessSeverity =
  | "ERROR"
  | "WARNING";

export type EventReadinessItem = {
  key: string;
  label: string;
  passed: boolean;
  severity?: ReadinessSeverity;
  message?: string;
};

export type EventReadinessResult = {
  ready: boolean;
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
  checks: EventReadinessItem[];
};

export async function evaluateEventReadiness(
  eventId: string,
): Promise<EventReadinessResult> {
  const event =
    await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        endDate: true,
        location: true,
        contactName: true,
        contactPhone: true,
        sportId: true,
        organizationId: true,
        status: true,
        eventForm: {
          select: {
            id: true,
            name: true,
            status: true,
            formVersionId: true,
            fields: {
              select: {
                id: true,
                isVisible: true,
              },
            },
            version: {
              select: {
                id: true,
                version: true,
                status: true,
                fields: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        categories: {
          select: {
            id: true,
            name: true,
            price: true,
            capacity: true,
            isActive: true,
          },
        },
      },
    });

  if (!event) {
    throw new Error(
      "Event tidak ditemukan.",
    );
  }

  const checks: EventReadinessItem[] = [];

  const push = (
    item: EventReadinessItem,
  ) => {
    checks.push(item);
  };

  push({
    key: "title",
    label: "Nama event",
    passed: Boolean(
      event.title.trim(),
    ),
    severity: "ERROR",
    message: event.title.trim()
      ? undefined
      : "Nama event wajib diisi.",
  });

  push({
    key: "description",
    label: "Deskripsi event",
    passed: Boolean(
      event.description.trim(),
    ),
    severity: "ERROR",
    message: event.description.trim()
      ? undefined
      : "Deskripsi event wajib diisi.",
  });

  push({
    key: "date",
    label: "Tanggal event",
    passed:
      Number.isFinite(
        event.date.getTime(),
      ),
    severity: "ERROR",
    message:
      Number.isFinite(
        event.date.getTime(),
      )
        ? undefined
        : "Tanggal event tidak valid.",
  });

  push({
    key: "endDate",
    label: "Rentang tanggal",
    passed:
      !event.endDate ||
      event.endDate >= event.date,
    severity: "ERROR",
    message:
      event.endDate &&
      event.endDate < event.date
        ? "Tanggal selesai lebih awal dari tanggal mulai."
        : undefined,
  });

  push({
    key: "location",
    label: "Lokasi",
    passed: Boolean(
      event.location?.trim(),
    ),
    severity: "ERROR",
    message: event.location?.trim()
      ? undefined
      : "Lokasi event wajib diisi.",
  });

  push({
    key: "contact",
    label: "Kontak event",
    passed:
      Boolean(
        event.contactName?.trim(),
      ) &&
      Boolean(
        event.contactPhone?.trim(),
      ),
    severity: "ERROR",
    message:
      event.contactName?.trim() &&
      event.contactPhone?.trim()
        ? undefined
        : "Nama dan nomor kontak event wajib tersedia.",
  });

  push({
    key: "organization",
    label: "Organisasi",
    passed: Boolean(
      event.organizationId,
    ),
    severity: "ERROR",
    message: event.organizationId
      ? undefined
      : "Event belum memiliki organisasi.",
  });

  push({
    key: "sport",
    label: "Cabang olahraga",
    passed: Boolean(
      event.sportId,
    ),
    severity: "ERROR",
    message: event.sportId
      ? undefined
      : "Cabang olahraga belum ditentukan.",
  });

  push({
    key: "form",
    label: "Formulir pendaftaran",
    passed: Boolean(
      event.eventForm,
    ),
    severity: "ERROR",
    message: event.eventForm
      ? undefined
      : "Formulir pendaftaran belum terpasang.",
  });

  const formPublished =
    event.eventForm?.status ===
      "PUBLISHED" &&
    event.eventForm.formVersionId !==
      null &&
    event.eventForm.version?.status ===
      "PUBLISHED";

  push({
    key: "form_version",
    label: "Versi formulir diterbitkan",
    passed: formPublished,
    severity: "ERROR",
    message: formPublished
      ? undefined
      : "Formulir harus memiliki versi PUBLISHED.",
  });

  const activeCategories =
    event.categories.filter(
      (category) =>
        category.isActive,
    );

  push({
    key: "ticket_categories",
    label: "Kategori tiket",
    passed:
      activeCategories.length > 0,
    severity: "ERROR",
    message:
      activeCategories.length > 0
        ? undefined
        : "Minimal satu kategori tiket aktif diperlukan.",
  });

  const invalidCategory =
    activeCategories.find(
      (category) =>
        !Number.isFinite(
          category.price,
        ) ||
        category.price < 0 ||
        !Number.isInteger(
          category.capacity,
        ) ||
        category.capacity <= 0,
    );

  push({
    key: "ticket_values",
    label: "Harga dan kuota tiket",
    passed: !invalidCategory,
    severity: "ERROR",
    message: invalidCategory
      ? `Kategori "${invalidCategory.name}" memiliki harga atau kuota tidak valid.`
      : undefined,
  });

  return {
    ready: checks.every(
      (check) =>
        check.passed ||
        check.severity !== "ERROR",
    ),
    summary: {
      passed: checks.filter(
        (check) =>
          check.passed,
      ).length,
      failed: checks.filter(
        (check) =>
          !check.passed &&
          check.severity === "ERROR",
      ).length,
      warnings: checks.filter(
        (check) =>
          !check.passed &&
          check.severity === "WARNING",
      ).length,
      total: checks.length,
    },
    checks,
  };
}
