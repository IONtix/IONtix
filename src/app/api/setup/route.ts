import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      error: "Endpoint setup publik dinonaktifkan.",
    },
    { status: 404 },
  );
}
