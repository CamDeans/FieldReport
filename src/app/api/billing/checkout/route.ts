import { jsonError, jsonOk, readJson } from "@/lib/api/http";
import { requireSession } from "@/lib/repositories";
import { createCheckoutSession } from "@/lib/services/billing-service";
import type { Plan } from "@/lib/types";

export async function POST(request: Request) {
  const session = await requireSession();
  if (!session) return jsonError("Unauthorized", 401);
  try {
    const body = await readJson<{ plan: Plan }>(request);
    const checkout = await createCheckoutSession({
      userId: session.userId,
      email: session.email,
      plan: body.plan,
    });
    return jsonOk(checkout);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Checkout failed");
  }
}
