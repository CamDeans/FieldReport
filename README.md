# FieldReport

Mobile-first field reporting for trades contractors. Photograph a job, add voice or typed notes, generate a branded customer report, and send it.

## Architecture

Demo and production use **the same UI and API routes**. The browser talks to `/api/*`; a repository layer switches backends automatically:

| Mode | Trigger | Persistence |
|------|---------|-------------|
| **Demo** (default) | No Supabase env vars | Server store in `.fieldreport/` |
| **Live** | Supabase URL + anon key set | Postgres + Storage via Supabase |

### Report generation (AI-first)

1. **Primary:** OpenAI (`gpt-4o-mini` + vision) drafts the full report from photos, captions, voice notes, and freeform scope.
2. **Fallback only:** Taxonomy rule engine if `OPENAI_API_KEY` is missing or the AI call fails.
3. **Scopes:** Type any trade description — catalog shortcuts are optional, not limits.
4. **Voice:** Whisper via `/api/transcribe` when OpenAI is set; otherwise on-device speech; typing always works.

Other production services (when configured):

- **Supabase** — auth, profiles, jobs, photos, reports
- **Stripe** — web subscription checkout + webhooks (optional trial)
- **RevenueCat** — iOS/Android in-app subscriptions via Capacitor (`app.fieldreport.mobile`)
- **Resend** — customer report email delivery
- **OpenAI** — reports, Whisper, scope suggest, PDF OCR

Shipaton 2026 packaging and store checklist: see [`SHIPATON.md`](./SHIPATON.md).

## Demo login

- Email: `cameronmdeans@gmail.com`
- Password: `FieldReport!2026`
- Judge promo (Billing): `SHIPATON-JUDGE` → Pro

## Scripts

```bash
npm run dev            # development
npm run build          # production build
npm run start          # run production server
npm run check:launch   # pre-deploy env + artifact checklist
npm run test           # units + full Playwright smoke (demo)
npm run test:e2e:live  # after credentials (see SMOKE-MATRIX.md)
npm run cap:sync       # sync Capacitor after CAPACITOR_SERVER_URL is set
npm run cap:open:ios
npm run cap:open:android
```

Launch runbook: **[`LAUNCH.md`](./LAUNCH.md)** · Smoke matrix: [`SMOKE-MATRIX.md`](./SMOKE-MATRIX.md) · Naming: [`NAMING-CONVENTIONS.md`](./NAMING-CONVENTIONS.md)

## GitHub

Remote: `https://github.com/CamDeans/FieldReport`

```bash
./scripts/push-to-github.sh              # push feature branch
PUSH_MAIN=1 ./scripts/push-to-github.sh  # also set main (empty repo)
```

Cloud Agent environment config: [`.cursor/environment.json`](./.cursor/environment.json)

## Go live

Follow **[`LAUNCH.md`](./LAUNCH.md)** end-to-end. Short version:

1. Copy `.env.example` → `.env.local` / host env
2. Supabase schema + buckets `job-photos` / `job-documents`
3. OpenAI, Resend, Stripe, RevenueCat keys + webhooks
4. `NEXT_PUBLIC_APP_URL` + `CAPACITOR_SERVER_URL` = HTTPS origin
5. `npm run build && npm run start` (or deploy via Vercel)
6. Probe `GET /api/health` → `mode: live`
7. `npm run check:launch -- --strict` then live / device smoke

Without OpenAI, reports use taxonomy fallback. Without Supabase, the app stays in demo mode for local/CI testing.
