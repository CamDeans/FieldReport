import { jsonError, jsonOk } from "@/lib/api/http";
import {
  getAppMode,
  isOpenAiConfigured,
  isResendConfigured,
  isRevenueCatPublicConfigured,
  isRevenueCatWebhookConfigured,
  isStripeConfigured,
} from "@/lib/config";

export async function GET() {
  return jsonOk({
    mode: getAppMode(),
    openai: isOpenAiConfigured(),
    stripe: isStripeConfigured(),
    resend: isResendConfigured(),
    revenuecat: isRevenueCatPublicConfigured() || isRevenueCatWebhookConfigured(),
    reportEngine: isOpenAiConfigured() ? "openai" : "taxonomy_fallback",
  });
}
