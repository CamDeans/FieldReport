/**
 * Shipaton billing helpers — no live store credentials required.
 * Run: npx tsx scripts/test-billing-shipaton.ts
 */
import assert from "node:assert/strict";
import { planFromEntitlements, revenueCatProductIdForPlan } from "../src/lib/billing-revenuecat";
import { resolvePromoPlan } from "../src/lib/services/revenuecat-billing";

function pass(name: string) {
  console.log(`PASS ${name}`);
}

assert.equal(planFromEntitlements(["pro"]), "pro");
assert.equal(planFromEntitlements(["starter", "pro"]), "pro");
assert.equal(planFromEntitlements(["team"]), "team");
assert.equal(planFromEntitlements([]), "free");
pass("entitlement → plan mapping");

assert.equal(revenueCatProductIdForPlan("starter"), "fieldreport_starter_monthly");
assert.equal(revenueCatProductIdForPlan("pro"), "fieldreport_pro_monthly");
pass("default product ids");

process.env.NEXT_PUBLIC_REVENUECAT_PRODUCT_PRO = "custom_pro_sku";
assert.equal(revenueCatProductIdForPlan("pro"), "custom_pro_sku");
delete process.env.NEXT_PUBLIC_REVENUECAT_PRODUCT_PRO;
process.env.NEXT_PUBLIC_RC_PRODUCT_STARTER = "legacy_starter_sku";
assert.equal(revenueCatProductIdForPlan("starter"), "legacy_starter_sku");
delete process.env.NEXT_PUBLIC_RC_PRODUCT_STARTER;
pass("product id env overrides (preferred + legacy)");

assert.equal(resolvePromoPlan("shipaton-judge"), "pro");
assert.equal(resolvePromoPlan("SHIPATON2026"), "pro");
assert.equal(resolvePromoPlan("FIELDREPORT-TRIAL"), "starter");
assert.equal(resolvePromoPlan("nope"), null);
pass("promo codes");

console.log("Shipaton billing helpers OK");
