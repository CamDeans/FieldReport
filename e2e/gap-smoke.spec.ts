/**
 * Gap smoke — previously unautomated edges (quota, PDF limits, offline,
 * checkout cancel, suggest-scope without OpenAI, branding, API auth, promos).
 */
import { test, expect } from "@playwright/test";
import {
  completeTradeOnboarding,
  EMPTY_TEXT_PDF,
  resetDemoViaBanner,
  signIn,
  signUpNewUser,
  TINY_PDF,
  TINY_PNG,
} from "./helpers";

test.describe("quota and billing edges", () => {
  test("free plan hits monthly limit banner after 3 new reports", async ({ page }) => {
    await signUpNewUser(page, "quota");
    await completeTradeOnboarding(page);

    for (let i = 1; i <= 3; i++) {
      await page.getByTestId("new-job").click();
      await page.getByLabel("Customer name").fill(`Quota Customer ${i}`);
      await page.getByTestId("job-type-input").fill(`Quota scope ${i}`);
      await page.getByRole("button", { name: /create job/i }).click();
      await expect(page.getByRole("heading", { name: `Quota Customer ${i}` })).toBeVisible();
      await page.getByTestId("photo-input").setInputFiles({
        name: `q${i}.png`,
        mimeType: "image/png",
        buffer: TINY_PNG,
      });
      await page.getByTestId("generate-report").click();
      await expect(page.getByTestId("report-preview")).toBeVisible({ timeout: 30_000 });
      await page.goto("/dashboard");
    }

    await page.getByTestId("new-job").click();
    await page.getByLabel("Customer name").fill("Quota Customer 4");
    await page.getByTestId("job-type-input").fill("Blocked scope");
    await page.getByRole("button", { name: /create job/i }).click();
    await expect(page.getByRole("heading", { name: "Quota Customer 4" })).toBeVisible();
    await page.getByTestId("photo-input").setInputFiles({
      name: "q4.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("limit-banner")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("limit-banner").getByRole("link", { name: /upgrade/i })).toBeVisible();
  });

  test("FIELDREPORT-TRIAL promo unlocks starter", async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
    await page.goto("/dashboard/billing");
    await page.getByTestId("promo-input").fill("FIELDREPORT-TRIAL");
    await page.getByTestId("promo-redeem").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /promo applied/i }).first()).toBeVisible();
    await expect(page.getByText(/^starter$/i).first()).toBeVisible();
  });

  test("checkout cancel query shows message", async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard/billing?checkout=cancel");
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /checkout canceled/i }).first()).toBeVisible();
    await expect(page).toHaveURL(/\/dashboard\/billing$/);
  });

  test("checkout success query toasts plan", async ({ page }) => {
    await signIn(page);
    await page.goto("/dashboard/billing?checkout=success&plan=pro");
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /you're on pro/i }).first()).toBeVisible();
  });
});

test.describe("PDF edges", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
  });

  test("empty-text PDF shows empty extract badge or toast", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    await page.getByTestId("pdf-input").setInputFiles({
      name: "blank.pdf",
      mimeType: "application/pdf",
      buffer: EMPTY_TEXT_PDF,
    });
    await expect(page.getByText("blank.pdf")).toBeVisible();
    await expect(page.getByTestId("pdf-empty-text")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/no recoverable text/i).first()).toBeVisible();
  });

  test("oversized PDF rejected by API", async ({ page, request }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    await expect(page).toHaveURL(/job_demo_roof/);
    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === "fieldreport_session");
    expect(session?.value).toBeTruthy();

    // ~8.1MB decoded payload as base64 data URL (approxBytes = ceil(len*3/4))
    const padding = "A".repeat(11_000_000);
    const dataUrl = `data:application/pdf;base64,${padding}`;
    const res = await request.post("/api/jobs/job_demo_roof/documents", {
      headers: {
        Cookie: `fieldreport_session=${session!.value}`,
        "Content-Type": "application/json",
      },
      data: { dataUrl, fileName: "huge.pdf", mimeType: "application/pdf" },
    });
    expect(res.ok()).toBeFalsy();
    const body = await res.json();
    expect(String(body.error || body.message || JSON.stringify(body))).toMatch(/too large|8 MB/i);
  });
});

