/**
 * Pre-credential / pre-deploy launch checklist.
 * Does not call external APIs — inspects env + critical repo files.
 *
 *   npm run check:launch          # advisory (exit 0 with warnings)
 *   npm run check:launch -- --strict  # exit 1 if live-ready gaps remain
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const strict = process.argv.includes("--strict");

type Finding = { level: "ok" | "warn" | "fail"; message: string };

function env(name: string) {
  const v = process.env[name]?.trim();
  if (!v) return null;
  if (/^your[-_]|placeholder|example|xxx|changeme/i.test(v)) return null;
  return v;
}

function isReal(name: string) {
  return Boolean(env(name));
}

const findings: Finding[] = [];

function ok(message: string) {
  findings.push({ level: "ok", message });
}
function warn(message: string) {
  findings.push({ level: "warn", message });
}
function fail(message: string) {
  findings.push({ level: "fail", message });
}

// --- Repo artifacts required for store / deploy ---
const requiredFiles = [
  "supabase/schema.sql",
  ".env.example",
  "NAMING-CONVENTIONS.md",
  "SHIPATON.md",
  "SMOKE-MATRIX.md",
  "capacitor.config.ts",
  "public/icon-1024.png",
  "public/shipaton/app-icon-1024.png",
  "www/index.html",
  "ios/App/App/Info.plist",
  "android/app/src/main/AndroidManifest.xml",
];

for (const rel of requiredFiles) {
  if (existsSync(path.join(root, rel))) ok(`present ${rel}`);
  else fail(`missing ${rel}`);
}

// --- Env posture ---
const hasSupabase = isReal("NEXT_PUBLIC_SUPABASE_URL") && isReal("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const hasServiceRole = isReal("SUPABASE_SERVICE_ROLE_KEY");
const hasOpenAi = isReal("OPENAI_API_KEY");
const hasStripe = isReal("STRIPE_SECRET_KEY");
const hasStripePrices =
  isReal("STRIPE_PRICE_STARTER") && isReal("STRIPE_PRICE_PRO") && isReal("STRIPE_PRICE_TEAM");
const hasResend = isReal("RESEND_API_KEY");
const hasRc =
  isReal("NEXT_PUBLIC_REVENUECAT_IOS_KEY") || isReal("NEXT_PUBLIC_REVENUECAT_ANDROID_KEY");
const hasRcWebhook = isReal("REVENUECAT_WEBHOOK_SECRET");
const appUrl = env("NEXT_PUBLIC_APP_URL");
const capUrl = env("CAPACITOR_SERVER_URL");

if (!hasSupabase) {
  warn("Demo mode — set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY for live");
} else {
  ok("Supabase public credentials present (live mode gate)");
  if (!hasServiceRole) fail("Live mode needs SUPABASE_SERVICE_ROLE_KEY");
  else ok("SUPABASE_SERVICE_ROLE_KEY present");
}

if (!hasOpenAi) warn("OPENAI_API_KEY unset — reports use taxonomy_fallback only");
else ok("OPENAI_API_KEY present (AI-primary reports)");

if (!hasResend) warn("RESEND_API_KEY unset — email logs in demo / fails silently in live send path");
else ok("RESEND_API_KEY present");

if (!hasStripe) warn("STRIPE_SECRET_KEY unset — web checkout stays demo/instant");
else {
  ok("STRIPE_SECRET_KEY present");
  if (!isReal("STRIPE_WEBHOOK_SECRET")) fail("Stripe live needs STRIPE_WEBHOOK_SECRET");
  if (!hasStripePrices) fail("Stripe live needs STRIPE_PRICE_STARTER/PRO/TEAM");
  else ok("Stripe price IDs present");
}

if (!hasRc) warn("RevenueCat public keys unset — native IAP will not configure");
else ok("RevenueCat public SDK key present");
if (!hasRcWebhook) warn("REVENUECAT_WEBHOOK_SECRET unset — store purchases won’t sync via webhook");
else ok("REVENUECAT_WEBHOOK_SECRET present");

if (!appUrl) warn("NEXT_PUBLIC_APP_URL unset — defaults to http://localhost:3000");
else if (appUrl.startsWith("http://") && !/localhost|127\.0\.0\.1/.test(appUrl)) {
  fail(`NEXT_PUBLIC_APP_URL should be HTTPS in production (got ${appUrl})`);
} else if (appUrl.includes("localhost")) {
  warn("NEXT_PUBLIC_APP_URL is localhost — fine for local, not for store builds");
} else {
  ok(`NEXT_PUBLIC_APP_URL=${appUrl}`);
}

if (!capUrl) warn("CAPACITOR_SERVER_URL unset — cap sync falls back to NEXT_PUBLIC_APP_URL / placeholder");
else if (capUrl.includes("localhost") || capUrl.includes("app.fieldreport.app")) {
  warn(`CAPACITOR_SERVER_URL=${capUrl} — set to YOUR deployed HTTPS origin before archive`);
} else {
  ok(`CAPACITOR_SERVER_URL=${capUrl}`);
}

// Capacitor config placeholder check
const capSrc = readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
if (capSrc.includes("https://app.fieldreport.app")) {
  warn("capacitor.config.ts still has app.fieldreport.app fallback — override with CAPACITOR_SERVER_URL before store archive");
}

// Schema buckets documented
const schema = readFileSync(path.join(root, "supabase/schema.sql"), "utf8");
assert.ok(schema.includes("job-photos") && schema.includes("job-documents"));
ok("schema documents job-photos + job-documents buckets");

const fails = findings.filter((f) => f.level === "fail");
const warns = findings.filter((f) => f.level === "warn");
const oks = findings.filter((f) => f.level === "ok");

for (const f of findings) {
  const tag = f.level === "ok" ? "OK  " : f.level === "warn" ? "WARN" : "FAIL";
  console.log(`${tag}  ${f.message}`);
}

console.log("");
console.log(`Launch check: ${oks.length} ok, ${warns.length} warn, ${fails.length} fail`);
console.log(hasSupabase ? "Mode posture: LIVE-capable (if fails=0)" : "Mode posture: DEMO (expected before credentials)");
console.log("See LAUNCH.md for the ordered go-live runbook.");

if (fails.length && strict) process.exit(1);
if (strict && (warns.length || fails.length) && hasSupabase) process.exit(1);
