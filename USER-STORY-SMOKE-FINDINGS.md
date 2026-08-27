# Deep user-story smoke findings

Date: 2026-08-26  
Environment: **DEMO** (`mode:demo`, OpenAI/Stripe/Resend/RevenueCat/Supabase all **false**)  
Report engine: **taxonomy_fallback** (OpenAI unset — expected pre-credentials)  
Automated: **83/83 Playwright PASS** + unit scripts PASS  
Manual walkthrough: **25 PASS / 0 FAIL** (2 skipped, 1 partial)

---

## Sequence 0 — Environment posture

| Step | Check | Result |
|------|-------|--------|
| 0.1 | `npm run check:launch` | **PASS** — 12 OK, 9 WARN (credentials), 0 FAIL |
| 0.2 | `GET /api/health` | **PASS** — `status:ok`, `mode:demo` |
| 0.3 | `GET /api/config` | **PASS** — `reportEngine: taxonomy_fallback`, openai/stripe/resend/revenuecat false |
| 0.4 | Database | **DEMO store** `.fieldreport/` (not live Supabase) — **PASS for demo**; live DB **NOT exercised** |
| 0.5 | OpenAI primary path | **NOT EXERCISED** (no key) — fallback path verified |

---

## Sequence 1 — Public marketing (nav, links, brand, animation)

| Step | User story | Result | Notes |
|------|------------|--------|-------|
| 1.1 | Open `/` | **PASS** | FieldReport brand + hero |
| 1.2 | Hero “customer-ready report” + primary blue | **PASS** | Design tokens `#1d4ed8` |
| 1.3 | Nav → How it works | **PASS** | `#how-it-works` |
| 1.4 | Nav → Use cases | **PASS** | Trade chips / sectors |
| 1.5 | Nav → Pricing | **PASS** | Free / Starter / Pro / Team |
| 1.6 | CTAs Start free / Try free | **PASS** (automated) | → signup |
| 1.7 | Footer Privacy | **PASS** | Processors + camera/mic copy |
| 1.8 | Footer Terms | **PASS** (automated) | Stripe / store billing |
| 1.9 | Footer / nav Help | **PASS** | FAQs expand |
| 1.10 | Mobile hamburger → Pricing | **PASS** | 390×844 |
| 1.11 | 404 `/missing-page` | **PASS** (automated) | Home recovery |
| 1.12 | Animation `.animate-in` | **PASS** (automated) | |
| 1.13 | Skip link / 44px targets | **PASS** (automated) | |

---

## Sequence 2 — Auth (forms, password reset)

| Step | User story | Result | Notes |
|------|------------|--------|-------|
| 2.1 | `/login` fields Email/Password | **PASS** | |
| 2.2 | Demo credentials shown | **PASS** | |
| 2.3 | Password required validation | **PASS** (automated) | |
| 2.4 | Wrong password toast | **PASS** (automated) | |
| 2.5 | Demo sign-in → dashboard | **PASS** | |
| 2.6 | Signup isolated workspace | **PASS** (automated) | |
| 2.7 | Trade onboarding 3-step | **PASS** (automated) | |
| 2.8 | Forgot password form | **PASS** | |
| 2.9 | Demo reset link → set password | **PASS** (automated) | |
| 2.10 | Reset password mismatch | **PASS** (automated) | |
| 2.11 | Live Supabase email reset | **N/A** | Needs live credentials |
| 2.12 | Protected `/dashboard` → login | **PASS** (automated) | |
| 2.13 | Sign out | **PASS** (automated + partial manual) | |

---

## Sequence 3 — Dashboard (search, filters, nav)

| Step | User story | Result | Notes |
|------|------------|--------|-------|
| 3.1 | Demo banner | **PASS** | |
| 3.2 | Jobs list Sarah / Luis / Priya | **PASS** | |
| 3.3 | Search “Harbor” → Luis | **PASS** | |
| 3.4 | Status Ready → Priya | **PASS** | |
| 3.5 | Empty filter state | **PASS** (automated) | |
| 3.6 | Desktop nav Jobs/New/Billing/Settings/Help | **PASS** | |
| 3.7 | Mobile bottom nav | **PASS** (automated) | Manual skipped viewport |
| 3.8 | Demo reset restores samples | **PASS** (automated) | |

---

## Sequence 4 — Job workspace (photos, notes, mic, PDF, generate)

