import { randomBytes } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import { getAppMode, getAppUrl } from "../config";
import { DEMO_EMAIL } from "../demo-data";
import { createSupabaseAdmin, createSupabaseServerClient } from "../supabase/server";

const ROOT = path.join(process.cwd(), ".fieldreport");
const AUTH_PATH = path.join(ROOT, "auth.json");
const RESET_PATH = path.join(ROOT, "resets.json");

interface DemoAuthFile {
  passwords: Record<string, string>;
}

interface ResetFile {
  tokens: Record<string, { email: string; userId: string; expiresAt: number }>;
}

async function readAuth(): Promise<DemoAuthFile> {
  try {
    return JSON.parse(await readFile(AUTH_PATH, "utf8")) as DemoAuthFile;
  } catch {
    return { passwords: {} };
  }
}

async function writeAuth(file: DemoAuthFile) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(AUTH_PATH, JSON.stringify(file, null, 2), "utf8");
}

async function readResets(): Promise<ResetFile> {
  try {
    return JSON.parse(await readFile(RESET_PATH, "utf8")) as ResetFile;
  } catch {
    return { tokens: {} };
  }
}

async function writeResets(file: ResetFile) {
  await mkdir(ROOT, { recursive: true });
  await writeFile(RESET_PATH, JSON.stringify(file, null, 2), "utf8");
}

async function findDemoUserId(email: string): Promise<string | null> {
  const storePath = path.join(ROOT, "store.json");
  try {
    const raw = JSON.parse(await readFile(storePath, "utf8")) as {
      state?: { profiles?: Array<{ id: string; email: string }> };
    };
    const profile = raw.state?.profiles?.find((p) => p.email === email);
    return profile?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Start password recovery.
 * Demo: issues a token (returned for UX/testing) and logs the link.
 * Live: sends Supabase recovery email.
 */
export async function requestPasswordReset(emailRaw: string) {
  const email = emailRaw.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Enter a valid email.");

  if (getAppMode() === "live") {
    const supabase = await createSupabaseServerClient();
    const redirectTo = `${getAppUrl()}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error(error.message);
    return { mode: "live" as const, sent: true };
  }

  // Demo — always respond success; only create token if account exists (except demo email always exists conceptually)
  const userId = (await findDemoUserId(email)) || (email === DEMO_EMAIL ? "user_demo_cameron" : null);
  if (!userId) {
    return { mode: "demo" as const, sent: true };
  }
  const token = randomBytes(24).toString("hex");
  const resets = await readResets();
  // purge expired
  const now = Date.now();
  for (const [key, value] of Object.entries(resets.tokens)) {
    if (value.expiresAt < now) delete resets.tokens[key];
  }
  resets.tokens[token] = { email, userId, expiresAt: now + 1000 * 60 * 60 };
  await writeResets(resets);
  const resetPath = `/reset-password?token=${token}`;
  console.info("[demo-password-reset]", { email, resetPath });
  return { mode: "demo" as const, sent: true, demoResetPath: resetPath, demoToken: token };
}

export async function completePasswordReset(input: { token?: string; password: string }) {
  if (input.password.length < 8) throw new Error("Use at least 8 characters.");

  if (getAppMode() === "live") {
    // Live recovery uses the browser Supabase session from the email link.
    // Server path: allow service-role update when a recovery access token is posted.
    if (!input.token) throw new Error("Open the reset link from your email, then set a new password.");
    const admin = createSupabaseAdmin();
    const { data: userData, error: userError } = await admin.auth.getUser(input.token);
    if (userError || !userData.user) {
      // Treat token as recovery — try updateUserById if client already exchanged session
      throw new Error("Reset link expired or invalid. Request a new one.");
    }
    const { error } = await admin.auth.admin.updateUserById(userData.user.id, { password: input.password });
    if (error) throw new Error(error.message);
    return { mode: "live" as const, updated: true };
  }

  if (!input.token) throw new Error("Missing reset token. Use the link from the reset email.");
  const resets = await readResets();
  const entry = resets.tokens[input.token];
  if (!entry || entry.expiresAt < Date.now()) {
    throw new Error("Reset link expired or invalid. Request a new one.");
  }
  if (entry.email === DEMO_EMAIL) {
    throw new Error("The shared demo account password can’t be changed. Sign up for your own account to reset.");
  }
  const auth = await readAuth();
  auth.passwords[entry.userId] = await bcrypt.hash(input.password, 10);
  await writeAuth(auth);
  delete resets.tokens[input.token];
  await writeResets(resets);
  return { mode: "demo" as const, updated: true };
}
