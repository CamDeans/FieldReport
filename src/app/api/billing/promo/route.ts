import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";
import { redeemPromoCode } from "@/lib/services/revenuecat-billing";

/** Promo / Shipaton judge unlock codes. */
export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  try {
    const body = await readJson<{ code?: string }>(request);
    if (!body.code?.trim()) return jsonError("Promo code required");
    const result = await redeemPromoCode(session.userId, body.code);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not redeem promo");
  }
}
