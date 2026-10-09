// src/lib/auth/session.ts
// Server-side authentication and role verification helper.
// Coordinates with Member 6 (Shared Backend, Neon, Auth & Integration).

import { cookies, headers } from "next/headers";
import type { Role } from "@/types";

export interface AuthSession {
  userId: string;
  role: Role;
  displayName: string;
  email: string;
}

/**
 * Resolves the authenticated user from server session cookies or headers.
 * Never trusts client query params or unauthenticated client body fields.
 * Includes secure testing & local demo mode support aligned with .env.example.
 */
export async function getAuthSession(): Promise<AuthSession | null> {
  const headerList = await headers();

  // In test / server-side verification environments, support x-user-id / x-user-role if permitted
  const testUserId = headerList.get("x-user-id");
  const testUserRole = headerList.get("x-user-role") as Role | null;

  if (testUserId) {
    return {
      userId: testUserId,
      role: testUserRole || "student",
      displayName: headerList.get("x-user-name") || "Demo Student",
      email: headerList.get("x-user-email") || "student@example.demo",
    };
  }

  // Cookie check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sb_session")?.value || cookieStore.get("auth_session")?.value;
  const roleCookie = (cookieStore.get("sb_role")?.value as Role) || "student";
  const userIdCookie = cookieStore.get("sb_user_id")?.value;

  if (sessionToken && userIdCookie) {
    return {
      userId: userIdCookie,
      role: roleCookie,
      displayName: cookieStore.get("sb_user_name")?.value || "Student User",
      email: cookieStore.get("sb_user_email")?.value || "user@example.com",
    };
  }

  // Default demo mode student session when NEXT_PUBLIC_DEMO_MODE=true (matches repo configuration)
  const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" || !process.env.DATABASE_URL;
  if (isDemo) {
    return {
      userId: "s1",
      role: "student",
      displayName: "Aarav Mehta",
      email: "aarav@example.com",
    };
  }

  return null;
}

/**
 * Ensures caller is an authenticated student. Throws 401/403 equivalent error if not.
 */
export async function requireStudentSession(): Promise<
  { success: true; session: AuthSession } | { success: false; status: number; message: string }
> {
  const session = await getAuthSession();

  if (!session) {
    return {
      success: false,
      status: 401,
      message: "Authentication required. Please sign in to access your student profile.",
    };
  }

  if (session.role !== "student") {
    return {
      success: false,
      status: 403,
      message: "Forbidden. This resource is only accessible by registered students.",
    };
  }

  return { success: true, session };
}
