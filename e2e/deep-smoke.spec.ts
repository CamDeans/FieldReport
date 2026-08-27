/**
 * Deep smoke — biggest features down to design tokens, fonts, colors,
 * forms, nav, animations, legal copy, and contact paste/CSV.
 * Complements smoke.spec / smoke-comprehensive / launch-readiness.
 */
import { test, expect } from "@playwright/test";
import { resetDemoViaBanner, signIn, TINY_PNG } from "./helpers";

test.describe("design system — fonts, colors, animation, touch targets", () => {
  test("landing uses Geist CSS vars, primary blue, and fade-in", async ({ page }) => {
    await page.goto("/");

    const tokens = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const body = getComputedStyle(document.body);
      const html = document.documentElement;
      return {
        background: root.getPropertyValue("--background").trim(),
        foreground: root.getPropertyValue("--foreground").trim(),
        primary: root.getPropertyValue("--primary").trim(),
        muted: root.getPropertyValue("--muted").trim(),
        border: root.getPropertyValue("--border").trim(),
        hasGeistVar: Boolean(root.getPropertyValue("--font-geist-sans").trim()),
        fontFamily: body.fontFamily,
        animateCount: document.querySelectorAll(".animate-in").length,
        themeColor: document.querySelector('meta[name="theme-color"]')?.getAttribute("content"),
      };
    });

    expect(tokens.background.toLowerCase()).toBe("#f8fafc");
    expect(tokens.foreground.toLowerCase()).toBe("#0f172a");
    expect(tokens.primary.toLowerCase()).toBe("#1d4ed8");
    expect(tokens.muted.toLowerCase()).toBe("#64748b");
    expect(tokens.border.toLowerCase()).toBe("#e2e8f0");
    expect(tokens.themeColor?.toLowerCase()).toBe("#1d4ed8");
    expect(tokens.hasGeistVar).toBe(true);
    expect(tokens.fontFamily.toLowerCase()).toMatch(/geist|ui-sans-serif|system-ui/);
    expect(tokens.animateCount).toBeGreaterThan(0);
    await expect(page.locator(".animate-in").first()).toBeVisible();

    // Brand / wordmark is hero-adjacent on landing
    await expect(page.locator("header").getByText("FieldReport").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /customer-ready report/i })).toBeVisible();
  });

  test("interactive controls meet 44px min height", async ({ page }) => {
    await page.goto("/login");
    const heights = await page.evaluate(() => {
      const email = document.querySelector("#email, input[type=email]") as HTMLElement | null;
      const button = document.querySelector("button[type=submit]") as HTMLElement | null;
      return {
        email: email ? email.getBoundingClientRect().height : 0,
        button: button ? button.getBoundingClientRect().height : 0,
      };
    });
    expect(heights.email).toBeGreaterThanOrEqual(44);
    expect(heights.button).toBeGreaterThanOrEqual(44);
  });

  test("skip link is present for keyboard users", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Skip to content" })).toHaveCount(1);
  });
});

test.describe("all public pages — headings, links, forms", () => {
  test("privacy and terms mention processors and native permissions", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    const privacy = page.locator("main");
    await expect(privacy.getByText(/Supabase/i)).toBeVisible();
    await expect(privacy.getByText(/OpenAI/i)).toBeVisible();
    await expect(privacy.getByText(/Stripe/i)).toBeVisible();
    await expect(privacy.getByText(/RevenueCat/i).first()).toBeVisible();
    await expect(privacy.getByText(/camera, microphone, and photo library/i)).toBeVisible();

    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
    await expect(page.locator("main").getByText(/RevenueCat/i)).toBeVisible();
    await expect(page.locator("main").getByText(/App Store|Google Play/i)).toBeVisible();
  });

  test("auth forms expose all expected fields and links", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
    await expect(page.getByRole("link", { name: /create|sign up|free account/i }).first()).toBeVisible();

    await page.goto("/signup");
    await expect(page.getByLabel("Your name")).toBeVisible();
    await expect(page.getByLabel("Company")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: /create free account/i })).toBeVisible();

    await page.goto("/forgot-password");
    await expect(page.getByTestId("forgot-form")).toBeVisible();
    await expect(page.getByTestId("forgot-email")).toBeVisible();
    await expect(page.getByTestId("forgot-submit")).toBeVisible();

    await page.goto("/reset-password");
    await expect(page.getByLabel("New password")).toBeVisible();
    await expect(page.getByLabel("Confirm password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Update password" })).toBeVisible();
  });

  test("landing use-case chips and pricing CTAs match product story", async ({ page }) => {
    await page.goto("/");
    for (const label of [
      "Roofing Inspection",
      "Water Damage Assessment",
      "HVAC Inspection",
      "General Inspection",
      "Move-In / Move-Out",
      "Fence & Deck Inspection",
    ]) {
      await expect(page.getByText(label).first()).toBeVisible();
    }
    await expect(page.locator("#pricing").getByText("3 reports/month")).toBeVisible();
    await expect(page.locator("#pricing").getByText("$29")).toBeVisible();
    await expect(page.locator("#pricing").getByText("$59")).toBeVisible();
    await expect(page.locator("#pricing").getByText("$99")).toBeVisible();
  });
});

