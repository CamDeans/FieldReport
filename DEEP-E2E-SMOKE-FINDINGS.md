# Deep E2E smoke audit — Aug 27, 2026

Full automated matrix + grey-area review after **photo annotation overlays** shipped.

## Executive summary

| Layer | Result |
|-------|--------|
| Unit scripts (8) | **All PASS** |
| Playwright demo E2E (6 suites) | **83 PASS** |
| Production build | **PASS** |
| `check:launch` | **12 OK, 9 WARN, 0 FAIL** (demo posture — expected) |
| ESLint | **3 errors** (pre-existing react-hooks + 1 fixed prefer-const) |

**Verdict:** Demo-mode web product is **green end-to-end**. Remaining gaps are **credential-only live paths** and **physical device** checks — not missing demo automation.

---

## Automated run (this audit)

```bash
npm test          # units + all non-@live Playwright
npm run build
npm run check:launch
npm run lint      # 2 react-hooks setState-in-effect (pre-existing)
```

### Unit coverage

| Script | Focus |
|--------|--------|
| `test:engine` | Taxonomy fallback all job types |
| `test:ai` | OpenAI path, evidence lines, incremental update, photo_annotations mock |
| `test:annotations` | Normalize boxes, fallback overlays, ensureReportAnnotations |
| `test:pdf` | Extract, blank PDF, page render |
| `test:billing` | RC products, promos, entitlements |
| `test:native` | Deep link parsing |
| `test:contacts` | Multi-recipient parse |
| `test:naming` | Env, schema, cookie, Capacitor id conventions |

### Playwright suites (83 tests)

| Suite | Tests | Focus |
|-------|-------|--------|
| `smoke.spec.ts` | 15 | Core contractor loop + annotated gallery on `/r` |
| `smoke-comprehensive.spec.ts` | 29 | Landing, auth, workspace, billing, mobile nav, public reports |
| `deep-smoke.spec.ts` | 15 | Public pages, user stories, health/offline, workspace + annotations |
| `gap-smoke.spec.ts` | 15 | Quota, promos, PDF edges, webhooks, print, logo + annotations |
| `launch-readiness.spec.ts` | 5 | Pre-credential contractor path + annotated customer link |
| `native-harness.spec.ts` | 4 | Deep links, RC ids, promos, restore hidden on web |
| `live-smoke.spec.ts` | — | **Skipped** (requires `RUN_LIVE_SMOKE=1` + Supabase user) |

---

## User-story walkthrough (automated evidence)

### 1. Marketing → auth
- Landing hero, pricing, mobile nav, legal/help — **PASS** (smoke, comprehensive, deep-smoke)
- Login/signup/forgot/reset/demo credentials — **PASS**
- Protected routes redirect — **PASS**

### 2. Onboarding → dashboard
- Trade wizard for new signup — **PASS**
- Dashboard search, filters, demo reset — **PASS**
- Mobile bottom nav — **PASS**

### 3. Job workspace
- Create job, freeform scope, contacts field — **PASS**
- Photo upload, caption, typed note, photo target — **PASS**
- PDF upload (text + empty + oversized reject) — **PASS**
- Voice button (mic unavailable handled) — **PASS**
- Generate report — **PASS**
- **Photo evidence gallery + colored highlight boxes** — **PASS** (smoke, launch-readiness, comprehensive, deep-smoke, gap-smoke)
- Regenerate / version history / dirty banner — **PASS**
- Duplicate / delete job — **PASS**

### 4. Customer delivery
- Email compose, multi-recipient, contact picker UI — **PASS**
- Send (demo queue) — **PASS**
- Public `/r/[id]` + read receipt — **PASS**
- Company logo on public report — **PASS**
- Print invokes `window.print` — **PASS**

### 5. Billing & settings
- Plan buttons (demo instant flip) — **PASS**
- SHIPATON-JUDGE, FIELDREPORT-TRIAL promos — **PASS**
- Quota banner after 3 reports (free) — **PASS**
- Checkout success/cancel query toasts — **PASS**
- Settings profile, trades, logo — **PASS**

### 6. Native / Shipaton (code-level)
- Deep links `fieldreport://` — **PASS**
- RC product ids + entitlements — **PASS**
- Restore purchases hidden on web — **PASS**
- Offline banner (browser offline event) — **PASS**
- `/api/health`, `/api/config` — **PASS**

---

## Grey areas — still manual or credential-only

These are **not** failures; they require real accounts or hardware.

| ID | Area | Why not automated here |
|----|------|------------------------|
| L1–L3 | Live OpenAI generate, suggest-scope, config flags | Needs `OPENAI_API_KEY` + Supabase + `RUN_LIVE_SMOKE=1` |
| D1 | Capacitor Camera multi-capture | Physical device / TestFlight |
| D2 | Whisper on device mic | Device + OpenAI |
| D3 | Native Share sheet | Device |
| D4 | RevenueCat purchase/restore | App Store / Play sandbox |
| D5 | Android back + notch safe-area | Device |
| D6 | Resend inbox delivery | Verified domain + API key |
| D7 | Stripe Checkout redirect | Stripe test/live keys |
| D8 | Supabase reset email | Supabase auth + redirect URLs |
| D9 | Contact Picker real pick | Browser support varies (UI present) |
| D10 | Team seats / Stripe portal | Roadmap |
| — | OpenAI **vision-accurate** box placement | Demo uses taxonomy fallback overlays; live OpenAI boxes need `OPENAI_API_KEY` |
| — | Email HTML **CSS overlays** on photos | Email clients don't support overlays; online `/r` link has live boxes |
| — | GitHub Actions CI | `.github/workflows/ci.yml` not on remote (OAuth workflow scope); run `npm test` locally / add workflow after scope |

---

## Minor code hygiene (non-blocking)

1. **ESLint** — `contact-email-field.tsx` and one other file: `setState` in `useEffect` (react-hooks plugin). Pre-existing; does not affect runtime.
2. **Lint warnings** — unused vars in a few API/repository stubs (`_token`, `_userId`, `html`, `DEMO_PASSWORD`).
3. **Demo report engine** — Without OpenAI, annotation boxes use **heuristic** placement from captions/notes (by design). Live mode uses OpenAI vision coordinates.

---

## Pre-credential checklist (you)

When adding keys per `LAUNCH.md`:

1. `npm run check:launch -- --strict`
2. `RUN_LIVE_SMOKE=1 LIVE_SMOKE_EMAIL=… LIVE_SMOKE_PASSWORD=… npm run test:e2e:live`
3. `GET /api/health` → `mode: live`, `reportEngine: openai`
4. Device smoke: camera, mic, share, IAP (SMOKE-MATRIX D1–D5)
5. `cap sync` with production `CAPACITOR_SERVER_URL`

---

## Completeness estimate

| Lens | ~% | Notes |
|------|----|-------|
| Web MVP (demo automated) | **96%** | 83/83 demo E2E green; photo annotations covered in 5 suites |
| Web MVP (live credentials) | **95%** | Live smoke scripted; needs your keys |
| Native shell (hosted WebView) | **95%** | Same UI as web; device IAP/camera manual |
| Contest / store ops | **60–70%** | Deploy URL, store listing, video, screenshot |

**Nothing critical missing in demo automation.** Next step is credentials + live smoke + device pass.
