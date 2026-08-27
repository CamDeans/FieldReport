/**
 * Naming conventions smoke — credentials, DB, routes, plans, schemes.
 * Run: npx tsx scripts/test-naming-conventions.ts
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { SESSION_COOKIE, STRIPE_PRICE_IDS } from "../src/lib/config";
import { revenueCatProductIdForPlan, RC_ENTITLEMENTS } from "../src/lib/billing-revenuecat";
import { pathFromDeepLink } from "../src/lib/native/deep-link";
import { PLAN_LIMITS, PLAN_PRICES, type Plan } from "../src/lib/types";

const root = path.join(process.cwd());

function pass(name: string) {
  console.log(`PASS ${name}`);
}

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8");
}

function envKeysFromExample(): string[] {
  const lines = read(".env.example").split("\n");
  return lines
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => l.split("=")[0]!.trim());
}

function codebaseBlob(): string {
  const files = [
    "src/lib/config.ts",
    "src/lib/billing-revenuecat.ts",
    "src/lib/services/billing-service.ts",
    "src/lib/services/revenuecat-billing.ts",
    "src/lib/services/email-service.ts",
    "src/lib/services/ai-report.ts",
    "src/lib/services/pdf-extract.ts",
    "src/lib/supabase/server.ts",
    "src/lib/supabase/client.ts",
    "src/lib/native/revenuecat.ts",
    "capacitor.config.ts",
    "src/lib/repositories/index.ts",
  ];
  return files.map((f) => read(f)).join("\n");
}

// --- Env: every .env.example key is referenced in code ---
const envKeys = envKeysFromExample();
assert.ok(envKeys.length >= 15, "expected a full credential set in .env.example");
const blob = codebaseBlob();
const missingRefs: string[] = [];
for (const key of envKeys) {
  // Product overrides: preferred REVENUECAT_PRODUCT_* or legacy RC_PRODUCT_*
  if (key.startsWith("NEXT_PUBLIC_RC_PRODUCT_")) {
    const plan = key.replace("NEXT_PUBLIC_RC_PRODUCT_", "");
    const preferred = `NEXT_PUBLIC_REVENUECAT_PRODUCT_${plan}`;
    if (!blob.includes(key) && !blob.includes("NEXT_PUBLIC_RC_PRODUCT_") && !blob.includes(preferred)) {
      missingRefs.push(key);
    }
    continue;
  }
  if (key.startsWith("NEXT_PUBLIC_REVENUECAT_PRODUCT_")) {
    if (!blob.includes("NEXT_PUBLIC_REVENUECAT_PRODUCT_") && !blob.includes("NEXT_PUBLIC_RC_PRODUCT_")) {
      missingRefs.push(key);
    }
    continue;
  }
  if (!blob.includes(key) && !blob.includes(`process.env.${key}`) && !blob.includes(`[${key}]`)) {
    // Dynamic STRIPE_PRICE_* via STRIPE_PRICE_IDS object keys from env
    if (key.startsWith("STRIPE_PRICE_") && blob.includes("STRIPE_PRICE_")) continue;
    if (key === "PROMO_CODES" && blob.includes("PROMO_CODES")) continue;
    if (key === "RESEND_FROM_EMAIL" && blob.includes("RESEND_FROM_EMAIL")) continue;
    if (key === "STRIPE_WEBHOOK_SECRET" && blob.includes("STRIPE_WEBHOOK_SECRET")) continue;
    if (key === "STRIPE_TRIAL_DAYS" && blob.includes("STRIPE_TRIAL_DAYS")) continue;
    if (key === "CAPACITOR_SERVER_URL" && blob.includes("CAPACITOR_SERVER_URL")) continue;
    missingRefs.push(key);
  }
}
assert.deepEqual(missingRefs, [], `env keys unused in code: ${missingRefs.join(", ")}`);
pass("all .env.example keys referenced in runtime code");

// Secrets must not be NEXT_PUBLIC_
const secretPrefixes = ["SUPABASE_SERVICE_ROLE", "OPENAI_", "RESEND_API", "STRIPE_SECRET", "STRIPE_WEBHOOK", "REVENUECAT_WEBHOOK"];
for (const key of envKeys) {
  for (const secret of secretPrefixes) {
    if (key.startsWith(secret)) {
      assert.ok(!key.startsWith("NEXT_PUBLIC_"), `${key} must not be public`);
    }
  }
}
pass("secrets are not NEXT_PUBLIC_");

// Public SDK keys must be NEXT_PUBLIC_
for (const key of [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_REVENUECAT_IOS_KEY",
  "NEXT_PUBLIC_REVENUECAT_ANDROID_KEY",
  "NEXT_PUBLIC_APP_URL",
]) {
  assert.ok(envKeys.includes(key), `missing public key ${key}`);
}
pass("required public env keys present");

// --- Session cookie naming ---
assert.equal(SESSION_COOKIE, "fieldreport_session");
assert.ok(!existsSync(path.join(root, "src")) || !read("src/lib/demo-data.ts").includes("fieldreport.session"));
assert.ok(!read("src/lib/demo-data.ts").includes("fieldreport.v1"));
pass("session cookie is fieldreport_session; dead localStorage keys removed");

// --- Plan keys aligned across Stripe / RC / limits ---
const plans: Plan[] = ["free", "starter", "pro", "team"];
for (const plan of plans) {
  assert.ok(plan in PLAN_LIMITS, `PLAN_LIMITS.${plan}`);
  assert.ok(plan in PLAN_PRICES, `PLAN_PRICES.${plan}`);
}
for (const plan of ["starter", "pro", "team"] as const) {
  assert.equal(RC_ENTITLEMENTS[plan], plan);
  assert.equal(revenueCatProductIdForPlan(plan), `fieldreport_${plan}_monthly`);
  assert.ok(`STRIPE_PRICE_${plan.toUpperCase()}` in Object.fromEntries(envKeys.map((k) => [k, true])) || STRIPE_PRICE_IDS[plan] !== undefined);
  assert.ok(Object.prototype.hasOwnProperty.call(STRIPE_PRICE_IDS, plan));
}
pass("plan keys aligned (free/starter/pro/team)");

// --- Deep link scheme ---
assert.equal(pathFromDeepLink("fieldreport://dashboard/billing"), "/dashboard/billing");
assert.equal(pathFromDeepLink("fieldreport://r/abc"), "/r/abc");
const manifest = read("android/app/src/main/AndroidManifest.xml");
assert.ok(manifest.includes('android:scheme="fieldreport"'), "Android VIEW intent must use fieldreport scheme");
const plist = read("ios/App/App/Info.plist");
assert.ok(plist.includes("fieldreport"), "iOS URL types must include fieldreport");
pass("deep link scheme fieldreport consistent");

// --- Capacitor appId ---
const cap = read("capacitor.config.ts");
assert.ok(cap.includes('appId: "app.fieldreport.mobile"'));
const androidId = read("android/app/src/main/res/values/strings.xml");
assert.ok(androidId.includes("app.fieldreport.mobile"));
pass("Capacitor appId app.fieldreport.mobile");

// --- Schema tables expected ---
const schema = read("supabase/schema.sql");
for (const table of ["profiles", "jobs", "photos", "reports", "job_documents", "public_report_snapshots"]) {
  assert.ok(schema.includes(`create table if not exists public.${table}`), `missing table ${table}`);
}
assert.ok(schema.includes("stripe_customer_id"));
assert.ok(schema.includes("stripe_subscription_id"));
assert.ok(schema.includes("job-photos"));
assert.ok(schema.includes("job-documents"));
pass("schema tables + stripe columns + storage bucket names");

// --- CSS safe-area helpers ---
const css = read("src/app/globals.css");
assert.ok(css.includes(".safe-area-app"));
assert.ok(css.includes(".safe-top"));
assert.ok(css.includes(".safe-bottom"));
const nav = read("src/components/dashboard-nav.tsx");
assert.ok(nav.includes("safe-bottom"));
pass("safe-area CSS helpers defined and used");

// --- Recent emails storage key convention ---
const contacts = read("src/components/contact-email-field.tsx");
assert.ok(contacts.includes('fieldreport.recentEmails'));
pass("localStorage uses fieldreport.* dotted prefix");

// --- ReportContent snake_case island documented by presence ---
const types = read("src/lib/types.ts");
assert.ok(types.includes("overall_condition"));
assert.ok(types.includes("logoDataUrl"));
assert.ok(types.includes("stripeCustomerId"));
pass("TS domain camelCase + ReportContent snake_case island + stripe fields");

console.log("Naming conventions OK");
