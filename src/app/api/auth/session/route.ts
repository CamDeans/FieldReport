import { getAppMode } from "@/lib/config";
import { jsonOk } from "@/lib/api/http";
import { clearSessionCookie, getSessionToken, getRepository } from "@/lib/repositories";

export async function POST() {
  const token = await getSessionToken();
  if (token) await getRepository().logout(token);
  await clearSessionCookie();
  return jsonOk({ mode: getAppMode() });
}

export async function GET() {
  const token = await getSessionToken();
  if (!token) return jsonOk({ session: null, mode: getAppMode() });
  const repo = getRepository();
  const session = await repo.validateSession(token);
  if (!session) return jsonOk({ session: null, mode: repo.mode });
  return jsonOk({ session, mode: repo.mode });
}
