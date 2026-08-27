# FieldReport naming conventions

Canonical reference for credentials, database, routes, and product identifiers.
Smoke: `npm run test:naming`

## Credentials / env

| Rule | Convention |
|------|------------|
| Format | `SCREAMING_SNAKE_CASE` |
| Secrets | Never `NEXT_PUBLIC_` |
| Client-safe | Must use `NEXT_PUBLIC_` (Supabase anon, RC SDK keys, app URL, optional product id overrides) |
| Live mode gate | Real `NEXT_PUBLIC_SUPABASE_URL` **and** `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Canonical origin | `NEXT_PUBLIC_APP_URL` (emails, Stripe redirects, password reset) |
| Capacitor WebView URL | `CAPACITOR_SERVER_URL` → else `NEXT_PUBLIC_APP_URL` → else `https://app.fieldreport.app` |

### Env inventory (must match `.env.example`)

| Variable | Role |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Live mode + client/server Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Live mode + anon client |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin / RLS bypass (server only) |
| `OPENAI_API_KEY` | AI reports, Whisper, OCR, scope suggest |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Outbound email |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Web billing |
| `STRIPE_PRICE_{STARTER,PRO,TEAM}` | Stripe Price ids |
| `STRIPE_TRIAL_DAYS` | Checkout trial (default 7) |
| `NEXT_PUBLIC_REVENUECAT_{IOS,ANDROID}_KEY` | Native IAP SDK |
| `REVENUECAT_WEBHOOK_SECRET` | RC webhook auth |
| `NEXT_PUBLIC_REVENUECAT_PRODUCT_{STARTER,PRO,TEAM}` | Preferred product id overrides |
| `NEXT_PUBLIC_RC_PRODUCT_*` | **Legacy alias** for the same overrides (still supported) |
| `PROMO_CODES` | Extra `CODE:plan` pairs |
| `NEXT_PUBLIC_APP_URL` / `CAPACITOR_SERVER_URL` | Deployed origin |

Builtin promos (code): `SHIPATON-JUDGE` → pro, `SHIPATON2026` → pro, `FIELDREPORT-TRIAL` → starter.

## Database (Postgres / Supabase)

| Rule | Convention |
|------|------------|
| Tables | plural `snake_case` (`profiles`, `jobs`, `job_documents`, …) |
| Columns | `snake_case` |
| Storage buckets | kebab-case: `job-photos`, `job-documents` |
| TS domain models | `camelCase` at the boundary (`SupabaseRepository` maps) |
| Exception | `ReportContent` JSON keeps AI snake_case (`overall_condition`, …) |

### Important mappings

| DB | TS |
|----|-----|
| `logo_url` | `logoDataUrl` (data URL or remote URL) |
| `storage_path` | exposed as `dataUrl` (signed URL) |
| `stripe_customer_id` | `stripeCustomerId` (set by Stripe webhook) |
| `stripe_subscription_id` | `stripeSubscriptionId` |

## Session / storage keys

| Key | Kind | Status |
|-----|------|--------|
| `fieldreport_session` | httpOnly cookie | **Canonical** app session |
| `fieldreport.recentEmails` | localStorage | Active |
| ~~`fieldreport.v1` / `fieldreport.session`~~ | localStorage | **Removed** (legacy browser demo store) |

## Plans / products

| Plan key | Stripe env | RC entitlement | Default store product id |
|----------|------------|----------------|--------------------------|
| `free` | — | — | — |
| `starter` | `STRIPE_PRICE_STARTER` | `starter` | `fieldreport_starter_monthly` |
| `pro` | `STRIPE_PRICE_PRO` | `pro` (+ alias `premium`) | `fieldreport_pro_monthly` |
| `team` | `STRIPE_PRICE_TEAM` | `team` | `fieldreport_team_monthly` |

## Native / Shipaton identifiers

| Name | Value | Notes |
|------|-------|-------|
| Capacitor `appId` | `app.fieldreport.mobile` | Bundle / application id |
| Deep link scheme | `fieldreport://` | iOS URL types + Android VIEW intent |
| Capacitor iOS `scheme` | `FieldReport` | Capacitor WebView bridge (not the deep link) |
| Android `custom_url_scheme` string | `app.fieldreport.mobile` | Capacitor internal; **do not** replace with `fieldreport` |

## Routes

- Pages: kebab-case (`/forgot-password`, `/dashboard/jobs/new`)
- API: kebab-case verbs (`generate-report`, `send-report`)
- Public share UI: `/r/[id]` · API: `/api/reports/public/[id]`
- Nested ids: `[photoId]`, `[documentId]` under jobs

## UI / tests

- Components: kebab-case files, PascalCase exports
- `data-testid`: kebab-case (`job-row-${id}`, `plan-starter`)
- CSS tokens: `--primary` (`#1d4ed8`), `--background`, etc.
- Safe area: `.safe-area-app`, `.safe-top`, `.safe-bottom`

## Demo ids

`user_demo_cameron`, `job_demo_{roof,water,hvac}`, `photo_*`, `report_demo_hvac`  
Runtime: `uid("user"|"job"|"photo"|"doc"|"report"|"sess")` → `{prefix}_{rand}`