test.describe("user stories — contractor loop details", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
  });

  test("paste/CSV email import on new job and multi-recipient compose", async ({ page }) => {
    await page.getByTestId("new-job").click();
    await page.getByTestId("paste-emails").click();
    await expect(page.getByTestId("email-import-panel")).toBeVisible();
    await page.getByTestId("email-import-text").fill("ada@example.com, bob@site.com\ncarol@hoa.org");
    await page.getByTestId("email-import-apply").click();
    // New job takes a single primary email (first parsed)
    await expect(page.getByTestId("customer-email-input")).toHaveValue("ada@example.com");

    await page.goto("/dashboard");
    await page.getByTestId("job-row-job_demo_roof").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();
    await page.getByTestId("send-report").click();
    const compose = page.getByTestId("email-compose");
    await expect(compose).toBeVisible();
    await compose.getByTestId("paste-emails").click();
    await compose.getByTestId("email-import-text").fill("ada@example.com, bob@site.com");
    await compose.getByTestId("email-import-apply").click();
    await expect(compose.getByTestId("customer-email-input")).toHaveValue("ada@example.com, bob@site.com");
  });

  test("dashboard usage and demo banner copy", async ({ page }) => {
    await expect(page.getByTestId("demo-banner")).toBeVisible();
    await expect(page.getByText(/demo mode/i).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
    await expect(page.getByTestId("job-search")).toBeVisible();
    await expect(page.getByTestId("status-filter")).toBeVisible();
    await expect(page.getByTestId("new-job")).toBeVisible();
  });

  test("workspace exposes photo, PDF, voice, generate, send, share controls", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    await expect(page.getByTestId("pdf-section")).toBeVisible();
    await expect(page.getByTestId("pdf-input")).toBeAttached();
    await expect(page.getByTestId("photo-input")).toBeAttached();
    await expect(page.getByTestId("voice-note")).toBeVisible();
    await expect(page.getByPlaceholder(/type a field note/i)).toBeVisible();
    await expect(page.getByTestId("attach-note")).toBeVisible();
    await expect(page.getByTestId("generate-report")).toBeVisible();
    await expect(page.getByTestId("duplicate-job")).toBeVisible();
    await expect(page.getByTestId("delete-job")).toBeVisible();

    await page.getByTestId("photo-input").setInputFiles({
      name: "detail.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await expect(page.getByPlaceholder("Caption what you see").last()).toBeVisible();
    await page.getByPlaceholder(/type a field note/i).fill("Visible granule loss near vent.");
    await page.getByTestId("attach-note").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("annotated-photo-gallery")).toBeVisible();
    await expect(page.getByTestId("photo-annotation-box").first()).toBeVisible();
  });

  test("billing shows web Stripe path and Shipaton promo panel", async ({ page }) => {
    await page.goto("/dashboard/billing");
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await expect(page.getByTestId("plan-starter")).toBeVisible();
    await expect(page.getByTestId("plan-pro")).toBeVisible();
    await expect(page.getByTestId("plan-team")).toBeVisible();
    await expect(page.getByTestId("promo-panel")).toBeVisible();
    await expect(page.getByTestId("promo-input")).toBeVisible();
    await expect(page.getByText(/demo mode|stripe|revenuecat|in-app/i).first()).toBeVisible();
  });

  test("settings form fields and save affordances", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.getByLabel("Company name")).toBeVisible();
    await expect(page.getByLabel("Phone")).toBeVisible();
    await expect(page.getByRole("button", { name: "Save settings" })).toBeVisible();
    await expect(page.getByTestId("logo-input")).toBeAttached();
    await expect(page.getByTestId("trade-settings")).toBeVisible();
    await expect(page.getByTestId("save-trade-catalog")).toBeVisible();
    await expect(page.getByTestId("reset-demo-settings")).toBeVisible();
  });
});

test.describe("Shipaton native layer — code-level smoke (no device)", () => {
  test("config endpoint exposes revenuecat flag key", async ({ request }) => {
    const response = await request.get("/api/config");
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data).toHaveProperty("mode");
    expect(body.data).toHaveProperty("openai");
    expect(body.data).toHaveProperty("stripe");
    expect(body.data).toHaveProperty("resend");
    expect(body.data).toHaveProperty("revenuecat");
    expect(body.data).toHaveProperty("reportEngine");
    expect(["demo", "live"]).toContain(body.data.mode);
  });

  test("health endpoint reports ok status for deploy probes", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.status).toBe("ok");
    expect(body.data.service).toBe("fieldreport");
    expect(body.data.checks).toMatchObject({
      openai: expect.any(Boolean),
      stripe: expect.any(Boolean),
      resend: expect.any(Boolean),
      revenuecat: expect.any(Boolean),
      supabaseLive: expect.any(Boolean),
    });
  });

  test("offline banner markup is not shown while online", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("offline-banner")).toHaveCount(0);
  });

  test("offline banner shows when browser reports offline", async ({ page, context }) => {
    await page.goto("/login");
    await context.setOffline(true);
    await expect(page.getByTestId("offline-banner")).toBeVisible();
    await context.setOffline(false);
  });
});
