import { jsonOk } from "@/lib/api/http";
import {
  getAppMode,
  getAppUrl,
  isOpenAiConfigured,
  isResendConfigured,
  isRevenueCatPublicConfigured,
  isRevenueCatWebhookConfigured,
  isStripeConfigured,
} from "@/lib/config";

/**
 * Lightweight deploy probe — no auth, no secrets leaked.
 * Use for load balancer / platform health checks.
 */
export async function GET() {
  const mode = getAppMode();
  return jsonOk({
    status: "ok",
    service: "fieldreport",
    mode,
    appUrl: getAppUrl(),
    time: new Date().toISOString(),
    checks: {
      openai: isOpenAiConfigured(),
      stripe: isStripeConfigured(),
      resend: isResendConfigured(),
      revenuecat: isRevenueCatPublicConfigured() || isRevenueCatWebhookConfigured(),
      supabaseLive: mode === "live",
    },
  });
}
