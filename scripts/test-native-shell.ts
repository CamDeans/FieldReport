/**
 * Native shell helpers — no device required.
 * Run: npx tsx scripts/test-native-shell.ts
 */
import assert from "node:assert/strict";
import { pathFromDeepLink } from "../src/lib/native/deep-link";

assert.equal(pathFromDeepLink("fieldreport://dashboard/billing"), "/dashboard/billing");
assert.equal(pathFromDeepLink("fieldreport://r/abc"), "/r/abc");
assert.equal(pathFromDeepLink("fieldreport:///reset-password?token=abc"), "/reset-password?token=abc");
assert.equal(pathFromDeepLink("fieldreport://dashboard/jobs/job_1"), "/dashboard/jobs/job_1");
assert.equal(pathFromDeepLink("https://app.example.com/dashboard/jobs/1?x=1"), "/dashboard/jobs/1?x=1");
assert.equal(pathFromDeepLink("https://app.example.com/"), "/");
assert.equal(pathFromDeepLink("not a url"), null);
console.log("PASS deep link parsing");
console.log("Native shell helpers OK");

