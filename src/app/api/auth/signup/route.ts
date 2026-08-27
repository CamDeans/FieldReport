import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { getRepository, setSessionCookie } from "@/lib/repositories";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email: string; password: string; fullName: string; companyName: string }>(request);
    const repo = getRepository();
    const auth = await repo.signup(body);
    await setSessionCookie(auth.token);
    return jsonOk({ userId: auth.userId, email: auth.email, mode: repo.mode });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Signup failed", 400);
  }
}
