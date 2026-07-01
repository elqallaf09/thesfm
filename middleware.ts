import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  response.headers.set(
    "Permissions-Policy",
    "microphone=(self), camera=(self)"
  );

  return response;
}

export const config = {
  matcher: "/wakeel/:path*",
};