| Step | User story | Result | Notes |
|------|------------|--------|-------|
| 4.1 | Open Sarah Johnson | **PASS** | |
| 4.2 | Controls: PDF, photos, notes, voice, generate, email, print, copy, duplicate, delete | **PASS** | All present |
| 4.3 | Add photo (file input) | **PASS** (automated) | Native Camera **N/A** in browser |
| 4.4 | Caption field | **PASS** (automated) | |
| 4.5 | Typed field note + Attach | **PASS** | Manual + automated |
| 4.6 | Note → job notes when no photo | **PASS** (automated) | |
| 4.7 | Photo note-target picker | **PASS** (automated) | |
| 4.8 | Record voice / microphone | **PASS (degraded)** | Permission denied / unavailable in headless — toast OK; Whisper **N/A** without OpenAI |
| 4.9 | Upload text PDF | **PASS** (automated) | |
| 4.10 | Empty PDF → weak alignment badge | **PASS** (automated) | |
| 4.11 | Oversized PDF rejected (~8MB) | **PASS** (automated) | |
| 4.12 | Generate report | **PASS** | Taxonomy fallback (no OpenAI) |
| 4.13 | OpenAI vision / primary prose | **N/A** | Needs `OPENAI_API_KEY` |
| 4.14 | Regenerate free + version history | **PASS** (automated) | |
| 4.15 | Evidence dirty banner | **PASS** (automated) | |
| 4.16 | Suggest scope without OpenAI | **PASS** (automated) | Explains not configured |
| 4.17 | Suggest scope with OpenAI | **N/A** | Live smoke only |
| 4.18 | Duplicate job | **PASS** (automated) | |
| 4.19 | Delete job | **PASS** (automated) | |
| 4.20 | Invalid job id | **PASS** (automated) | |
| 4.21 | Free plan quota limit banner | **PASS** (automated) | After 3 reports |

---

## Sequence 5 — Email & share

| Step | User story | Result | Notes |
|------|------------|--------|-------|
| 5.1 | Email compose opens | **PASS** | |
| 5.2 | To / subject / message fields | **PASS** | |
| 5.3 | Paste/CSV multi-recipient | **PASS** (automated) | |
| 5.4 | Contact picker button | **PASS** (visible) | Real pick **N/A** in desktop Chromium |
| 5.5 | Send (demo queue) | **PASS** (automated) | Resend live delivery **N/A** |
| 5.6 | Copy customer link | **PASS** | |
| 5.7 | Copy report text | **PASS** (automated) | |
| 5.8 | Print invokes `window.print` | **PASS** (automated) | |
| 5.9 | Native Share sheet | **N/A** | Device only |

---

## Sequence 6 — Customer public report

| Step | User story | Result | Notes |
|------|------------|--------|-------|
| 6.1 | Customer view `/r/[id]` | **PASS** | |
| 6.2 | Read receipt recorded | **PASS** (automated) | |
| 6.3 | Logo branding on public report | **PASS** (automated) | |
| 6.4 | Invalid report id | **PASS** | “Report unavailable” |

---

## Sequence 7 — Billing & promo

| Step | User story | Result | Notes |
|------|------------|--------|-------|
| 7.1 | Plans Free/Starter/Pro/Team UI | **PASS** | |
| 7.2 | Demo plan activate | **PASS** (automated) | |
| 7.3 | `SHIPATON-JUDGE` → Pro | **PASS** (automated) | |
| 7.4 | `FIELDREPORT-TRIAL` → Starter | **PASS** (automated) | |
| 7.5 | Checkout cancel toast | **PASS** (automated) | |
| 7.6 | Checkout success toast | **PASS** (automated) | |
| 7.7 | Live Stripe Checkout redirect | **N/A** | Needs Stripe keys |
| 7.8 | RevenueCat purchase/restore | **N/A** | Device + RC keys; restore hidden on web **PASS** |

---

## Sequence 8 — Settings & help

| Step | User story | Result | Notes |
|------|------------|--------|-------|
| 8.1 | Company / phone / save | **PASS** | |
| 8.2 | Logo upload | **PASS** (automated) | |
| 8.3 | Trade catalog save | **PASS** (automated) | |
| 8.4 | Help sections + 7 FAQs | **PASS** (automated) | |

---

## Sequence 9 — Platform / Shipaton / APIs

| Step | User story | Result | Notes |
|------|------------|--------|-------|
| 9.1 | Offline banner (browser offline) | **PASS** (automated) | |
| 9.2 | Unauthenticated API 401 | **PASS** (automated) | |
| 9.3 | Webhook signature guards | **PASS** (automated) | |
| 9.4 | Deep link parsing | **PASS** (unit + harness) | |
| 9.5 | Naming / env conventions | **PASS** | |
| 9.6 | Capacitor Camera / deep link on device | **N/A** | Manual device |
| 9.7 | Live Supabase persistence | **N/A** | Needs credentials |

---

## Verdict

**Demo end-to-end user stories: GREEN.** Every navigable surface, form, button path, PDF/text/email/share loop, and fallback AI path works.

**Not green until credentials + device:**
1. OpenAI primary reports / Whisper / OCR / suggest-scope success  
2. Supabase live database + live password email  
3. Resend real inbox delivery  
4. Stripe Checkout  
5. RevenueCat IAP + Camera/Share on phone  

Next: wire keys per `LAUNCH.md`, then `RUN_LIVE_SMOKE=1` + device checklist.
