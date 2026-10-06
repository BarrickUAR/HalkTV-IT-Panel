import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  const response = NextResponse.json({ ok: true });

  const allCookies = cookieStore.getAll();
  for (const c of allCookies) {
    if (c.name.includes("authjs") || c.name.includes("next-auth")) {
      response.cookies.delete(c.name);
      response.cookies.set(c.name, "", {
        path: "/",
        expires: new Date(0),
        maxAge: 0,
      });
    }
  }

  // Set explicit kiosk_logged_out cookie so /api/kiosk-session doesn't auto-login by hostname/osUsername
  response.cookies.set("kiosk_logged_out", "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    httpOnly: false,
    sameSite: "lax",
  });

  return response;
}
