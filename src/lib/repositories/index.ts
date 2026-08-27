import { cookies } from "next/headers";
import { getAppMode, SESSION_COOKIE } from "../config";
import { getDemoRepository } from "./demo-repository";
import { SupabaseRepository } from "./supabase-repository";
import type { FieldReportRepository } from "./types";

export function getRepository(): FieldReportRepository {
  return getAppMode() === "live" ? new SupabaseRepository() : getDemoRepository();
}

export async function getSessionToken() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value ?? null;
}

export async function requireSession() {
  const token = await getSessionToken();
  if (!token) return null;
  const repo = getRepository();
  const session = await repo.validateSession(token);
  if (!session) return null;
  return { ...session, token, repo };
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
