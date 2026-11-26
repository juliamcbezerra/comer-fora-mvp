import { cookies, headers } from "next/headers";
import type { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_HEADER_NAME } from "@/middleware";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_REGEX.test(value));
}

export async function getSessionId(): Promise<string | null> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (isValidUuid(fromCookie)) {
    return fromCookie;
  }

  const headerStore = await headers();
  const fromHeader = headerStore.get(SESSION_HEADER_NAME);
  if (isValidUuid(fromHeader)) {
    return fromHeader;
  }

  return null;
}

export async function getOrCreateSessionId(): Promise<{
  sessionId: string;
  shouldSetCookie: boolean;
}> {
  const existing = await getSessionId();
  if (existing) {
    return { sessionId: existing, shouldSetCookie: false };
  }
  return { sessionId: crypto.randomUUID(), shouldSetCookie: true };
}

export function attachSessionCookie(
  response: NextResponse,
  sessionId: string
): NextResponse {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export function canAccessRestaurant(
  restaurant: { is_demo_seed: boolean; session_id: string | null },
  sessionId: string | null
): boolean {
  if (restaurant.is_demo_seed) return true;
  if (!sessionId) return false;
  return restaurant.session_id === sessionId;
}

export function canAccessScopedRecord(
  record: { session_id: string | null },
  sessionId: string | null
): boolean {
  if (record.session_id === null) return true;
  if (!sessionId) return false;
  return record.session_id === sessionId;
}
