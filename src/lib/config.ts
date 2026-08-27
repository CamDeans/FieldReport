export type AppMode = "demo" | "live";

function isReal(value: string | undefined) {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && !/^your[-_]|placeholder|example|xxx|changeme/i.test(trimmed);
}

export function getAppMode(): AppMode {
  return isReal(process.env.NEXT_PUBLIC_SUPABASE_URL) && isReal(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    ? "live"
    : "demo";
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function isStripeConfigured() {
  return isReal(process.env.STRIPE_SECRET_KEY);
}

export function isResendConfigured() {
  return isReal(process.env.RESEND_API_KEY);
}

export function isOpenAiConfigured() {
  return isReal(process.env.OPENAI_API_KEY);
}

export function isRevenueCatPublicConfigured() {
  return (
    isReal(process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY) || isReal(process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY)
  );
}

export function isRevenueCatWebhookConfigured() {
  return isReal(process.env.REVENUECAT_WEBHOOK_SECRET);
}

export const STRIPE_PRICE_IDS: Record<string, string | undefined> = {
  starter: process.env.STRIPE_PRICE_STARTER,
  pro: process.env.STRIPE_PRICE_PRO,
  team: process.env.STRIPE_PRICE_TEAM,
};

export const SESSION_COOKIE = "fieldreport_session";
