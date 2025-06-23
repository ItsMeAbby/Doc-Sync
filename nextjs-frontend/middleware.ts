import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// No authentication is required, so we just allow access to dashboard
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};