import { jsonError, jsonOk } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";

export async function GET() {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  const workspace = await session.repo.getWorkspace(session.userId);
  return jsonOk(workspace);
}
