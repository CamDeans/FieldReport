# FieldReport × RevenueCat Shipaton 2026

FieldReport is packaged as a **Capacitor iOS / Android app** that loads the hosted Next.js backend, with **RevenueCat** powering native in-app subscriptions (Stripe remains for web checkout / Funnel Vision).

Contest page: https://revenuecat-shipaton-2026.devpost.com  
Deadline: **Sep 30, 2026 @ 11:45pm PDT**

## Hard requirements checklist

| Requirement | FieldReport status |
|-------------|-------------------|
| Brand-new first release Aug 1–Sep 30, 2026 | You must publish for the **first time** in that window (do not reuse an old store listing) |
| App Store / Google Play / Galaxy Store URL | Build with Capacitor → archive → submit (see below) |
| RevenueCat SDK for ≥1 IAP (or RC Ads) | `@revenuecat/purchases-capacitor` + webhook `/api/billing/revenuecat/webhook` |
| Built for iOS / Android | `appId`: `app.fieldreport.mobile` |
| Demo video ≤ 2 min | Record on a device after TestFlight / internal testing |
| 1024×1024 icon | `public/shipaton/app-icon-1024.png` |
| Screenshot 1179×2556 (no device frame) | Capture from iPhone 15-class simulator / device |
| Free trial **or** promo for judges | Store free trial + in-app promo `SHIPATON-JUDGE` → Pro |

## Completeness

| Lens | ~% | Notes |
|------|----|-------|
| Web product MVP | **95%** | Full contractor loop + annotated photo reports; remaining: Team seats, Stripe portal, offline queue |
| Native Shipaton shell | **95%** | Parity with web + Camera/Share/deep links/offline banner/password reset/RC IAP + annotated report UI via hosted WebView |
| Contest ops / store submit | **60–70%** | Deploy URL, RC products, public store release, video, screenshot still on you |

## Architecture

```
iOS / Android (Capacitor WebView)
   └─ loads NEXT_PUBLIC_APP_URL / CAPACITOR_SERVER_URL
         ├─ Auth cookies (same-origin) + forgot/reset password
         ├─ Native: Camera, Share, Network, Keyboard, deep links, back button
         ├─ Billing UI
         │    ├─ Native → RevenueCat purchasePackage → POST /api/billing/revenuecat/sync
         │    └─ Web → Stripe Checkout (+ trial days)
         └─ RevenueCat server webhooks → changePlan(userId, plan)
```

## One-time dashboard setup (you)

1. **Apple Developer** + **Google Play Console** accounts.
2. Create app `FieldReport` with bundle / application id `app.fieldreport.mobile`.
3. Create auto-renewing subscriptions:
   - `fieldreport_starter_monthly` ($29)
   - `fieldreport_pro_monthly` ($59)
   - `fieldreport_team_monthly` ($99)
   - Attach a **7-day free trial** (or intro offer) on each.
4. Create a **RevenueCat** project, add iOS + Android apps, import products.
5. Create entitlements: `starter`, `pro`, `team` and attach products.
6. Create a default **Offering** with those packages.
7. Copy public SDK keys → env:
   - `NEXT_PUBLIC_REVENUECAT_IOS_KEY`
   - `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`
8. Add RevenueCat webhook → `https://YOUR_DOMAIN/api/billing/revenuecat/webhook`  
   Authorization header = `REVENUECAT_WEBHOOK_SECRET` (Bearer supported).
9. Set `app_user_id` = FieldReport user id (SDK `logIn` after auth — already wired).

## Env additions

See `.env.example`. Critical:

```
NEXT_PUBLIC_APP_URL=https://your-deployed-fieldreport.com
CAPACITOR_SERVER_URL=https://your-deployed-fieldreport.com
NEXT_PUBLIC_REVENUECAT_IOS_KEY=appl_...
NEXT_PUBLIC_REVENUECAT_ANDROID_KEY=goog_...
REVENUECAT_WEBHOOK_SECRET=your_shared_secret
STRIPE_TRIAL_DAYS=7
```

## Native build commands

```bash
# Deploy the Next.js app first (Vercel / Fly / etc.) so CAPACITOR_SERVER_URL is live

npm run build
npm run cap:sync

# Android (Linux/macOS)
npm run cap:open:android
# Build signed AAB in Android Studio → upload to Play Console (internal test → production)

# iOS (macOS + Xcode required)
npm run cap:open:ios
# Archive → TestFlight → App Store review
```

First public release must fall inside the Shipaton window.

## Judge access

- Promo code **`SHIPATON-JUDGE`** unlocks **Pro** (also `SHIPATON2026`).
- Or start a paid plan free trial from Billing.
- Demo mode works without store credentials for video recording.

## Devpost submission pack

Already in repo:

- Icon: `public/shipaton/app-icon-1024.png`
- Description draft: section below
- Privacy / Terms: `/privacy`, `/terms` (update contact + processors before review)

Still capture yourself:

- Store listing URL after approval
- YouTube/Vimeo demo ≤ 2:00 showing job → photo/voice → generate → email on a phone
- One screenshot at **1179 × 2556**, no bezel

### Suggested Devpost description

> FieldReport turns job-site photos and voice notes into insurer-ready branded reports in minutes. Contractors upload reference PDFs, capture findings by voice or text, and email customers from the phone. Monetized with RevenueCat subscriptions (Starter / Pro / Team) and a free tier. Built for roofers, HVAC, restoration, and any trade.

## Categories that fit

- **HAMM** — clear free → paid report limits + RC subscriptions  
- **Funnel Vision (Stripe)** — keep web Stripe funnel + RC Funnels if you wire it  
- **#BuildInPublic** — post the Capacitor + RC journey  
- **Design** — if you polish motion / branding further  

## Not automatic

Publishing to the stores, Apple/Google review, and the first release date are **manual** — this repo gets you submission-ready code and assets, not the store URL itself.

## Deep product alignment

See **[SHIPATON-ANALYSIS.md](./SHIPATON-ANALYSIS.md)** for ideation ↔ web ↔ native parity (~95% each) and remaining deploy/store ops.
