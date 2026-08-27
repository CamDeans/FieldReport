import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";
import { syncRevenueCatEntitlements } from "@/lib/services/revenuecat-billing";

/** Authenticated client sync after native purchase / restore. */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  try {
    const body = await readJson<{ entitlements?: string[]; appUserId?: string }>(request);
    const entitlements = body.entitlements ?? [];
    const result = await syncRevenueCatEntitlements({
      userId: session.userId,
      entitlements,
      appUserId: body.appUserId,
    });
    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not sync entitlements");
  }
}
