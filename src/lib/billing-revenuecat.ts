/**
 * RevenueCat product / entitlement mapping for FieldReport plans.
 * Configure matching product IDs in App Store Connect, Play Console, and RevenueCat dashboard.
 */
import type { Plan } from "./types";

/** Entitlement identifiers expected in RevenueCat (create these in the RC dashboard). */
export const RC_ENTITLEMENTS: Record<Exclude<Plan, "free">, string> = {
  starter: "starter",
  pro: "pro",
  team: "team",
};

/**
 * Preferred package / product identifiers (RevenueCat package identifiers or store product ids).
 * Override with NEXT_PUBLIC_REVENUECAT_PRODUCT_* (preferred) or legacy NEXT_PUBLIC_RC_PRODUCT_*.
 */
export function revenueCatProductIdForPlan(plan: Exclude<Plan, "free">): string {
  const upper = plan.toUpperCase();
  const preferred = process.env[`NEXT_PUBLIC_REVENUECAT_PRODUCT_${upper}`]?.trim();
  if (preferred) return preferred;
  const legacy = process.env[`NEXT_PUBLIC_RC_PRODUCT_${upper}`]?.trim();
  if (legacy) return legacy;
  // Default identifiers — create matching products in RevenueCat + stores
  return `fieldreport_${plan}_monthly`;
}

export function planFromEntitlements(activeEntitlementIds: string[]): Plan {
  const set = new Set(activeEntitlementIds.map((id) => id.toLowerCase()));
  if (set.has(RC_ENTITLEMENTS.team) || set.has("team")) return "team";
  if (set.has(RC_ENTITLEMENTS.pro) || set.has("pro") || set.has("premium")) return "pro";
  if (set.has(RC_ENTITLEMENTS.starter) || set.has("starter")) return "starter";
  return "free";
}

/** @deprecated Prefer isRevenueCatPublicConfigured / isRevenueCatWebhookConfigured from config.ts */
export function isRevenueCatConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY?.trim() ||
      process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() ||
      process.env.REVENUECAT_WEBHOOK_SECRET?.trim()
  );
}
