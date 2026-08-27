import { test, expect } from "@playwright/test";
import {
  completeTradeOnboarding,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  resetDemoViaBanner,
  signIn,
  signUpNewUser,
  TINY_PNG,
} from "./helpers";

test.describe("landing page details", () => {
  test("hero, problem cards, steps, sectors, pricing, testimonials, footer", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("Built for the trades — not generic office software")).toBeVisible();
    await expect(page.getByRole("heading", { name: /customer-ready report/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /try free — 3 reports included/i })).toBeVisible();
    await expect(page.getByRole("link", { name: "See how it works" })).toBeVisible();
    await expect(page.getByText("No credit card · Works on any phone · Demo mode included")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Evenings lost to reports" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Amateur-looking Word docs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Photos everywhere" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Four taps. Professional report." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Photograph the job" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Narrate or type notes" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Generate the report" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Send to the customer" })).toBeVisible();

    await expect(page.getByRole("heading", { name: "Built for every trade sector" })).toBeVisible();
    await expect(page.getByText("Building Envelope & Exterior")).toBeVisible();
    await expect(page.getByText("Roofing contractors")).toBeVisible();

    await expect(page.getByRole("heading", { name: "Simple, honest pricing" })).toBeVisible();
    await expect(page.locator("#pricing").getByText("Free", { exact: true })).toBeVisible();
    await expect(page.locator("#pricing").getByText("Starter", { exact: true })).toBeVisible();
    await expect(page.locator("#pricing").getByText("Pro", { exact: true })).toBeVisible();
    await expect(page.locator("#pricing").getByText("Team", { exact: true })).toBeVisible();
    await expect(page.getByText("MOST POPULAR")).toBeVisible();
    await expect(page.getByRole("link", { name: "Start free" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Choose Pro" })).toBeVisible();

    await expect(page.getByText("Marcus T.")).toBeVisible();
    await expect(page.getByText("Jenny K.")).toBeVisible();
    await expect(page.getByText("Dave R.")).toBeVisible();

    await page.locator("footer").getByRole("link", { name: "Help" }).click();
    await expect(page).toHaveURL(/help/);
  });

  test("header auth links navigate correctly", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Sign in" }).click();
    await expect(page.getByTestId("login-form")).toBeVisible();
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Start free" }).click();
    await expect(page.getByTestId("signup-form")).toBeVisible();
  });

  test("mobile nav exposes all landing sections", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByTestId("mobile-menu").click();
    const nav = page.getByTestId("mobile-nav");
    await expect(nav.getByRole("link", { name: "How it works" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Use cases" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Pricing" })).toBeVisible();
    await nav.getByRole("link", { name: "Help" }).click();
    await expect(page).toHaveURL(/help/);
  });
});

test.describe("help page details", () => {
  test("all sections and FAQs expand", async ({ page }) => {
    await page.goto("/help");
    await expect(page.getByRole("heading", { name: "How a report gets made" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "AI-first (taxonomy is fallback only)" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Demo vs live" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Trade preferences" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Any trade" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Common questions" })).toBeVisible();

    const faqs = page.getByTestId("help-faq").locator("details");
    await expect(faqs).toHaveCount(7);

    await page.getByText("Can I type notes if I can’t record voice?").click();
    await expect(page.getByText(/voice is optional/i)).toBeVisible();

    await page.getByText("Do voice notes update my uploaded PDF?").click();
    await expect(page.getByText(/pdf is a reference for structure/i)).toBeVisible();

    await page.getByText("How does the customer see the report?").click();
    await expect(page.getByText(/copy the customer link or send it/i)).toBeVisible();

    await page.getByText("Does branding show on reports?").click();
    await expect(page.getByText(/company name, phone, and logo in settings/i)).toBeVisible();

    await page.getByRole("link", { name: "Back to home" }).click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("auth edge cases", () => {
  test("demo password mismatch shows error", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByLabel("Password").fill("WrongPass!99");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /demo password/i })).toBeVisible();
  });

  test("login page shows demo credentials", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText(DEMO_EMAIL)).toBeVisible();
    await expect(page.getByText(DEMO_PASSWORD)).toBeVisible();
  });

  test("protected dashboard redirects when logged out", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
  });

  test("reset password validates match", async ({ page }) => {
    await page.goto("/reset-password");
    await page.getByLabel("New password").fill("LongEnough!1");
    await page.getByLabel("Confirm password").fill("Different!99");
    await page.getByRole("button", { name: "Update password" }).click();
    await expect(page.locator("[data-sonner-toast]")).toContainText(/passwords don’t match/i);
  });

  test("forgot password issues demo reset link", async ({ page }) => {
    const email = await signUpNewUser(page, "resetpw");
    await page.goto("/forgot-password");
    await page.getByTestId("forgot-email").fill(email);
    await page.getByTestId("forgot-submit").click();
    await expect(page.getByTestId("demo-reset-link")).toBeVisible();
    await page.getByTestId("demo-reset-link").click();
    await page.getByTestId("reset-password").fill("NewPass!456");
    await page.getByTestId("reset-confirm").fill("NewPass!456");
    await page.getByTestId("reset-submit").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /password updated/i })).toBeVisible();
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("api config", () => {
  test("returns demo mode", async ({ request }) => {
    const response = await request.get("/api/config");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.data.mode).toBe("demo");
    expect(body.data.reportEngine).toBe("taxonomy_fallback");
    expect(body.data.openai).toBe(false);
  });
});

