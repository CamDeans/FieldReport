import { test, expect } from "@playwright/test";
import { resetDemoViaBanner, signIn, signUpNewUser, completeTradeOnboarding, TINY_PNG, TINY_PDF } from "./helpers";

test.describe("launch readiness — no cloud credentials", () => {
  test("config reports demo + taxonomy_fallback without OpenAI", async ({ request }) => {
    const response = await request.get("/api/config");
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.data.mode).toBe("demo");
    expect(body.data.openai).toBe(false);
    expect(body.data.stripe).toBe(false);
    expect(body.data.resend).toBe(false);
    expect(body.data.reportEngine).toBe("taxonomy_fallback");
  });

  test("full contractor path: PDF + photo + generate + email compose + customer read", async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);

    await page.getByTestId("job-row-job_demo_roof").click();
    await expect(page.getByRole("heading", { name: "Sarah Johnson" })).toBeVisible();

    await expect(page.getByTestId("pdf-section")).toBeVisible();
    await page.getByTestId("pdf-input").setInputFiles({
      name: "roof-checklist.pdf",
      mimeType: "application/pdf",
      buffer: TINY_PDF,
    });
    await expect(page.getByText("roof-checklist.pdf")).toBeVisible();
    await expect(page.getByTestId("delete-pdf")).toBeVisible();

    await page.getByTestId("photo-input").setInputFiles({
      name: "site.png",
      mimeType: "image/png",
      buffer: TINY_PNG,
    });
    await page.getByPlaceholder("Caption what you see").last().fill("Ridge vent open along ridge");
    await page.getByPlaceholder(/type a field note/i).fill("Customer wants insurer-ready writeup.");
    await page.getByTestId("attach-note").click();

    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Recommended actions")).toBeVisible();

    await page.getByTestId("send-report").click();
    await expect(page.getByTestId("email-compose")).toBeVisible();
    const compose = page.getByTestId("email-compose");
    await expect(compose.getByTestId("contact-email-field")).toBeVisible();
    await expect(compose.getByTestId("pick-contact")).toBeVisible();
    await compose.getByTestId("customer-email-input").fill("sarah@example.com");
    await compose.getByTestId("email-subject").fill("Your roof inspection report");
    await compose.getByTestId("email-message").fill("Hi Sarah, report is ready.");
    await compose.getByTestId("confirm-send-email").click();
    await expect(page.getByTestId("email-preview")).toBeVisible();
    await page.getByTestId("email-preview").getByRole("button", { name: "Close" }).click();

    await page.getByTestId("customer-view").click();
    await expect(page).toHaveURL(/\/r\//);
    await expect(page.getByTestId("customer-report")).toBeVisible();
    await expect(page.getByTestId("read-recorded")).toBeVisible();
  });

  test("new job form exposes contacts field and freeform scope", async ({ page }) => {
    await signIn(page);
    await resetDemoViaBanner(page);
    await page.getByTestId("new-job").click();
    await expect(page.getByTestId("contact-email-field")).toBeVisible();
    await expect(page.getByTestId("pick-contact")).toBeVisible();
    await page.getByTestId("customer-email-input").fill("ada@example.com");
    await page.getByLabel("Customer name").fill("Ada Lopez");
    await page.getByTestId("job-type-input").fill("Custom HOA fence punch list");
    await page.getByRole("button", { name: /create job/i }).click();
    await expect(page.getByRole("heading", { name: "Ada Lopez" })).toBeVisible();
    await expect(page.getByTestId("job-type-input")).toHaveValue("Custom HOA fence punch list");
    await expect(page.getByTestId("customer-email-input")).toHaveValue("ada@example.com");
  });

  test("signup user can onboard and reach empty workspace with contacts tooling", async ({ page }) => {
    await signUpNewUser(page, "launch");
    await completeTradeOnboarding(page);
    await expect(page.getByTestId("empty-jobs")).toBeVisible();
    await page.getByTestId("new-job").click();
    await expect(page.getByTestId("pick-contact")).toBeVisible();
    await expect(page.getByTestId("suggest-scope")).toBeVisible();
  });

  test("protected routes and public marketing stay up without credentials", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /customer-ready report/i })).toBeVisible();
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/login/);
    await page.goto("/help");
    await expect(page.getByRole("heading", { name: /AI-first/i })).toBeVisible();
    await page.goto("/r/does-not-exist");
    await expect(page.getByTestId("customer-report-unavailable")).toBeVisible();
  });
});
