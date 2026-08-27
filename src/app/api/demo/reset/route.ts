import { jsonError, jsonOk } from "@/lib/api/http";
import { getAppMode } from "@/lib/config";
import { requireSession } from "@/lib/repositories";

export async function POST() {
  if (getAppMode() !== "demo") return jsonError("Demo reset only available in demo mode", 403);
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  try {
    const workspace = await session.repo.resetDemo(session.userId);
    return jsonOk(workspace);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Reset failed");
  }
}
