import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const pathname = nextUrl.pathname;

  // Kullanıcı giriş yapmış
  if (session?.user) {
    // Adı yoksa ve onboarding'de değilse → onboarding'e yönlendir
    if (!session.user.name && pathname !== "/onboarding") {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|apple-icon.png|icon.png|login|onboarding|halktv-logo.png|bg-chat.png|uploads).*)",
  ],
};