test.describe("trade onboarding flow", () => {
  test("new signup completes 3-step wizard and shows checklist", async ({ page }) => {
    await signUpNewUser(page, "onboard");
    await expect(page.getByTestId("trade-onboarding")).toBeVisible();
    await completeTradeOnboarding(page);
    await expect(page.getByTestId("onboarding")).toBeVisible();
    await expect(page.getByTestId("empty-jobs")).toBeVisible();
    await expect(page.getByTestId("onboarding").getByRole("link", { name: "Create a job" })).toBeVisible();
  });
});

test.describe("demo user — dashboard details", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
  });

  test("status filters and empty search state", async ({ page }) => {
    await page.getByTestId("status-filter").selectOption("draft");
    await expect(page.getByText("Sarah Johnson")).toBeVisible();
    await expect(page.getByText("Luis Ortega")).toBeVisible();
    await expect(page.getByText("Priya Nair")).toHaveCount(0);

    await page.getByTestId("status-filter").selectOption("ready");
    await expect(page.getByText("Priya Nair")).toBeVisible();
    await expect(page.getByText("Sarah Johnson")).toHaveCount(0);

    await page.getByTestId("status-filter").selectOption("sent");
    await expect(page.getByTestId("empty-filter")).toBeVisible();

    await page.getByTestId("status-filter").selectOption("all");
    await page.getByTestId("job-search").fill("HVAC");
    await expect(page.getByText("Priya Nair")).toBeVisible();
    await page.getByTestId("job-search").fill("zzznomatch");
    await expect(page.getByTestId("empty-filter")).toBeVisible();
  });

  test("job rows link to workspaces", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    await expect(page.getByRole("heading", { name: "Sarah Johnson" })).toBeVisible();
  });

  test("demo banner reset restores sample jobs", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByTestId("delete-job").click();
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText("Sarah Johnson")).toHaveCount(0);
    await resetDemoViaBanner(page);
    await expect(page.getByText("Sarah Johnson")).toBeVisible();
  });
});

test.describe("demo user — job workspace details", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
  });

  test("Priya Nair has pre-generated report", async ({ page }) => {
    await page.getByText("Priya Nair").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();
    await expect(page.getByTestId("send-report")).toBeEnabled();
    await expect(page.getByTestId("print-report")).toBeEnabled();
  });

  test("edit job fields and freeform report scope", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    await expect(page.getByRole("heading", { name: "Sarah Johnson" })).toBeVisible();
    const details = page.locator("section").filter({ hasText: "Job details" });
    await details.locator("input").first().fill("Sarah J. Updated");
    await expect(page.getByRole("heading", { name: "Sarah J. Updated" })).toBeVisible();

    await page.getByTestId("job-type-show-all").click();
    await expect(page.getByTestId("job-type-catalog")).toBeVisible();
    await page.getByTestId("job-type-catalog").selectOption("hvac_inspection");
    await expect(page.getByTestId("job-type-input")).toHaveValue("hvac_inspection", { timeout: 10_000 });
    await page.getByTestId("job-type-input").fill("Custom hail survey for HOA");
    await expect(page.getByTestId("job-type-input")).toHaveValue("Custom hail survey for HOA", { timeout: 10_000 });
  });

  test("note without photo saves to job notes", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_water").click();
    await expect(page.getByRole("heading", { name: "Luis Ortega" })).toBeVisible();
    await page.getByTestId("delete-photo").click();
    await expect(page.getByTestId("delete-photo")).toHaveCount(0);
    await expect(page.getByText(/add photos when you can/i)).toBeVisible();

    await page.getByPlaceholder(/type a field note/i).fill("Orphan note without photo");
    await page.getByTestId("attach-note").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /saved to job notes/i })).toBeVisible();
    await expect(page.locator("#notes")).toContainText("Orphan note without photo");
  });

  test("evidence dirty banner after note when report exists", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();
    await expect(page.getByTestId("report-version")).toContainText("Version 1");
    await page.getByPlaceholder(/type a field note/i).fill("Follow-up: ridge vents clogged with debris.");
    await page.getByTestId("attach-note").click();
    await expect(page.getByTestId("evidence-dirty-banner")).toBeVisible();
    await page.getByTestId("regenerate-from-banner").click();
    await expect(page.getByTestId("evidence-dirty-banner")).toHaveCount(0);
    await expect(page.getByTestId("report-preview")).toBeVisible();
    await expect(page.getByTestId("report-version")).toContainText("Version 2");
    await expect(page.getByTestId("report-history")).toBeVisible();
  });

  test("photo note target selection", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    await expect(page.getByTestId("select-photo-0")).toBeVisible();
    await page.getByTestId("select-photo-0").click();
    await page.getByTestId("note-target-job").click();
    await page.getByPlaceholder(/type a field note/i).fill("Saved to job notes on purpose");
    await page.getByTestId("attach-note").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /job notes/i })).toBeVisible();
    await expect(page.locator("#notes")).toContainText("Saved to job notes on purpose");
  });

  test("voice note button handles unavailable mic", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    await expect(page.getByTestId("voice-note")).toBeVisible();
    await page.getByTestId("voice-note").click();
    const unavailableToast = page.locator("[data-sonner-toast]").filter({ hasText: /voice capture isn’t available|type a field note/i });
    const listening = page.getByTestId("voice-note").filter({ hasText: "Stop listening" });
    await expect(unavailableToast.or(listening)).toBeVisible();
  });

  test("copy share and copy report after generate", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByTestId("job-row-job_demo_roof").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();

    await page.getByTestId("copy-share").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /customer link copied/i })).toBeVisible();

    await page.getByTestId("copy-report").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /report copied/i })).toBeVisible();
  });

  test("regenerate report updates content", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_roof").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();
    await page.getByTestId("generate-report").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /report updated/i }).first()).toBeVisible();
  });

  test("invalid job id shows missing page", async ({ page }) => {
    await page.goto("/dashboard/jobs/nonexistent-job-id");
    await expect(page.getByTestId("job-missing")).toBeVisible();
    await page.getByRole("link", { name: "Back to jobs" }).click();
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  });
});