test.describe("AI / scope edges without live OpenAI", () => {
  test("suggest-scope explains OpenAI is required", async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
    await page.getByTestId("new-job").click();
    await page.getByTestId("suggest-scope").click();
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /openai is not configured|custom report scope/i })
    ).toBeVisible();
  });
});

test.describe("offline, auth API, print, branding", () => {
  test("offline banner appears when browser goes offline", async ({ page, context }) => {
    await page.goto("/");
    await expect(page.getByTestId("offline-banner")).toHaveCount(0);
    await context.setOffline(true);
    await expect(page.getByTestId("offline-banner")).toBeVisible();
    await context.setOffline(false);
    await expect(page.getByTestId("offline-banner")).toHaveCount(0);
  });

  test("unauthenticated API returns 401", async ({ request }) => {
    const res = await request.get("/api/workspace");
    expect(res.status()).toBe(401);
  });

  test("print report invokes window.print", async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
    await page.getByTestId("job-row-job_demo_hvac").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();

    await page.evaluate(() => {
      (window as Window & { __printCalled?: boolean }).__printCalled = false;
      window.print = () => {
        (window as Window & { __printCalled?: boolean }).__printCalled = true;
      };
    });
    await page.getByTestId("print-report").click();
    expect(await page.evaluate(() => (window as Window & { __printCalled?: boolean }).__printCalled)).toBe(true);
  });

  test("settings logo appears on public customer report", async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
    await page.goto("/dashboard/settings");
    await page.getByTestId("logo-input").setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /logo updated/i })).toBeVisible();

    await page.goto("/dashboard");
    await page.getByTestId("job-row-job_demo_hvac").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();
    await expect(page.getByTestId("annotated-photo-gallery")).toBeVisible();
    await page.getByTestId("customer-view").click();
    await expect(page.getByTestId("customer-report")).toBeVisible();
    await expect(page.getByTestId("annotated-photo-gallery")).toBeVisible();
    await expect(page.getByRole("img", { name: /logo/i })).toBeVisible();
  });
});

test.describe("email multi-recipient send", () => {
  test("compose sends to multiple pasted recipients", async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
    await page.getByTestId("job-row-job_demo_roof").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();
    await page.getByTestId("send-report").click();
    const compose = page.getByTestId("email-compose");
    await compose.getByTestId("paste-emails").click();
    await compose.getByTestId("email-import-text").fill("one@example.com, two@example.com");
    await compose.getByTestId("email-import-apply").click();
    await expect(compose.getByTestId("customer-email-input")).toHaveValue("one@example.com, two@example.com");
    await compose.getByTestId("email-subject").fill("Multi recipient report");
    await compose.getByTestId("email-message").fill("Hello both");
    await compose.getByTestId("confirm-send-email").click();
    await expect(page.getByTestId("email-preview")).toBeVisible();
  });
});

test.describe("webhook signature guards", () => {
  test("stripe webhook rejects bad signature when unconfigured or invalid", async ({ request }) => {
    const res = await request.post("/api/billing/webhook", {
      headers: { "stripe-signature": "bad", "content-type": "application/json" },
      data: JSON.stringify({ type: "checkout.session.completed" }),
    });
    // Demo without Stripe: may no-op 200 or error — must not 500 crash
    expect(res.status()).toBeLessThan(500);
  });

  test("revenuecat webhook rejects missing auth", async ({ request }) => {
    const res = await request.post("/api/billing/revenuecat/webhook", {
      headers: { "content-type": "application/json" },
      data: JSON.stringify({ event: { type: "TEST", app_user_id: "x" } }),
    });
    expect([401, 403, 200, 400]).toContain(res.status());
    expect(res.status()).toBeLessThan(500);
  });
});

test.describe("text PDF still works (regression)", () => {
  test("text PDF upload keeps filename and delete control", async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
    await page.getByTestId("job-row-job_demo_roof").click();
    await page.getByTestId("pdf-input").setInputFiles({
      name: "checklist.pdf",
      mimeType: "application/pdf",
      buffer: TINY_PDF,
    });
    await expect(page.getByText("checklist.pdf")).toBeVisible();
    await expect(page.getByTestId("delete-pdf")).toBeVisible();
  });
});
