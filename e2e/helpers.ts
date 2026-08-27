import { expect, type Page } from "@playwright/test";

export const DEMO_EMAIL = "cameronmdeans@gmail.com";
export const DEMO_PASSWORD = "FieldReport!2026";

export const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64"
);

/** Minimal PDF with extractable text (for launch / PDF upload smokes). */
export const TINY_PDF = Buffer.from(
  `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources<< /Font<< /F1 5 0 R >> >> >>endobj
4 0 obj<< /Length 44 >>stream
BT /F1 12 Tf 20 100 Td (Roof Inspection Checklist) Tj ET
endstream
endobj
5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000266 00000 n 
0000000361 00000 n 
trailer<< /Size 6 /Root 1 0 R >>
startxref
434
%%EOF`
);

/** PDF with a blank page and no text operators (empty extract / OCR path). */
export const EMPTY_TEXT_PDF = Buffer.from(
  `%PDF-1.1
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>endobj
xref
0 4
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
trailer<< /Size 4 /Root 1 0 R >>
startxref
190
%%EOF`
);

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/dashboard/);
}

export async function resetDemoViaBanner(page: Page) {
  await expect(page.getByTestId("demo-banner")).toBeVisible();
  await page.getByTestId("reset-demo").click();
  await expect(page.locator("[data-sonner-toast]").filter({ hasText: /sample jobs restored/i })).toBeVisible();
}

export async function signUpNewUser(page: Page, prefix = "smoke") {
  const email = `${prefix}-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Smoke Tester");
  await page.getByLabel("Company").fill("Smoke Test Co");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("Password!23");
  await page.getByRole("button", { name: /create free account/i }).click();
  await expect(page).toHaveURL(/dashboard/);
  return email;
}

export async function completeTradeOnboarding(page: Page) {
  await expect(page.getByTestId("trade-onboarding")).toBeVisible();
  await page.getByTestId("sector-building_envelope").click();
  await page.getByRole("button", { name: /continue to industries/i }).click();
  await page.getByTestId("industry-roofing").click();
  await page.getByRole("button", { name: /continue · \d+ report templates/i }).click();
  await page.getByTestId("finish-trade-onboarding").click();
  await expect(page.getByTestId("trade-onboarding")).toHaveCount(0);
}
