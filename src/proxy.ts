import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const DEMO_MODE = process.env.DEMO_MODE === "true";
const PUBLIC_PATHS = ["/login", "/api/auth"];
const DEMO_COOKIE = "halktv_demo_role";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public rotalar — her zaman geçir
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Demo modda: cookie var mı kontrol et
  if (DEMO_MODE) {
    const demoCookie = request.cookies.get(DEMO_COOKIE);
    if (!demoCookie) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // Gerçek mod: NextAuth kendi oturumunu yönetiyor
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|halktv-logo.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
