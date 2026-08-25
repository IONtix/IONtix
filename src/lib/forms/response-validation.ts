import type { Prisma } from "@/generated/prisma/client";

type FormFieldLike = {
  id: string;
  key: string;
  label: string;
  fieldType: string;
  validation: Prisma.JsonValue | null;
  isRequired: boolean;
  isVisible: boolean;
};

type AnswerMap = Record<string, unknown>;

function isEmpty(value: unknown) {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  return false;
}

function parseValidation(
  validation: Prisma.JsonValue | null,
): Record<string, unknown> {
  if (
    validation &&
    typeof validation === "object" &&
    !Array.isArray(validation)
  ) {
    return validation as Record<string, unknown>;
  }

  return {};
}

function validateUrl(
  value: unknown,
): string | null {
  if (typeof value !== "string" || !value.trim()) {
    return "Tautan tidak valid.";
  }

  try {
    const url = new URL(value.trim());

    if (!["http:", "https:"].includes(url.protocol)) {
      return "Tautan harus menggunakan HTTP atau HTTPS.";
    }
  } catch {
    return "Format tautan tidak valid.";
  }

  return null;
}

function validateNumber(
  value: unknown,
): string | null {
  const numberValue =
    typeof value === "number"
      ? value
      : Number(value);

  if (!Number.isFinite(numberValue)) {
    return "Nilai harus berupa angka.";
  }

  return null;
}

export type ValidatedResponse = {
  fieldId: string | null;
  eventFormFieldId: string;
  value: Prisma.InputJsonValue;
};

export function validateResponses(
  fields: FormFieldLike[],
  answers: AnswerMap,
): {
  valid: boolean;
  errors: Record<string, string>;
  values: ValidatedResponse[];
} {
  const errors: Record<string, string> = {};
  const values: ValidatedResponse[] = [];

  for (const field of fields) {
    const value = answers[field.key];

    if (!field.isVisible) {
      continue;
    }

    if (field.isRequired && isEmpty(value)) {
      errors[field.key] =
        `${field.label} wajib diisi.`;
      continue;
    }

    if (isEmpty(value)) {
      continue;
    }

    const validation =
      parseValidation(field.validation);

    const min = validation.min;
    const max = validation.max;

    if (
      field.fieldType === "URL" ||
      field.fieldType === "QUALIFICATION_URL"
    ) {
      const error = validateUrl(value);

      if (error) {
        errors[field.key] = error;
        continue;
      }
    }

    if (
      field.fieldType === "NUMBER" ||
      field.fieldType === "WEIGHT" ||
      field.fieldType === "HEIGHT"
    ) {
      const error = validateNumber(value);

      if (error) {
        errors[field.key] = error;
        continue;
      }

      const numericValue = Number(value);

      if (
        typeof min === "number" &&
        numericValue < min
      ) {
        errors[field.key] =
          `${field.label} minimal ${min}.`;
        continue;
      }

      if (
        typeof max === "number" &&
        numericValue > max
      ) {
        errors[field.key] =
          `${field.label} maksimal ${max}.`;
        continue;
      }
    }

    if (
      typeof value === "string" &&
      typeof min === "number" &&
      value.length < min
    ) {
      errors[field.key] =
        `${field.label} minimal ${min} karakter.`;
      continue;
    }

    if (
      typeof value === "string" &&
      typeof max === "number" &&
      value.length > max
    ) {
      errors[field.key] =
        `${field.label} maksimal ${max} karakter.`;
      continue;
    }

    values.push({
      fieldId: null,
      eventFormFieldId: field.id,
      value:
        typeof value === "object" &&
        value !== null
          ? (value as Prisma.InputJsonValue)
          : (value as Prisma.InputJsonValue),
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    values,
  };
}
