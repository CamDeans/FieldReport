/**
 * Native / Shipaton harness smoke (no device required).
 * Device Camera/Share/IAP remain manual — see SMOKE-MATRIX.md.
 */
import { test, expect } from "@playwright/test";
import { pathFromDeepLink } from "../src/lib/native/deep-link";
import { revenueCatProductIdForPlan, planFromEntitlements, RC_ENTITLEMENTS } from "../src/lib/billing-revenuecat";
import { resolvePromoPlan } from "../src/lib/services/revenuecat-billing";

test.describe("native / Shipaton harness", () => {
  test("deep links map to in-app routes", () => {
    expect(pathFromDeepLink("fieldreport://dashboard/billing")).toBe("/dashboard/billing");
    expect(pathFromDeepLink("fieldreport://r/report_1")).toBe("/r/report_1");
    expect(pathFromDeepLink("fieldreport://reset-password?token=abc")).toBe("/reset-password?token=abc");
    expect(pathFromDeepLink("https://app.example.com/dashboard/jobs/1")).toBe("/dashboard/jobs/1");
  });

  test("RevenueCat entitlements and default product ids", () => {
    expect(RC_ENTITLEMENTS.pro).toBe("pro");
    expect(planFromEntitlements(["premium"])).toBe("pro");
    expect(revenueCatProductIdForPlan("team")).toBe("fieldreport_team_monthly");
  });

  test("Shipaton promo codes resolve", () => {
    expect(resolvePromoPlan("SHIPATON-JUDGE")).toBe("pro");
    expect(resolvePromoPlan("SHIPATON2026")).toBe("pro");
    expect(resolvePromoPlan("FIELDREPORT-TRIAL")).toBe("starter");
  });

  test("restore-purchases control is native-only (absent on web)", async ({ page }) => {
    // Sign-in not required — billing redirects to login; after login on web restore is hidden
    await page.goto("/login");
    await page.getByLabel("Email").fill("cameronmdeans@gmail.com");
    await page.getByLabel("Password").fill("FieldReport!2026");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.goto("/dashboard/billing");
    await expect(page.getByTestId("restore-purchases")).toHaveCount(0);
    await expect(page.getByTestId("trial-badge-starter")).toBeVisible();
  });
});
