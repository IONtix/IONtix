"use server";

import {
  createEventFromTemplate,
} from "@/lib/events/create-event-from-template";

export async function createEventFromTemplateAction(
  input: Parameters<
    typeof createEventFromTemplate
  >[0],
) {
  try {
    return await createEventFromTemplate(
      input,
    );
  } catch (error: unknown) {
    console.error(
      "createEventFromTemplateAction error:",
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Gagal membuat event dari template.",
    };
  }
}
