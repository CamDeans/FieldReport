/**
 * Contact paste/CSV parsing — unit smoke.
 * Run: npx tsx scripts/test-contacts-parse.ts
 */
import assert from "node:assert/strict";
import { parseEmailList } from "../src/components/contact-email-field";

assert.deepEqual(parseEmailList("ada@example.com, bob@site.com"), ["ada@example.com", "bob@site.com"]);
assert.deepEqual(parseEmailList("Name,ada@example.com\nBob,bob@site.com"), ["ada@example.com", "bob@site.com"]);
assert.deepEqual(parseEmailList("ada@example.com; ADA@EXAMPLE.COM"), ["ada@example.com"]);
assert.deepEqual(parseEmailList("no emails here"), []);
console.log("PASS contact email parse");
console.log("Contacts helpers OK");
