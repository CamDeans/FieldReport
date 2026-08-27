import type { Plan } from "../types";
import { planFromEntitlements } from "../billing-revenuecat";
import { getRepository } from "../repositories";

/** Shipaton judge / promo unlocks (comma-separated env PROMO_CODES, plus built-in codes). */
const BUILTIN_PROMOS: Record<string, Plan> = {
  "SHIPATON-JUDGE": "pro",
  SHIPATON2026: "pro",
  "FIELDREPORT-TRIAL": "starter",
};

export function resolvePromoPlan(code: string): Plan | null {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return null;
  if (BUILTIN_PROMOS[normalized]) return BUILTIN_PROMOS[normalized];
  const fromEnv = (process.env.PROMO_CODES || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  for (const entry of fromEnv) {
    const [key, plan] = entry.split(":").map((s) => s.trim());
    if (key?.toUpperCase() === normalized && plan) {
      return plan.toLowerCase() as Plan;
    }
  }
  return null;
}

export async function redeemPromoCode(userId: string, code: string) {
  const plan = resolvePromoPlan(code);
  if (!plan) throw new Error("Invalid or expired promo code.");
  const repo = getRepository();
  const profile = await repo.changePlan(userId, plan);
  return { profile, plan, code: code.trim().toUpperCase() };
}

/**
 * Sync plan from RevenueCat customer entitlements (client restore / post-purchase).
 * Prefer the webhook for production; this authenticated path covers immediate UI refresh.
 */
export async function syncRevenueCatEntitlements(input: {
  userId: string;
  entitlements: string[];
  appUserId?: string;
}) {
  const plan = planFromEntitlements(input.entitlements);
  const repo = getRepository();
  const profile = await repo.changePlan(input.userId, plan);
  return { profile, plan };
}

type RcEventBody = {
  type?: string;
  app_user_id?: string;
  entitlements?: string[];
  entitlement_ids?: string[];
  product_id?: string;
  aliases?: string[];
};

type RevenueCatWebhookPayload = {
  type?: string;
  event?: RcEventBody;
  api_version?: string;
};

export async function handleRevenueCatWebhook(rawBody: string, authHeader: string | null) {
  const secret = process.env.REVENUECAT_WEBHOOK_SECRET?.trim();
  if (!secret) return { handled: false as const, reason: "not_configured" };

  const expected = secret.startsWith("Bearer ") ? secret : `Bearer ${secret}`;
  if ((authHeader || "").trim() !== expected && (authHeader || "").trim() !== secret) {
    throw new Error("Invalid RevenueCat webhook authorization");
  }

  const payload = JSON.parse(rawBody) as RevenueCatWebhookPayload;
  const event: RcEventBody = payload.event ?? {
    type: payload.type,
  };
  const type = (event.type || payload.type || "").toUpperCase();
  const appUserId = event.app_user_id || event.aliases?.[0];
  if (!appUserId) return { handled: false as const, reason: "missing_user" };

  const entitlementIds = event.entitlement_ids || event.entitlements || [];
  let plan: Plan = planFromEntitlements(entitlementIds);

  if (["EXPIRATION", "CANCELLATION", "SUBSCRIPTION_PAUSED"].includes(type) && entitlementIds.length === 0) {
    plan = "free";
  }

  if (plan === "free" && event.product_id) {
    const pid = event.product_id.toLowerCase();
    if (pid.includes("team")) plan = "team";
    else if (pid.includes("pro")) plan = "pro";
    else if (pid.includes("starter")) plan = "starter";
  }

  const repo = getRepository();
  await repo.changePlan(appUserId, plan);
  return { handled: true as const, userId: appUserId, plan, type };
}
