import { test, expect } from "@playwright/test";
import { DEMO_EMAIL, DEMO_PASSWORD, resetDemoViaBanner, signIn, TINY_PNG } from "./helpers";

test.describe("public site", () => {
  test("landing nav, CTAs, anchors, pricing, and animation", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /customer-ready report/i })).toBeVisible();
    await expect(page.locator(".animate-in").first()).toBeVisible();
    await page.locator("header").getByRole("link", { name: "How it works" }).click();
    await expect(page.locator("#how-it-works")).toBeVisible();
    await page.locator("header").getByRole("link", { name: "Use cases" }).click();
    await expect(page.locator("#use-cases")).toBeVisible();
    await page.locator("header").getByRole("link", { name: "Pricing" }).click();
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page.getByRole("link", { name: /start free/i }).first()).toBeVisible();
    await expect(page.getByText("Roofing Inspection")).toBeVisible();
    await expect(page.getByText("Water Damage Assessment")).toBeVisible();
    await expect(page.getByText("HVAC Inspection")).toBeVisible();
    await expect(page.getByText("General Inspection")).toBeVisible();
    await expect(page.getByText("Move-In / Move-Out")).toBeVisible();
    await expect(page.getByText("Fence & Deck Inspection")).toBeVisible();
    await expect(page.getByText(/sectors · .* industries · .* report templates|any trade · freeform scopes/i)).toBeVisible();
    await expect(page.getByRole("link", { name: "Privacy" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Terms" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Contact" })).toBeVisible();
  });

  test("mobile menu opens landing anchors", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByTestId("mobile-menu").click();
    await expect(page.getByTestId("mobile-nav")).toBeVisible();
    await page.getByTestId("mobile-nav").getByRole("link", { name: "Pricing" }).click();
    await expect(page.locator("#pricing")).toBeVisible();
  });

  test("legal and help pages", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: "Privacy Policy" })).toBeVisible();
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: "Terms of Service" })).toBeVisible();
    await page.goto("/help");
    await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
    await page.getByText("Can I type notes if I can’t record voice?").click();
    await expect(page.getByText(/voice is optional/i)).toBeVisible();
  });

  test("404 recovery", async ({ page }) => {
    await page.goto("/missing-page");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
  });
});

