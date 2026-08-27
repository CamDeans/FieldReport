"use client";

import { Capacitor } from "@capacitor/core";
import { isNativeApp, nativePlatform } from "./platform";
import { planFromEntitlements, revenueCatProductIdForPlan } from "../billing-revenuecat";
import type { Plan } from "../types";

type PurchasesModule = typeof import("@revenuecat/purchases-capacitor");

let configured = false;
let purchasesRef: PurchasesModule["Purchases"] | null = null;

async function loadPurchases() {
  if (!isNativeApp()) return null;
  if (purchasesRef) return purchasesRef;
  const mod = await import("@revenuecat/purchases-capacitor");
  purchasesRef = mod.Purchases;
  return purchasesRef;
}

function apiKeyForPlatform(): string | null {
  const platform = nativePlatform();
  if (platform === "ios") return process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY?.trim() || null;
  if (platform === "android") return process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY?.trim() || null;
  return null;
}

/** Configure RevenueCat once on native. Safe no-op on web / missing keys. */
export async function configureRevenueCat(appUserId?: string | null) {
  if (!isNativeApp() || !Capacitor.isNativePlatform()) return { ok: false as const, reason: "not_native" };
  const apiKey = apiKeyForPlatform();
  if (!apiKey) return { ok: false as const, reason: "missing_key" };
  const Purchases = await loadPurchases();
  if (!Purchases) return { ok: false as const, reason: "plugin_unavailable" };
  if (!configured) {
    await Purchases.configure({
      apiKey,
      appUserID: appUserId || undefined,
    });
    configured = true;
  } else if (appUserId) {
    await Purchases.logIn({ appUserID: appUserId });
  }
  return { ok: true as const };
}

export async function purchasePlanWithRevenueCat(plan: Exclude<Plan, "free">) {
  const Purchases = await loadPurchases();
  if (!Purchases) throw new Error("In-app purchases are only available in the iOS / Android app.");
  await configureRevenueCat();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  if (!current) throw new Error("No subscription offerings are configured yet. Check RevenueCat dashboard.");

  const productId = revenueCatProductIdForPlan(plan);
  const pkg =
    current.availablePackages.find((p) => p.product.identifier === productId) ||
    current.availablePackages.find((p) => p.identifier.toLowerCase().includes(plan)) ||
    current.availablePackages.find((p) => p.product.identifier.toLowerCase().includes(plan));

  if (!pkg) {
    throw new Error(
      `Could not find package for ${plan} (${productId}). Create the product in App Store / Play and RevenueCat.`
    );
  }

  const result = await Purchases.purchasePackage({ aPackage: pkg });
  const entitlements = Object.keys(result.customerInfo.entitlements.active ?? {});
  return {
    plan: planFromEntitlements(entitlements),
    entitlements,
    appUserId: result.customerInfo.originalAppUserId,
  };
}

export async function restoreRevenueCatPurchases() {
  const Purchases = await loadPurchases();
  if (!Purchases) throw new Error("Restore is only available in the native app.");
  await configureRevenueCat();
  const info = await Purchases.restorePurchases();
  const entitlements = Object.keys(info.customerInfo.entitlements.active ?? {});
  return {
    plan: planFromEntitlements(entitlements),
    entitlements,
    appUserId: info.customerInfo.originalAppUserId,
  };
}

export async function getActiveRevenueCatPlan(): Promise<Plan> {
  const Purchases = await loadPurchases();
  if (!Purchases) return "free";
  await configureRevenueCat();
  const info = await Purchases.getCustomerInfo();
  return planFromEntitlements(Object.keys(info.customerInfo.entitlements.active ?? {}));
}
