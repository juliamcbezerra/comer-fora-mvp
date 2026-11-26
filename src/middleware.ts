import { NextResponse, type NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "cfi_session_id";
export const SESSION_HEADER_NAME = "x-cfi-session-id";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function middleware(request: NextRequest) {
  const existingCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (existingCookie && UUID_REGEX.test(existingCookie)) {
    return NextResponse.next();
  }

  const newSessionId = crypto.randomUUID();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(SESSION_HEADER_NAME, newSessionId);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.set(SESSION_COOKIE_NAME, newSessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
