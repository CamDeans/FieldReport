# FieldReport smoke matrix (automated)

Run everything demo-safe: `npm test`  
Live-only: `RUN_LIVE_SMOKE=1 LIVE_SMOKE_EMAIL=… LIVE_SMOKE_PASSWORD=… npm run test:e2e:live`

| ID | Area | Automated? | Suite |
|----|------|------------|-------|
| A1 | Landing nav/CTAs/animation/use cases/pricing | Yes | smoke, comprehensive, deep-smoke |
| A2 | Auth login/signup/forgot/reset | Yes | smoke, comprehensive |
| A3 | Dashboard search/filter/nav mobile+desktop | Yes | smoke, comprehensive |
| A4 | Job create → photo → note → generate → email → `/r` | Yes | smoke, launch-readiness |
| A5 | PDF text upload + delete | Yes | launch-readiness, gap-smoke |
| A6 | Regenerate / version / dirty banner | Yes | comprehensive |
| A7 | Billing plans + SHIPATON-JUDGE | Yes | comprehensive |
| A8 | Settings profile/logo/trades | Yes | comprehensive |
| A9 | Design tokens / 44px / fonts | Yes | deep-smoke |
| A10 | Naming / env / schema conventions | Yes | `test:naming` |
| **G1** | Free plan **quota limit banner** | Yes | gap-smoke |
| **G2** | FIELDREPORT-TRIAL promo | Yes | gap-smoke |
| **G3** | Checkout cancel/success query | Yes | gap-smoke |
| **G4** | Empty-text PDF badge/toast | Yes | gap-smoke |
| **G5** | Oversized PDF API reject (~8MB) | Yes | gap-smoke |
| **G6** | Suggest-scope without OpenAI | Yes | gap-smoke |
| **G7** | Offline banner (browser offline) | Yes | gap-smoke, deep-smoke |
| **G8** | Unauthenticated API 401 | Yes | gap-smoke |
| **G9** | Print invokes `window.print` | Yes | gap-smoke |
| **G10** | Logo on public customer report | Yes | gap-smoke |
| **G11** | Multi-recipient email send | Yes | gap-smoke |
| **G12** | Webhook bad-signature guards | Yes | gap-smoke |
| **N1** | Deep links / RC products / promos | Yes | native-harness + `test:native` |
| **N2** | Restore purchases hidden on web | Yes | native-harness |
| **L1** | Live `/api/config` flags | Conditional | live-smoke (`RUN_LIVE_SMOKE=1`) |
| **L2** | Live OpenAI generate | Conditional | live-smoke |
| **L3** | Live suggest-scope | Conditional | live-smoke |
| D1 | Capacitor Camera multi-capture | Manual device | Shipaton checklist |
| D2 | Mic permission + Whisper on device | Manual / live | |
| D3 | Native Share sheet | Manual device | |
| D4 | RevenueCat purchase/restore on device | Manual device | |
| D5 | Android back + safe-area on notch | Manual device | |
| D6 | Live Resend inbox delivery | Manual / mail trap | |
| D7 | Live Stripe Checkout redirect | Manual / Stripe test | |
| D8 | Live Supabase reset email | Manual | |
| D9 | Contact Picker real pick | Manual (browser support) | |
| D10 | Team seats / Stripe portal | N/A roadmap | |
| **H1** | `/api/health` deploy probe | Yes | deep-smoke |
| **H2** | `npm run check:launch` env/artifact checklist | Yes | `scripts/check-launch-ready.ts` |

Unit scripts always in `npm test`: engine, ai, pdf, billing, native, contacts, naming.
