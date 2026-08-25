import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

import {
  evaluateRules,
} from "./response-rules";

import {
  validateResponses,
} from "./response-validation";

export class RegistrationError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "RegistrationError";
  }
}

export async function getEventRegistrationForm(
  eventId: string,
) {
  const eventForm =
    await prisma.eventForm.findUnique({
      where: {
        eventId,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            status: true,
            organizationId: true,
          },
        },

        fields: {
          orderBy: {
            order: "asc",
          },
        },

        version: {
          include: {
            rules: {
              orderBy: {
                priority: "asc",
              },
            },
          },
        },
      },
    });

  if (!eventForm) {
    throw new RegistrationError(
      "Formulir pendaftaran untuk acara ini belum tersedia.",
      404,
    );
  }

  if (eventForm.status !== "PUBLISHED") {
    throw new RegistrationError(
      "Formulir pendaftaran belum diterbitkan.",
      409,
    );
  }

  return eventForm;
}

export async function saveParticipantResponses({
  participantId,
  eventId,
  answers,
  submit = false,
}: {
  participantId: string;
  eventId: string;
  answers: Record<string, unknown>;
  submit?: boolean;
}) {
  const eventForm =
    await getEventRegistrationForm(
      eventId,
    );

  const participantEvent =
    await prisma.participantEvent.findUnique({
      where: {
        participantId_eventId: {
          participantId,
          eventId,
        },
      },
      select: {
        id: true,
        approvalStatus: true,
      },
    });

  if (!participantEvent) {
    throw new RegistrationError(
      "Peserta belum terdaftar pada acara ini.",
      403,
    );
  }

  if (
    participantEvent.approvalStatus === "REJECTED"
  ) {
    throw new RegistrationError(
      "Pendaftaran peserta pada acara ini telah ditolak.",
      403,
    );
  }

  const answerFieldMap =
    new Map<string, {
      id: string;
      key: string;
      label: string;
      fieldType: string;
      validation: Prisma.JsonValue | null;
      isRequired: boolean;
      isVisible: boolean;
      sourceFieldId: string | null;
    }>();

  for (const field of eventForm.fields) {
    answerFieldMap.set(field.key, {
      id: field.id,
      key: field.key,
      label: field.label,
      fieldType: field.fieldType,
      validation: field.validation,
      isRequired: field.isRequired,
      isVisible: field.isVisible,
      sourceFieldId:
        field.sourceFieldId ?? null,
    });
  }

  const fields =
    Array.from(answerFieldMap.values());

  const rules =
    eventForm.version?.rules ?? [];

  const answersByFieldId =
    Object.fromEntries(
      fields.map((field) => [
        field.id,
        answers[field.key],
      ]),
    );

  const ruleStates =
    evaluateRules(
      fields.map((field) => field.id),
      rules,
      answersByFieldId,
    );

  const effectiveFields =
    fields.map((field) => {
      const state =
        ruleStates.get(field.id);

      return {
        ...field,
        isVisible:
          field.isVisible &&
          (state?.visible ?? true),
        isRequired:
          field.isRequired ||
          (state?.required ?? false),
      };
    });

  const validation =
    validateResponses(
      effectiveFields,
      answers,
    );

  if (!validation.valid) {
    throw new RegistrationError(
      JSON.stringify({
        message:
          "Periksa kembali data formulir.",
        fields:
          validation.errors,
      }),
      422,
    );
  }

  await prisma.$transaction(
    async (tx) => {
      for (const item of validation.values) {
        const existing =
          await tx.participantResponse.findFirst({
            where: {
              participantId,
              eventFormId:
                eventForm.id,
              eventFormFieldId:
                item.eventFormFieldId,
            },
            select: {
              id: true,
            },
          });

        if (existing) {
          await tx.participantResponse.update({
            where: {
              id: existing.id,
            },
            data: {
              value: item.value,
              formFieldId:
                item.fieldId || undefined,
            },
          });
        } else {
          await tx.participantResponse.create({
            data: {
              participantId,
              eventFormId:
                eventForm.id,
              eventFormFieldId:
                item.eventFormFieldId,
              formFieldId:
                item.fieldId || undefined,
              value: item.value,
            },
          });
        }
      }

      if (submit) {
        await tx.participantEvent.update({
          where: {
            id: participantEvent.id,
          },
          data: {
            approvalStatus:
              participantEvent.approvalStatus ===
              "APPROVED"
                ? "APPROVED"
                : "PENDING",
          },
        });
      }
    },
  );

  return {
    eventFormId: eventForm.id,
    participantEventId:
      participantEvent.id,
    submitted: submit,
  };
}

export async function getParticipantResponses({
  participantId,
  eventId,
}: {
  participantId: string;
  eventId: string;
}) {
  const eventForm =
    await getEventRegistrationForm(
      eventId,
    );

  const enrollment =
    await prisma.participantEvent.findUnique({
      where: {
        participantId_eventId: {
          participantId,
          eventId,
        },
      },
      select: {
        id: true,
        approvalStatus: true,
      },
    });

  if (!enrollment) {
    throw new RegistrationError(
      "Peserta belum terdaftar pada acara ini.",
      403,
    );
  }

  const responses =
    await prisma.participantResponse.findMany({
      where: {
        participantId,
        eventFormId:
          eventForm.id,
      },
      orderBy: {
        updatedAt: "asc",
      },
    });

  return {
    eventForm,
    enrollment,
    responses,
  };
}