test.describe("demo user — billing and settings", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
  });

  test("all billing plan buttons work in demo mode", async ({ page }) => {
    await page.getByRole("link", { name: "Billing" }).first().click();
    await expect(page.getByText(/demo mode uses the same billing apis/i)).toBeVisible();
    await expect(page.getByTestId("plan-pro")).toBeVisible();
    await expect(page.getByTestId("plan-team")).toBeVisible();
    await expect(page.getByTestId("promo-panel")).toBeVisible();

    await page.getByTestId("plan-starter").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /starter plan activated/i })).toBeVisible();

    await page.getByTestId("plan-team").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /team plan activated/i })).toBeVisible();
  });

  test("shipaton judge promo unlocks pro", async ({ page }) => {
    await page.getByRole("link", { name: "Billing" }).first().click();
    await page.getByTestId("promo-input").fill("SHIPATON-JUDGE");
    await page.getByTestId("promo-redeem").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /promo applied/i })).toBeVisible();
    await expect(page.getByText(/^pro$/i).first()).toBeVisible();
  });

  test("settings profile, phone, trade catalog, logo, demo reset", async ({ page }) => {
    await page.getByRole("link", { name: "Settings" }).first().click();
    await page.getByLabel("Phone").fill("(555) 123-4567");
    await page.getByLabel("Company name").fill("Updated Inspections LLC");
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(page.getByLabel("Company name")).toHaveValue("Updated Inspections LLC");

    await page.getByTestId("trade-settings").scrollIntoViewIfNeeded();
    await page.getByTestId("save-trade-catalog").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /trade catalog updated/i })).toBeVisible();

    await page.getByTestId("logo-input").setInputFiles({
      name: "logo.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /logo updated/i })).toBeVisible();

    await page.getByTestId("reset-demo-settings").click();
    await expect(page.locator("[data-sonner-toast]").filter({ hasText: /demo data restored/i })).toBeVisible();
  });
});

test.describe("demo user — mobile navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);
    await resetDemoViaBanner(page);
  });

  test("bottom nav reaches all main sections", async ({ page }) => {
    const nav = page.getByTestId("mobile-bottom-nav");
    await nav.getByRole("link", { name: "New" }).click();
    await expect(page.getByRole("heading", { name: "New job" })).toBeVisible();

    await nav.getByRole("link", { name: "Billing" }).click();
    await expect(page.getByRole("heading", { name: "Billing" })).toBeVisible();

    await nav.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await nav.getByRole("link", { name: "Help" }).click();
    await expect(page.getByRole("heading", { name: "Help" })).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Jobs" })).toBeVisible();
  });
});

test.describe("customer report pages", () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
  });

  test("invalid public link shows unavailable", async ({ page }) => {
    await page.goto("/r/bad-report-id");
    await expect(page.getByTestId("customer-report-unavailable")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Report unavailable" })).toBeVisible();
  });

  test("Priya HVAC report loads publicly", async ({ page }) => {
    await page.getByTestId("job-row-job_demo_hvac").click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible();
    await expect(page.getByTestId("annotated-photo-gallery")).toBeVisible();
    await page.getByTestId("customer-view").click();
    await expect(page).toHaveURL(/\/r\//);
    await expect(page.getByTestId("customer-report")).toBeVisible();
    await expect(page.getByTestId("annotated-photo-gallery")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Priya Nair/i })).toBeVisible();
    await expect(page.getByTestId("read-recorded")).toBeVisible();
  });
});
