# Deep smoke analysis — Web + Shipaton

Date: 2026-08-26  
Branch: `cursor/shipaton-revenuecat-cd5d`  
Suite result: **62/62 Playwright + unit scripts PASS** (`npm test`)

---

## Architecture (one product, two shells)

| Surface | What it is | Completeness |
|---------|------------|--------------|
| **Web app** | Next.js App Router (demo + live) | **~95%** product MVP |
| **Shipaton native** | Capacitor WebView (`app.fieldreport.mobile`) loading the same hosted Next.js UI + Camera/Share/RC | **~95%** parity with web |

There are **not** two separate feature codebases. Native is a shell around the web product. Gaps below are either **ops** (deploy/stores) or **device-only** paths Playwright cannot exercise in Chromium.

---

## Smoke verdict (biggest → smallest)

### Tier 1 — Core contractor user stories — PASS (web/demo)

| User story | Result | Evidence |
|------------|--------|----------|
| Sign up → trade onboarding → empty workspace | PASS | smoke + comprehensive |
| Demo login → jobs list → search/filter | PASS | smoke + comprehensive |
| Create job (freeform scope + contacts) | PASS | smoke + launch-readiness |
| Photo + caption + typed note → generate report | PASS | smoke + launch-readiness |
| PDF upload → generate → email compose → customer `/r/[id]` + read receipt | PASS | launch-readiness |
| Regenerate free + version history + dirty-evidence banner | PASS | comprehensive |
| Duplicate / delete job + demo reset | PASS | comprehensive |
| Share copy link + copy report text | PASS | comprehensive |
| Billing plan change (demo) + `SHIPATON-JUDGE` → Pro | PASS | comprehensive |
| Settings (company, phone, logo, trade catalog) | PASS | comprehensive |
| Forgot → demo reset link → set password | PASS | comprehensive + smoke |
| Sign out / protected routes | PASS | smoke + launch-readiness |

### Tier 2 — Pages, nav, links — PASS

| Area | Result | Notes |
|------|--------|-------|
| Landing anchors (How it works / Use cases / Pricing) | PASS | desktop + mobile menu |
| Header Sign in / Start free | PASS | |
| Footer Help → `/help` | PASS | |
| Desktop dashboard nav (Jobs / New / Billing / Settings / Help) | PASS | |
| Mobile bottom nav | PASS | 390×844 viewport |
| `/privacy`, `/terms`, `/help` (+ 7 FAQs) | PASS | deep-smoke asserts processor copy |
| `/login`, `/signup`, `/forgot-password`, `/reset-password` forms | PASS | deep-smoke field inventory |
| 404 + missing job + bad public report | PASS | |
| Public customer report (Priya) | PASS | |

### Tier 3 — Forms, text boxes, interactions — PASS

| Control | Result |
|---------|--------|
| Auth email/password validation | PASS |
| New job fields (name, email, address, scope, notes) | PASS |
| Job workspace editable details + freeform scope catalog | PASS |
| Photo file input + captions | PASS |
| Field notes + attach to photo or job notes | PASS |
| Voice button (unavailable mic → toast or listening) | PASS |
| PDF input + delete | PASS |
| Email compose (to/subject/message/send) | PASS |
| Paste/CSV: new job = first email; compose = multi-recipient | PASS (deep-smoke) |
| Promo input redeem | PASS |
| Settings text inputs + logo file | PASS |

### Tier 4 — Design system (fonts, colors, animation) — PASS

| Token / rule | Expected | Measured |
|--------------|----------|----------|
| `--background` | `#f8fafc` | PASS (deep-smoke) |
| `--foreground` | `#0f172a` | PASS |
| `--primary` / themeColor | `#1d4ed8` | PASS |
| `--muted` / `--border` | `#64748b` / `#e2e8f0` | PASS |
| Font | Geist via `--font-geist-sans` | PASS |
| Hero `.animate-in` | Present | PASS |
| Touch targets | ≥ 44px inputs/buttons | PASS |
| Skip link | Present | PASS |
| Reduced motion | CSS disables animation | Present in `globals.css` (not runtime-asserted) |

### Tier 5 — Use cases / marketing story — PASS

Landing shows trade chips: Roofing, Water Damage, HVAC, General, Move-In/Out, Fence & Deck; sectors block; pricing Free $0 / Starter $29 / Pro $59 / Team $99; testimonials Marcus / Jenny / Dave; problem cards + four-step funnel.

### Tier 6 — Shipaton native shell — PASS (code) / N/A (device)

| Item | Status |
|------|--------|
| Deep link parsing (`fieldreport://`, https) | PASS (`test:native`) |
| Billing helpers / promo / entitlements | PASS (`test:billing`) |
| Offline banner absent while online | PASS (deep-smoke) |
| Capacitor Camera / Share / Network / Keyboard / Splash | Wired in `src/lib/native/*` + plugins — **not runnable in this VM** |
| RevenueCat purchase / restore UI | Code path exists; needs store products + device |
| iOS/Android permissions + icons | Present in platform projects |

---

## Unit / script smoke (non-UI)

| Script | Result |
|--------|--------|
| `test:engine` (all taxonomy templates) | PASS |
| `test:ai` (mocked OpenAI + quota + recipients) | PASS |
| `test:pdf` | PASS |
| `test:billing` | PASS |
| `test:native` | PASS |
| `test:contacts` (paste/CSV parse) | PASS |

---

## Intentionally not green in this environment

These are **not product bugs** relative to demo MVP; they need live keys or a physical/simulator device:

1. Live OpenAI primary reports (suite asserts `taxonomy_fallback` without key)
2. Live Whisper transcription
3. Live Stripe Checkout redirect + webhooks
4. Live RevenueCat purchase/restore
5. Capacitor Camera / Share sheet / Android back / safe-area on device
6. Live Supabase password-reset email (demo token path verified)
7. Team multi-seat org (roadmap)
8. Stripe Customer Portal (documented as missing)

---

## Completeness vs ideation

| Lens | Score | Comment |
|------|-------|---------|
| Web product MVP | **~95%** | Core loop + auth recovery + billing demo solid |
| Native feature parity | **~95%** | Same UI; native plugins wired |
| Contest ops / store submit | **~60–70%** | Deploy URL, RC products, public listing, video, screenshot |

---

## How to re-run

```bash
npm test                 # units + all Playwright (62 e2e)
npx playwright test e2e/deep-smoke.spec.ts
npm run test:native && npm run test:billing && npm run test:contacts
```

New coverage added this pass: `e2e/deep-smoke.spec.ts`, `scripts/test-contacts-parse.ts`, expanded deep-link cases.
