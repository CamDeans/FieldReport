import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { getRepository, setSessionCookie } from "@/lib/repositories";

export async function POST(request: Request) {
  try {
    const body = await readJson<{ email: string; password: string }>(request);
    const repo = getRepository();
    const auth = await repo.login(body.email, body.password);
    await setSessionCookie(auth.token);
    return jsonOk({ userId: auth.userId, email: auth.email, mode: repo.mode });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Login failed", 401);
  }
}
