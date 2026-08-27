import { jsonError, jsonOk } from "@/lib/api/http";
import { handleRevenueCatWebhook } from "@/lib/services/revenuecat-billing";

export const runtime = "nodejs";

/** RevenueCat server notifications → FieldReport plan entitlements. */
export async function POST(request: Request) {
  try {
    const raw = await request.text();
    const auth = request.headers.get("authorization");
    const result = await handleRevenueCatWebhook(raw, auth);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Webhook failed", 401);
  }
}