test.describe("auth", () => {
  test("login, signup, and password pages are linked", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByTestId("login-form")).toBeVisible();
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByTestId("demo-reset-link")).toBeVisible();
    await page.getByTestId("demo-reset-link").click();
    await expect(page.getByRole("heading", { name: /set a new password/i })).toBeVisible();
    await page.goto("/signup");
    await expect(page.getByTestId("signup-form")).toBeVisible();
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page.getByTestId("login-form")).toBeVisible();
  });

  test("login requires password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("test@example.com");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByLabel("Password")).toHaveJSProperty("validity.valueMissing", true);
  });

  test("demo user can sign in", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
    await expect(page.getByTestId("demo-banner")).toBeVisible();
  });

  test("signup creates an isolated empty workspace", async ({ page }) => {
    const email = `new-${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.getByLabel("Your name").fill("Maya Chen");
    await page.getByLabel("Company").fill("Chen Restoration");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("Password!23");
    await page.getByRole("button", { name: /create free account/i }).click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByTestId("trade-onboarding")).toBeVisible();
    await expect(page.getByText("Sarah Johnson")).toHaveCount(0);
  });
});

test.describe("authenticated product", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
  });

  test("dashboard lists demo jobs, search, and status filter", async ({ page }) => {
    await expect(page.getByText("Sarah Johnson")).toBeVisible();
    await expect(page.getByText("Luis Ortega")).toBeVisible();
    await page.getByTestId("job-search").fill("Harbor");
    await expect(page.getByText("Luis Ortega")).toBeVisible();
    await expect(page.getByText("Sarah Johnson")).toHaveCount(0);
    await page.getByTestId("job-search").fill("");
    await page.getByTestId("status-filter").selectOption("ready");
    await expect(page.getByText("Priya Nair")).toBeVisible();
    await expect(page.getByText("Sarah Johnson")).toHaveCount(0);
  });

  test("desktop nav links work", async ({ page }) => {
    await page.getByRole("link", { name: "New job" }).first().click();
    await expect(page.getByRole("heading", { name: "New job" })).toBeVisible();
    await page.getByRole("link", { name: "Billing" }).first().click({ force: true });
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    await page.getByRole("link", { name: "Settings" }).first().click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await page.getByRole("link", { name: "Help" }).first().click();
    await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  });

  test("create job with HVAC report type", async ({ page }) => {
    await page.getByTestId("new-job").click();
    await expect(page.getByTestId("new-job-form")).toBeVisible();
    await page.getByLabel("Customer name").fill("Ada Lopez");
    await page.getByLabel("Customer email").fill("ada@example.com");
    await page.getByLabel("Property address").fill("10 Pine Rd");
    await page.getByTestId("job-type-input").fill("hvac_inspection");
    await page.getByLabel("Job notes").fill("Rooftop package unit, weak airflow complaints.");
    await page.getByRole("button", { name: /create job/i }).click();
    await expect(page.getByRole("heading", { name: "Ada Lopez" })).toBeVisible();
    await expect(page.getByTestId("job-type-input")).toHaveValue("hvac_inspection");
  });

  test("photo, note, generate, send, and customer view", async ({ page }) => {
    await page.getByText("Sarah Johnson").click();
    await expect(page.getByRole("heading", { name: "Sarah Johnson" })).toBeVisible();
    const png = TINY_PNG;
    await page.getByTestId("photo-input").setInputFiles({ name: "site.png", mimeType: "image/png", buffer: png });
    await page.getByPlaceholder("Caption what you see").last().fill("Ridge cap cracked along 6 feet");
    await page.getByPlaceholder(/type a field note/i).fill("Active leak risk at chimney flashing.");
    await page.getByTestId("attach-note").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();
    await expect(page.getByTestId("annotated-photo-gallery")).toBeVisible();
    await expect(page.getByTestId("photo-annotation-box").first()).toBeVisible();
    await expect(page.getByText("Recommended actions")).toBeVisible();
    await expect(page.getByTestId("print-report")).toBeEnabled();
    await page.getByTestId("send-report").click();
    await expect(page.getByTestId("email-compose")).toBeVisible();
    await page.getByTestId("confirm-send-email").click();
    await expect(page.getByText(/queued|sent/i).first()).toBeVisible();
    await page.getByTestId("email-preview").getByRole("button", { name: "Close" }).click();
    await page.getByTestId("customer-view").click();
    await expect(page.getByTestId("customer-report")).toBeVisible();
    await expect(page.getByTestId("annotated-photo-gallery")).toBeVisible();
    await expect(page.getByTestId("read-recorded")).toBeVisible();
    await page.goto("/dashboard");
    await page.getByText("Sarah Johnson").click();
    await expect(page.getByTestId("read-receipt")).toBeVisible();
  });

  test("duplicate a job", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_water").click();
    await page.getByTestId("duplicate-job").click();
    await expect(page.getByRole("heading", { name: "Luis Ortega (copy)" })).toBeVisible();
  });

  test("billing and settings", async ({ page }) => {
    await page.getByRole("link", { name: "Billing" }).first().click();
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();
    const starter = page.getByTestId("plan-starter");
    if (await starter.isEnabled()) {
      await starter.click();
    } else {
      await page.getByTestId("plan-pro").click();
    }
    await page.getByRole("link", { name: "Settings" }).first().click();
    await page.getByLabel("Company name").fill("Deans Field Services");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByLabel("Company name")).toHaveValue("Deans Field Services");
  });

  test("sign out", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/(login)?$/);
  });
});
