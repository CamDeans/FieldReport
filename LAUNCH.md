# FieldReport — Complete launch & deploy playbook

**Single source of truth for going live.**  
Related: `.env.example` · `NAMING-CONVENTIONS.md` · `SMOKE-MATRIX.md` · `SHIPATON.md` · `USER-STORY-SMOKE-FINDINGS.md`

**App id (native):** `app.fieldreport.mobile`  
**Live mode gate:** real `NEXT_PUBLIC_SUPABASE_URL` **and** `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
**Health probe:** `GET https://YOUR_DOMAIN/api/health` → expect `"mode":"live"` when Supabase is set

---

## 0. What “live” means

| Layer | Demo (now) | Live (goal) |
|-------|------------|-------------|
| Auth / DB | `.fieldreport/` on disk | Supabase Auth + Postgres + Storage |
| Reports | Taxonomy fallback (or OpenAI if key set) | OpenAI primary + taxonomy fail-safe |
| Email | Logged / queued in demo | Resend delivery |
| Web billing | Instant plan flip | Stripe Checkout + webhook |
| Native billing | Promo codes only | RevenueCat + App Store / Play |
| Shell | Safari / localhost / tunnel | Capacitor app → your HTTPS URL |

**Order matters:** credentials → web deploy (HTTPS) → point Capacitor at that URL → store archives → smoke → Shipaton submit.

---

## 1. Preflight (no credentials required)

Run from the repo:

```bash
npm run check:launch    # expect WARNs for missing keys, 0 FAIL
npm run build
npm test                # demo smoke (83+ Playwright + units)
```

Confirm these exist: `supabase/schema.sql`, `.env.example`, `capacitor.config.ts`, `ios/`, `android/`, `public/shipaton/app-icon-1024.png`.

---

## 2. Choose your production domain

Pick a stable HTTPS origin, e.g. `https://app.yourdomain.com` or a Vercel URL.

You will set **both**:

```bash
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
CAPACITOR_SERVER_URL=https://YOUR_DOMAIN
```

Never ship store builds still pointing at `localhost` or the placeholder `https://app.fieldreport.app`.

---

## 3. Account setup (do in this order)

### 3.1 Supabase (auth + database + files) — required for live mode

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → run entire `supabase/schema.sql` (tables, RLS, trigger for new users).
3. **Storage** → create two **private** buckets:
   - `job-photos`
   - `job-documents`  
   (Signed URLs are used by the app; do not make them public.)
4. **Project Settings → API** copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (**server only — never expose to the client**)
5. **Authentication → URL configuration**
   - Site URL: `https://YOUR_DOMAIN`
   - Redirect URLs (add all that apply):
     - `https://YOUR_DOMAIN/reset-password`
     - `https://YOUR_DOMAIN/**` (optional catch-all while testing)
     - For local: `http://localhost:3000/reset-password`
6. Optional: confirm email templates / disable email confirm if you want password signup without mailbox delay during QA.

**Smoke:** After deploy with these three vars set, `/api/health` → `mode: live`, `checks.supabaseLive: true`.

---

### 3.2 OpenAI (AI reports, Whisper, PDF OCR, suggest scope) — strongly recommended

