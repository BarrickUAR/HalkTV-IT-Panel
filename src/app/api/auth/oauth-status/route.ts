import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const googleEnabled = Boolean(
    process.env.AUTH_GOOGLE_ID &&
      process.env.AUTH_GOOGLE_SECRET &&
      process.env.AUTH_GOOGLE_ID.trim().length > 0 &&
      process.env.AUTH_GOOGLE_SECRET.trim().length > 0
  );
  const microsoftEnabled = Boolean(
    process.env.AUTH_MICROSOFT_ENTRA_ID_ID &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_ID.trim().length > 0 &&
      process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET.trim().length > 0
  );

  return NextResponse.json({
    google: googleEnabled,
    microsoft: false,
  });
}
