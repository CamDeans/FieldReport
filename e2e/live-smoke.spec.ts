/**
 * Live smoke — runs only when live credentials are present.
 * Skip entirely in demo CI: set RUN_LIVE_SMOKE=1 and configure env.
 *
 *   RUN_LIVE_SMOKE=1 npm run test:e2e:live
 */
import { test, expect } from "@playwright/test";

const liveEnabled = process.env.RUN_LIVE_SMOKE === "1";

test.describe("live credentials smoke @live", () => {
  test.beforeEach(() => {
    test.skip(!liveEnabled, "Set RUN_LIVE_SMOKE=1 with live env to run");
  });

  test("config reports live flags", async ({ request }) => {
    const res = await request.get("/api/config");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.mode).toBe("live");
    // Soft expectations — only assert truth when that provider is configured in this deploy
    if (process.env.OPENAI_API_KEY) expect(body.data.openai).toBe(true);
    if (process.env.STRIPE_SECRET_KEY) expect(body.data.stripe).toBe(true);
    if (process.env.RESEND_API_KEY) expect(body.data.resend).toBe(true);
    if (process.env.OPENAI_API_KEY) expect(body.data.reportEngine).toBe("openai");
  });

  test("OpenAI primary generate when key present", async ({ page, request }) => {
    test.skip(!process.env.OPENAI_API_KEY, "OPENAI_API_KEY required");
    const cfg = await (await request.get("/api/config")).json();
    expect(cfg.data.openai).toBe(true);

    // Live auth depends on Supabase — use env test user if provided
    const email = process.env.LIVE_SMOKE_EMAIL;
    const password = process.env.LIVE_SMOKE_PASSWORD;
    test.skip(!email || !password, "LIVE_SMOKE_EMAIL / LIVE_SMOKE_PASSWORD required");

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/dashboard/);

    await page.getByTestId("new-job").click();
    await page.getByLabel("Customer name").fill(`Live AI ${Date.now()}`);
    await page.getByTestId("job-type-input").fill("Roofing Inspection");
    await page.getByLabel("Job notes").fill("Granule loss on south slope; soft decking near chimney.");
    await page.getByRole("button", { name: /create job/i }).click();
    await page.getByTestId("generate-report").click();
    await expect(page.getByTestId("report-preview")).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText(/recommended|summary|condition/i).first()).toBeVisible();
  });

  test("suggest-scope succeeds with OpenAI", async ({ page }) => {
    test.skip(!process.env.OPENAI_API_KEY, "OPENAI_API_KEY required");
    const email = process.env.LIVE_SMOKE_EMAIL;
    const password = process.env.LIVE_SMOKE_PASSWORD;
    test.skip(!email || !password, "LIVE_SMOKE_EMAIL / LIVE_SMOKE_PASSWORD required");

    await page.goto("/login");
    await page.getByLabel("Email").fill(email!);
    await page.getByLabel("Password").fill(password!);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/dashboard/);
    await page.getByTestId("new-job").click();
    await page.getByLabel("Job notes").fill("Commercial rooftop RTU not cooling; filters dirty.");
    await page.getByTestId("suggest-scope").click();
    await expect(page.getByTestId("job-type-input")).not.toHaveValue("", { timeout: 60_000 });
  });
});
