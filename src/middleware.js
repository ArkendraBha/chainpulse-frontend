import { NextResponse } from "next/server";

export function middleware(request) {
  // Admin route protection
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const token = request.cookies.get("cptoken")?.value ||
      request.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) {
      return NextResponse.redirect(new URL("/app?admin_redirect=true", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
