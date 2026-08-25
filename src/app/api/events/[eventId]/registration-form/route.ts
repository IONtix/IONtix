import { NextResponse } from "next/server";

import {
  authorizationErrorResponse,
  requireAuth,
} from "@/lib/auth/authorization";

import {
  getParticipantResponses,
  RegistrationError,
  saveParticipantResponses,
} from "@/lib/forms/response-service";

type RouteContext = {
  params: Promise<{
    eventId: string;
  }>;
};

function jsonError(
  error: unknown,
) {
  if (error instanceof RegistrationError) {
    let payload: unknown = {
      message: error.message,
    };

    try {
      payload = JSON.parse(
        error.message,
      );
    } catch {
      // pesan biasa
    }

    return NextResponse.json(
      {
        success: false,
        ...(typeof payload === "object" &&
        payload !== null
          ? payload
          : {
              message:
                error.message,
            }),
      },
      {
        status: error.status,
      },
    );
  }

  return authorizationErrorResponse(
    error,
  );
}

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireAuth();

    const { eventId } =
      await context.params;

    const participant =
      await prismaParticipant(
        user.id,
      );

    if (!participant) {
      throw new RegistrationError(
        "Profil peserta belum tersedia.",
        409,
      );
    }

    const result =
      await getParticipantResponses({
        participantId:
          participant.id,
        eventId,
      });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(
  request: Request,
  context: RouteContext,
) {
  try {
    const user = await requireAuth();

    const { eventId } =
      await context.params;

    const participant =
      await prismaParticipant(
        user.id,
      );

    if (!participant) {
      throw new RegistrationError(
        "Profil peserta belum tersedia.",
        409,
      );
    }

    const body =
      (await request.json()) as {
        answers?: Record<
          string,
          unknown
        >;
        submit?: boolean;
      };

    if (
      !body.answers ||
      typeof body.answers !== "object"
    ) {
      throw new RegistrationError(
        "Data jawaban formulir tidak valid.",
        400,
      );
    }

    const result =
      await saveParticipantResponses({
        participantId:
          participant.id,
        eventId,
        answers: body.answers,
        submit:
          body.submit === true,
      });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status:
          body.submit === true
            ? 200
            : 200,
      },
    );
  } catch (error) {
    return jsonError(error);
  }
}

async function prismaParticipant(
  userId: string,
) {
  const { default: prisma } = await import(
    "@/lib/prisma"
  );

  return prisma.participant.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });
}
