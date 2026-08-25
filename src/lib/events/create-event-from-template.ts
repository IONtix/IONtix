import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import {
  requireAuth,
} from "@/lib/auth/authorization";
import {
  requireResolvedOrganizationPermission,
} from "@/lib/auth/organization";

type CreateEventFromTemplateInput = {
  title: string;
  sportId: string;
  formTemplateId: string;
  organizationId: string;

  description?: string;
  date: string | Date;
  endDate?: string | Date | null;

  location?: string;
  mapsUrl?: string | null;
  imageUrl?: string | null;
  logoUrl?: string | null;

  rules?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;

  category?: string | null;
  customFields?: unknown;

  submissionMode?: "DRAFT" | "SUBMIT_REVIEW";
};

function parseDate(
  value: string | Date | null | undefined,
) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? new Date(value.getTime())
      : new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function toJsonValue(
  value: unknown,
): Prisma.InputJsonValue | undefined {
  if (
    value === undefined ||
    value === null
  ) {
    return undefined;
  }

  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

function toNullableJsonInput(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

export async function createEventFromTemplate(
  input: CreateEventFromTemplateInput,
) {
  const user = await requireAuth();

  const membership =
    await requireResolvedOrganizationPermission(
      input.organizationId,
      "events.manage",
    );

  const title =
    input.title?.trim() || "";

  if (!title) {
    throw new Error(
      "Nama event wajib diisi.",
    );
  }

  const eventDate =
    parseDate(input.date);

  if (!eventDate) {
    throw new Error(
      "Tanggal event tidak valid.",
    );
  }

  const endDate =
    input.endDate === null
      ? null
      : input.endDate
        ? parseDate(input.endDate)
        : null;

  if (
    input.endDate &&
    !endDate
  ) {
    throw new Error(
      "Tanggal selesai event tidak valid.",
    );
  }

  if (
    endDate &&
    endDate < eventDate
  ) {
    throw new Error(
      "Tanggal selesai tidak boleh lebih awal daripada tanggal mulai.",
    );
  }

  const template =
    await prisma.formTemplate.findFirst({
      where: {
        id: input.formTemplateId,
        sportId: input.sportId,
        isActive: true,
      },
      select: {
        id: true,
        sportId: true,
        name: true,
        slug: true,
        allowEOEdit: true,

        sport: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },

        versions: {
          where: {
            status: "PUBLISHED",
          },
          orderBy: {
            version: "desc",
          },
          take: 1,
          select: {
            id: true,
            version: true,
            status: true,
            fields: {
              where: {
                isVisible: true,
              },
              orderBy: {
                order: "asc",
              },
              select: {
                id: true,
                key: true,
                label: true,
                description: true,
                fieldType: true,
                placeholder: true,
                defaultValue: true,
                validation: true,
                order: true,
                isRequired: true,
                isSystem: true,
                isEditableByEO: true,
                isVisible: true,
              },
            },
          },
        },
      },
    });

  if (!template) {
    throw new Error(
      "Template tidak ditemukan atau tidak sesuai dengan sport yang dipilih.",
    );
  }

  const publishedVersion =
    template.versions[0];

  if (!publishedVersion) {
    throw new Error(
      "Template belum memiliki versi yang dipublikasikan.",
    );
  }

  const isSuperAdmin =
    user.role === "SUPER_ADMIN";

  const status =
    isSuperAdmin
      ? "PUBLISHED"
      : input.submissionMode ===
          "SUBMIT_REVIEW"
        ? "PENDING_REVIEW"
        : "DRAFT";

  const isPublished =
    status === "PUBLISHED";

  const event =
    await prisma.$transaction(
      async (tx) => {
        const createdEvent =
          await tx.event.create({
            data: {
              title,
              sportId: template.sportId,

              category:
                input.category?.trim() ||
                null,

              description:
                input.description?.trim() ||
                "",

              date: eventDate,
              endDate,

              location:
                input.location?.trim() ||
                "Online/Offline",

              mapsUrl:
                input.mapsUrl?.trim() ||
                null,

              imageUrl:
                input.imageUrl?.trim() ||
                null,

              logoUrl:
                input.logoUrl?.trim() ||
                null,

              rules:
                input.rules?.trim() ||
                null,

              contactName:
                input.contactName?.trim() ||
                null,

              contactPhone:
                input.contactPhone?.trim() ||
                null,

              customFields:
                toJsonValue(
                  input.customFields,
                ),

              organizationId:
                membership.organizationId,

              eoId: user.id,

              status,
              isPublished,

              publishedAt:
                isPublished
                  ? new Date()
                  : null,
            },
            select: {
              id: true,
              title: true,
              sportId: true,
              organizationId: true,
              eoId: true,
              status: true,
              isPublished: true,
            },
          });

        await tx.eventForm.create({
          data: {
            eventId:
              createdEvent.id,

            formTemplateId:
              template.id,

            formVersionId:
              publishedVersion.id,

            name:
              template.name,

            status:
              "DRAFT",

            allowParticipantEdit:
              true,

            fields: {
              create:
                publishedVersion.fields.map(
                  (field) => ({
                    sourceFieldId:
                      field.id,

                    key: field.key,
                    label: field.label,

                    fieldType:
                      field.fieldType,

                    description:
                      field.description,

                    placeholder:
                      field.placeholder,

                    defaultValue:
                      toNullableJsonInput(
                        field.defaultValue,
                      ),

                    validation:
                      toNullableJsonInput(
                        field.validation,
                      ),

                    order:
                      field.order,

                    isRequired:
                      field.isRequired,

                    isVisible:
                      field.isVisible,

                    isEditableByEO:
                      field.isEditableByEO,

                    isCustom:
                      false,
                  }),
                ),
            },
          },
        });

        return createdEvent;
      },
    );

  return {
    success: true,
    data: {
      event,
      sport: template.sport,
      template: {
        id: template.id,
        name: template.name,
        slug: template.slug,
      },
      version: {
        id: publishedVersion.id,
        version:
          publishedVersion.version,
      },
    },
  };
}