1. Create key at [platform.openai.com](https://platform.openai.com).
2. Set `OPENAI_API_KEY=sk-...`
3. Without it, app still runs but `reportEngine` stays `taxonomy_fallback` (not Shipaton-quality AI demos).

**Used by:** `/api/jobs/[id]/generate-report`, `/api/transcribe`, `/api/jobs/suggest-scope`, PDF OCR in document upload.

---

### 3.3 Resend (customer email) — required for real send

1. Create account at [resend.com](https://resend.com).
2. Verify your sending domain (or use Resend’s onboarding domain for early tests).
3. Create API key → `RESEND_API_KEY`
4. Set from address you are allowed to send as:
   ```bash
   RESEND_FROM_EMAIL=FieldReport <reports@yourdomain.com>
   ```

**Smoke:** Compose → Send on a job → inbox receives HTML + customer link.

---

### 3.4 Stripe (web subscriptions) — required for web paid plans

1. [Stripe Dashboard](https://dashboard.stripe.com) → create Products + recurring Prices:
   - Starter **$29/mo**
   - Pro **$59/mo**
   - Team **$99/mo**
2. Optional: attach a **7-day trial** on each Price (or rely on `STRIPE_TRIAL_DAYS=7` in Checkout).
3. Copy Price IDs:
   ```bash
   STRIPE_SECRET_KEY=sk_live_...   # or sk_test_... while testing
   STRIPE_PRICE_STARTER=price_...
   STRIPE_PRICE_PRO=price_...
   STRIPE_PRICE_TEAM=price_...
   STRIPE_TRIAL_DAYS=7
   ```
4. **Developers → Webhooks** → endpoint:
   - URL: `https://YOUR_DOMAIN/api/billing/webhook`
   - Events: at least `checkout.session.completed`
   - Signing secret → `STRIPE_WEBHOOK_SECRET=whsec_...`
5. Success / cancel URLs are built as:
   - `https://YOUR_DOMAIN/dashboard/billing?checkout=success&plan=...`
   - `https://YOUR_DOMAIN/dashboard/billing?checkout=cancel`

**Smoke:** Billing → Choose Pro → Stripe Checkout (test card) → return → plan updates; webhook writes `stripe_customer_id` / `stripe_subscription_id`.

---

### 3.5 Apple Developer + Google Play (store apps)

1. Enroll in **Apple Developer Program** and **Google Play Console**.
2. Create apps named **FieldReport**:
   - iOS bundle id / Android application id: **`app.fieldreport.mobile`**
3. Create **auto-renewing subscriptions** (must match defaults unless you override env):

| Plan | Store / RC product id (default) | Price |
|------|----------------------------------|-------|
| Starter | `fieldreport_starter_monthly` | $29 |
| Pro | `fieldreport_pro_monthly` | $59 |
| Team | `fieldreport_team_monthly` | $99 |

4. Attach a **free trial** (e.g. 7 days) or intro offer on each (Shipaton requirement: trial **or** promo — you have both if you keep `SHIPATON-JUDGE`).
5. Complete App Privacy / Data safety questionnaires (camera, mic, photos, purchases).

---

### 3.6 RevenueCat (native IAP) — required for Shipaton / iOS–Android billing

1. Create project at [revenuecat.com](https://www.revenuecat.com).
2. Add **iOS** and **Android** apps linked to `app.fieldreport.mobile`.
3. Import / create products matching the store product ids above (or set overrides):
   ```bash
   NEXT_PUBLIC_REVENUECAT_PRODUCT_STARTER=...
   NEXT_PUBLIC_REVENUECAT_PRODUCT_PRO=...
   NEXT_PUBLIC_REVENUECAT_PRODUCT_TEAM=...
   ```
4. Create **entitlements:** `starter`, `pro`, `team` — attach products.
5. Create a **current Offering** with those packages.
6. Copy **public** SDK keys:
   ```bash
   NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_...
   NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
   ```
7. **Integrations → Webhooks**:
   - URL: `https://YOUR_DOMAIN/api/billing/revenuecat/webhook`
   - Authorization: shared secret → `REVENUECAT_WEBHOOK_SECRET`  
     (app accepts raw secret or `Bearer <secret>`)
8. App already calls `Purchases.logIn(userId)` after auth so `app_user_id` = FieldReport user id.

**Builtin promos (no store purchase):**

| Code | Plan |
|------|------|
| `SHIPATON-JUDGE` | Pro |
| `SHIPATON2026` | Pro |
| `FIELDREPORT-TRIAL` | Starter |

Optional extras via `PROMO_CODES=CODE:plan,...` (e.g. `EXTRA:pro`).

---

### 3.7 Optional: temporary HTTPS tunnel (device Safari QA before real domain)

Useful to exercise cookies / sign-in on a phone before Vercel is ready. Not a substitute for production.

```bash
npm run build && npm run start -- -H 0.0.0.0 -p 3000
# then e.g. cloudflared tunnel --url http://localhost:3000
```

Add the tunnel URL to Supabase redirect allow-list while testing. Demo login (local demo store only): see README. Tunnel ≠ TestFlight Capacitor binary.

---

## 4. Environment file checklist

Copy `.env.example` → host secrets (Vercel env / `.env.production` / platform secrets). Fill:

```bash
# Live gate
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
OPENAI_API_KEY=

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=FieldReport <reports@yourdomain.com>

# Web billing
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_TEAM=
STRIPE_TRIAL_DAYS=7

# Native billing
NEXT_PUBLIC_REVENUECAT_IOS_KEY=
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=
REVENUECAT_WEBHOOK_SECRET=
# optional product overrides…
# NEXT_PUBLIC_REVENUECAT_PRODUCT_STARTER=
# NEXT_PUBLIC_REVENUECAT_PRODUCT_PRO=
# NEXT_PUBLIC_REVENUECAT_PRODUCT_TEAM=

# Origin (must be HTTPS in production)
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
CAPACITOR_SERVER_URL=https://YOUR_DOMAIN

# optional
# PROMO_CODES=EXTRA:pro
```

**Rules:** never put service role / Stripe secret / OpenAI / Resend / webhook secrets in `NEXT_PUBLIC_*`.

Validate:

```bash
npm run check:launch -- --strict
```

---

## 5. Deploy the web app (HTTPS)

### Option A — Vercel (repo includes `vercel.json`)

1. Import the Git repo in Vercel.
2. Paste all env vars in Project → Settings → Environment Variables (Production).
3. Deploy.
4. Attach custom domain if desired → that domain becomes `YOUR_DOMAIN`.
5. Re-check Supabase redirect URLs and Stripe/RC webhooks use the **final** domain.

### Option B — Any Node host

```bash
npm ci
npm run build
npm run start    # or process manager / Docker behind HTTPS reverse proxy
```

### Post-deploy probes

```bash
curl -s https://YOUR_DOMAIN/api/health | jq
# expect: status ok, mode live, openai/stripe/resend/revenuecat true as configured

curl -s https://YOUR_DOMAIN/api/config | jq
# expect: mode live, reportEngine openai (if OPENAI set)
```

Open in browser: `/` → Sign up → complete trade onboarding → create job.

---

## 6. Wire webhooks to the live domain

| Provider | Endpoint | Secret env |
|----------|----------|------------|
| Stripe | `https://YOUR_DOMAIN/api/billing/webhook` | `STRIPE_WEBHOOK_SECRET` |
| RevenueCat | `https://YOUR_DOMAIN/api/billing/revenuecat/webhook` | `REVENUECAT_WEBHOOK_SECRET` |

Send a test event from each dashboard; confirm 2xx and plan updates in the app.

---

## 7. Native / Capacitor build (after HTTPS is live)

On a machine with Xcode (iOS) and/or Android Studio:

```bash
export NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN
export CAPACITOR_SERVER_URL=https://YOUR_DOMAIN

npm ci
npm run build
npm run cap:sync

npm run cap:open:ios       # Archive → TestFlight → App Store
npm run cap:open:android   # Signed AAB → Play internal → production
```

Confirm after sync:

- iOS `Info.plist` camera / mic / photo usage strings  
- Android CAMERA / RECORD_AUDIO / media permissions  
- Deep link scheme `fieldreport://`  
- Splash / icons from branded assets  

**Important:** The WebView loads your **hosted** Next.js app. Redeploying the web app updates native without a store resubmit for most UI changes; change `CAPACITOR_SERVER_URL` only when the origin changes, then `cap sync` + new binary.

---

## 8. Go-live smoke sequence

### 8.1 Automated (from a machine with env loaded)

```bash
npm run check:launch -- --strict
npm run build
npm test

# Live Playwright (needs a real user in Supabase)
RUN_LIVE_SMOKE=1 \
  LIVE_SMOKE_EMAIL='you@yourdomain.com' \
  LIVE_SMOKE_PASSWORD='…' \
  npm run test:e2e:live
```

### 8.2 Manual web checklist

1. Sign up new user → onboarding → empty jobs  
2. Create job → upload photo + PDF → typed note → **Generate** (OpenAI prose)  
3. Regenerate after another note → version bumps, no extra quota burn  
4. Email customer → Resend inbox + open `/r/[id]` → read receipt  
5. Forgot password → email link → reset works  
6. Billing → Stripe Checkout test → plan updates  
7. Promo `SHIPATON-JUDGE` → Pro; `FIELDREPORT-TRIAL` → Starter (optional)  
8. Settings logo/company appear on public report  

### 8.3 Manual device checklist (TestFlight / internal track)

1. Cold launch → splash → login  
2. Camera multi-photo + mic permission → voice note (Whisper)  
3. Offline banner (airplane mode)  
4. Share sheet for customer link  
5. Deep link `fieldreport://dashboard/billing`  
6. Purchase / restore via RevenueCat  
7. Android back button behavior  

---

## 9. Shipaton 2026 contest packaging

Contest: https://revenuecat-shipaton-2026.devpost.com · Deadline **Sep 30, 2026 @ 11:45pm PDT**

| Requirement | Action |
|-------------|--------|
| First public release in Aug 1–Sep 30 2026 | New listing; do not reuse an old app |
| Store URL | After App Store / Play approval |
| RevenueCat SDK | Already wired |
| Demo video ≤ 2 min | Record on device: job → photo/voice → generate → email |
| Icon 1024×1024 | `public/shipaton/app-icon-1024.png` |
| Screenshot 1179×2556 | No device frame |
| Trial or promo | Store trial + `SHIPATON-JUDGE` |

Full store steps: `SHIPATON.md`.

---

## 10. Operational checklist (print / tick)

- [ ] Domain chosen; HTTPS certificate live  
- [ ] Supabase schema applied; buckets `job-photos` + `job-documents` private  
- [ ] Supabase redirect URLs include `/reset-password`  
- [ ] `OPENAI_API_KEY` set; generate uses AI  
- [ ] Resend domain + from-address verified  
- [ ] Stripe prices + webhook live  
- [ ] RevenueCat apps, products, entitlements, offering, webhook  
- [ ] Apple / Play apps `app.fieldreport.mobile` + subscriptions + trials  
- [ ] All env vars on the host; `check:launch -- --strict` clean  
- [ ] `/api/health` → `mode: live`  
- [ ] Web smoke (8.2) green  
- [ ] `cap sync` with production `CAPACITOR_SERVER_URL`  
- [ ] TestFlight / Play internal smoke (8.3) green  
- [ ] Public store release + Devpost (if competing)  

---

## 11. Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| `/api/health` still `mode: demo` | Missing/placeholder Supabase URL or anon key |
| Generate is generic / no vision | `OPENAI_API_KEY` unset or invalid |
| Email “sent” but no inbox | Resend domain / from address not verified |
| Stripe returns to site but plan unchanged | Webhook URL/secret wrong or event not `checkout.session.completed` |
| Native blank / wrong site | `CAPACITOR_SERVER_URL` not set before `cap sync` |
| Reset password link fails | Supabase redirect URL allow-list missing your domain |
| RC purchase doesn’t upgrade | Webhook secret, entitlement ids (`starter`/`pro`/`team`), or `logIn` user id mismatch |
| PDF “Weak alignment” | Blank/scan PDF without OpenAI OCR |

---

## 12. Quick command cheat sheet

```bash
npm run check:launch
npm run check:launch -- --strict
npm run build && npm run start
npm test
npm run test:e2e:live          # with RUN_LIVE_SMOKE=1 + LIVE_SMOKE_* 
npm run cap:sync
npm run cap:open:ios
npm run cap:open:android
curl -s https://YOUR_DOMAIN/api/health | jq
curl -s https://YOUR_DOMAIN/api/config | jq
```

When in doubt: **credentials → HTTPS web → webhooks → Capacitor sync → device smoke → store submit.**
