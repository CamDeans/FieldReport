# Shipaton ↔ full product deep analysis

Date: 2026-08-26  
Branch: `cursor/shipaton-revenuecat-cd5d`  
Contest: [RevenueCat Shipaton 2026](https://revenuecat-shipaton-2026.devpost.com)

## Executive verdict

**Product ideation (web): ~95% of the intended MVP is built and demo-testable.**  
**Shipaton native shell: ~95% feature parity with web** (same UI + camera/mic/share/deep links/password reset/offline banner).  

Remaining ~5% is **deploy + store publishing** (credentials, first public listing, demo video, screenshot) — not missing product ideation.

---

## 1. Ideation vs shipped web product

| Ideation (`.cursorrules`) | Web status | Notes |
|---------------------------|------------|-------|
| Photo → voice/notes → branded report | Complete | Job workspace E2E |
| AI-first OpenAI reports + vision | Complete | Taxonomy fail-safe only |
| Freeform scopes / any trade | Complete | Catalog = shortcuts |
| Reference PDF + alignment / OCR | Complete | `ensurePdfText` + vision OCR |
| Voice Whisper + typed fallback | Complete | |
| Email compose + contacts | Complete | Resend live / demo log |
| Demo = live UI parity | Complete | Same `/api/*` |
| Free/Starter/Pro/Team limits | Complete | Count enforced; feature marketing softened |
| Regenerates free + version history | Complete | |
| Team multi-user org | **Not built** | Honest copy: “multi-seat coming soon” |
| Google/iCloud contacts OAuth | Out of MVP | Paste/CSV + Contact Picker |
| Forgot/reset password | **Complete** | Demo token link + live Supabase recovery email |
| Stripe Customer Portal | **Missing** | Terms updated accordingly |
| Server-generated PDF file | **Partial** | Print CSS only; email is HTML + link |

**Conclusion:** Nothing core from the field-report ideation is “missing” from the web app. Soft spots are auth recovery, team seats, and legal depth — not the contractor workflow.

---

## 2. Web features vs Shipaton native shell

Because native loads the hosted Next.js app, **almost every web feature is available on device** when `CAPACITOR_SERVER_URL` points at a live deploy.

| Area | Web | Native alignment |
|------|-----|------------------|
| Auth, dashboard, jobs, AI, PDF, email, share | Yes | Same UI in WebView |
| Photos | File input + capture | **Capacitor Camera** (Prompt: camera/library) + HTML fallback |
| Voice | getUserMedia / Whisper | Same; needs mic permission (now in Info.plist / Manifest) |
| Billing | Stripe Checkout | **RevenueCat** purchase/restore when `Capacitor.isNativePlatform()` |
| Promo / judge unlock | `SHIPATON-JUDGE` | Same API |
| Offline | Banner when offline | Same + `@capacitor/network` banner |
| Deep links | Web URLs | `fieldreport://` + Android VIEW + iOS URL types |
| Home-screen icon / splash | PWA SVG | **Branded** FieldReport assets applied to iOS/Android |

---

## 3. Shipaton hard requirements scorecard

| Requirement | Status |
|-------------|--------|
| iOS/Android app + RevenueCat SDK | Code complete (`app.fieldreport.mobile`) |
| Working IAP path | Code complete; needs RC dashboard + store products + keys |
| Free trial or promo | Promo live; store trials manual in ASC/Play |
| 1024×1024 icon | `public/shipaton/app-icon-1024.png` + native launchers updated |
| Screenshot 1179×2556 | **You must capture** from device/simulator |
| Demo video ≤2 min | **You must record** on TestFlight / internal build |
| First public release in contest window | **You must publish** |
| Deployed HTTPS backend | **You must deploy** (default `app.fieldreport.app` is not this product) |

---

## 4. Gaps closed for native ↔ web parity

1. iOS camera / mic / photo library usage strings  
2. Android `CAMERA`, `RECORD_AUDIO`, media read permissions  
3. Capacitor Camera multi-capture on “Add photos”  
4. Branded icon + splash on iOS and Android  
5. Privacy/terms + Team plan honesty  
6. Native share sheet for customer links (+ clipboard fallback)  
7. Deep links (`fieldreport://…`) + Android back button  
8. Offline / connectivity banner  
9. Safe-area padding for notched phones  
10. Keyboard resize + splash hide on launch  
11. Real forgot / reset password (demo token link + live Supabase email)  
12. Mic permission preflight before Whisper recording

---

## 5. Remaining gaps (cannot finish in-repo alone)

### Blockers for a real Shipaton submission
1. Deploy Next.js with OpenAI + Supabase + Resend + RC/Stripe env  
2. Point Capacitor `server.url` at that deploy; `cap sync`; archive  
3. Create store subscriptions + RC entitlements; smoke-test purchase  
4. First public App Store and/or Play listing in the contest window  
5. Demo video + 1179×2556 screenshot for Devpost  

### High (launch quality, not contest-hard-gate)
6. Stronger App Store privacy nutrition labels / support URL  
7. Device QA of camera + mic + purchase on physical phones  
8. Optional: Stripe Customer Portal for web cancel  

### Medium / roadmap
9. Multi-seat Team org  
10. Universal links for `/r/[id]`  
11. Offline draft queue  
12. Push reminders (“finish report”)  

---

## 6. Feature parity matrix (ideation → Shipaton entry)

| Feature | In web MVP | In native Shipaton entry | Risk if missing on device |
|---------|------------|--------------------------|---------------------------|
| Create job / freeform scope | Yes | Yes (same UI) | Low |
| Photos | Yes | Yes (Cap Camera) | Was High → fixed |
| Voice notes | Yes | Yes + mic plist | Was High → fixed |
| PDF reference + OCR | Yes | Yes | Needs OpenAI key live |
| Generate / regenerate / versions | Yes | Yes | Needs OpenAI for primary path |
| Email customer | Yes | Yes | Needs Resend live |
| Customer share link | Yes | Yes | Needs public HTTPS URL |
| Branding (logo/company) | Yes | Yes | Low |
| Stripe web billing | Yes | N/A (web) | — |
| RevenueCat IAP | N/A | Yes (code) | Blocker until store products |
| Judge promo | Yes | Yes | Ready |
| Team seats | Marketing only | Same | Honesty fixed |

---

## 7. Deployable “full app” definition

A **launchable** FieldReport for Shipaton means all of:

1. Hosted live mode with OpenAI (primary reports)  
2. Capacitor binary pointing at that host  
3. Camera/mic permissions (done) + branded icon (done)  
4. RevenueCat products live and purchasable  
5. Resend email delivering  
6. Store listing approved  

Without (1)/(4)/(5)/(6) you still have a strong **demo**, not a finished contest entry.

---

## 8. Recommended next actions (ordered)

1. Deploy backend → set `NEXT_PUBLIC_APP_URL` + `CAPACITOR_SERVER_URL`  
2. Configure RC + store products + webhook  
3. `npm run cap:sync` → TestFlight / Play internal track  
4. Record 2-min demo: open app → photo → voice → generate → email → customer link  
5. Capture 1179×2556 screenshot → Devpost submit with store URL  

Details and env checklist remain in `SHIPATON.md`.
