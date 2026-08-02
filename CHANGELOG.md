# CHANGELOG — your_persona_ui

Format: [Semantic Versioning](https://semver.org/) — **[UNRELEASED]** means not yet tagged/released (no version has shipped yet; the project has not been tagged as of this file's creation).
Conventions: `[A]` Added · `[C]` Changed · `[F]` Fixed · `[D]` Deprecated · `[R]` Removed

---

## v0.2.1 — 2026-08-02

### FE-04 & FE-05 complete: VPS deploy activation + production launch config

#### [A] FE-04: FE now live on the VPS, both staging and production
- 2 DuckDNS domains registered (`your-personas-app.duckdns.org` prod, `-stg` staging), both resolving to the VPS. `controller-api`'s shared Caddyfile gained 2 site blocks (`ui:3000` / `ui-staging:3000`) — TLS provisioning verified independently of the FE containers (502 until they existed, confirming Caddy + ACME worked).
- GitHub Secrets (`VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY` — reused from the same keypair as `controller-api`'s CI) and Variables (`FE_PROD_URL`, `FE_STAGING_URL`) set on this repo.
- Full pipeline verified end-to-end on both paths: push `develop` → `deploy-staging` (auto) → smoke test 200; PR merge to `main` → `deploy` (production-environment approval gate) → approve → smoke test 200. Both `https://your-personas-app.duckdns.org` and the `-stg` staging domain confirmed serving the live app.

#### [A] FE-05: production launch config — real Turnstile sitekey + PostHog
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (real Cloudflare sitekey, replacing the always-passing test key `1x00000000000000000000AA`) and `NEXT_PUBLIC_POSTHOG_KEY`/`NEXT_PUBLIC_POSTHOG_HOST` set as GitHub Variables and confirmed baked into the deployed prod/staging JS bundles (grepped the actual `_next/static/chunks/*.js` served in production to verify — not just "the variable is set," the compiled bundle actually contains it).
- Reminder for future changes to any `NEXT_PUBLIC_*` value: these are Docker **build-args**, inlined into the JS bundle at `next build` time on the CI runner — never read from a `.env` file on the VPS (the FE containers have no `env_file:` at all, unlike `controller-api`'s). Changing one always requires a full rebuild+redeploy (new commit, or a manual CI rerun of an existing workflow run), never a container restart.

#### [F] `docker` CI job building `linux/amd64` (wasted) + emulating `linux/arm64` via QEMU (slow)
- Same root cause and fix as `controller-api`: VPS is arm64-only (Ampere A1), so the `amd64` leg was dead weight and the `arm64` leg paid QEMU emulation overhead. Switched to GitHub's native `ubuntu-24.04-arm` runner, dropped `linux/amd64` + the QEMU setup step, target `linux/arm64` only. Observed `docker` job time dropped from ~15min31s to ~1-2min.

#### [A] Automated versioning/tagging via `release-please`
- New `release-please-config.json` (`release-type: node` — bumps `package.json`'s `version`; `skip-changelog: true`, this file stays hand-maintained; `include-component-in-tag: false` so tags stay `vX.Y.Z` — the first automated release defaulted to prefixing the package name, `your_persona_ui-v0.2.0`, corrected immediately by deleting that tag/release and recreating as `v0.2.0`), `.release-please-manifest.json` (bootstrapped from `v0.1.0`), `.github/workflows/release-please.yml` (push to `main`).
- Same operational gotcha as `controller-api`: release-please's PRs are authored by `GITHUB_TOKEN` and never trigger the required `pull_request` status checks, so they need `gh pr merge --admin` (content is always just a version-manifest bump, never application code). Requires `Allow GitHub Actions to create and approve pull requests` enabled in repo Settings → Actions.
- Releases so far: `v0.2.0` (feature backlog from FE-03 through FE-15, matching the promotion of `develop` to `main`), `v0.2.1` (patch, the tag-format fix commit itself was Conventional-Commits `fix:`-typed and correctly triggered its own patch release).

## [UNRELEASED] — 2026-07-27

### GitHub issue triage (FE-02 through FE-15) — staging deployment focus

#### [A] FE-03: same-origin API proxy resolving the SameSite cookie break (PR #39)
- `next.config.mjs` now rewrites `/api/be/:path*` to `API_INTERNAL_URL` — the browser always calls the same origin it's already on, in every environment, so `session_id`/`csrf_token` (`SameSite=Strict`) stay first-party even when FE and BE end up on different DuckDNS names (two flat subdomains count as different sites).
- `API_INTERNAL_URL` is a runtime env var (docker-compose `environment:`), not a build-arg — verified empirically that Next.js re-reads it at server start rather than freezing it into the standalone build.
- `NEXT_PUBLIC_API_BASE_URL` is now a constant (`/api/be`) across every environment; CI's `docker` job no longer branches on it. `app/api/og/route.tsx` (server-to-server, no cookies) now reads `API_INTERNAL_URL` directly instead.

#### [A] FE-11: Teaser mode score preview with GRIT dimmed (PR #40)
- Decision: keep trait bars over a radar chart (PRD FR-D4 deviation, matches the issue's own recommendation — bars read better at 360px for 5 dimensions).
- `TeaserResult` now shows the 4 trait bars at real values with GRIT blurred/locked (🔒) — same rendering-only blur pattern as the existing AI-summary teaser (FR-D3).

#### [F] FE-06: WCAG AA contrast failures on primary/secondary + white text (PR #42)
- Computed actual contrast ratios for the brand palette: `accent` (purple, the one PRD flagged as risky) passes at 5.38:1, but `primary` DEFAULT only reaches 3.38:1 (fails the 4.5:1 floor) and `secondary` DEFAULT only 2.49:1 (fails even the relaxed 3:1 large-text floor) — both used with white text in real components (the primary `Button` variant, `LocaleSwitcher`, the mascot style switcher, and the landing page's final-CTA gradient).
- `primary.DEFAULT` decoupled from `primary.500` to the existing `#0B7B86` shade (5.01:1, passes); hover states bumped to `-700` to keep a visible darken-on-hover; landing gradient's `via-secondary-500` swapped to `-700` (5.47:1).

#### [C] FE-15: migrated `next lint` (deprecated, removed in Next 16) to ESLint CLI flat config (PR #41)
- `eslint.config.mjs` (flat config via `FlatCompat`, keeps `next/core-web-vitals`) replaces `.eslintrc.json`; `lint` script is now `eslint .`.
- Flat config only ignores `node_modules` by default (no implicit directory scoping like `next lint` had) — added an explicit `.next/**` ignore, and fixed one new-but-real warning from now covering root config files `next lint` used to skip (`postcss.config.mjs`'s anonymous default export).

#### [C] FE-13: doc drift fixes (local-only files, no PR — see issue #13 comment)
- `AGENTS.md`/`TECHNICAL_DOCUMENTATION.md`/`CHECKLIST.md` corrected (mascot extension, NGINX→Caddy, access token TTL 15min→6h, stale bun-not-installed note) and `psyche-assessment-docs/PRD-psyche-assessment-mvp.md`'s FE status column synced against what's actually coded per `CHECKLIST.md`'s own M2-M4 DoD notes.

### Deferred (needs a live browser/device, external account, or is explicitly blocked)
FE-02, FE-05, FE-07, FE-08, FE-09, FE-10, FE-12, FE-14 — each has a status comment on its GitHub issue explaining why and what's needed before it can be picked up. FE-04 (VPS activation) is partially done: checkout directories are staged on the VPS, but DNS registration, the shared Caddyfile edit, and GitHub Actions secrets were deliberately left for the owner (see issue #4 comment).

## [UNRELEASED] — 2026-07-26

#### [C] Deployment docs corrected to match the actual shared-Caddy topology
- `README.md` previously described an NGINX reverse proxy; corrected to the as-built setup — one shared Caddy instance (owned by the `controller-api` stack) fronts both apps, with `ui`/`ui-staging` joining the external `your-persona-shared` Docker network. See `docker/docker-compose.prod.yml` / `docker-compose.staging.yml`.

## [UNRELEASED] — 2026-07-25

### CI/CD pipeline (mirrors controller-api's shape)

#### [A] GitHub Actions pipeline: checks → multi-arch image → gated deploy
- New `.github/workflows/ci.yml`: `secrets` (gitleaks) → `lint` / `typecheck` → `test` (bun test, guarded — see note below) / `build` (`next build`, contract-check only) → `docker` (multi-arch `linux/amd64,linux/arm64` image to GHCR, sha-tagged) → `deploy` / `deploy-staging`.
- Branch model mirrors `controller-api`: push `develop` → checks → build → **auto-deploy staging**; push `main` → checks → build → **production deploy gated by required-reviewer approval** (GitHub `production` environment). Deploy jobs are safe no-ops until VPS secrets exist and the FE stack is provisioned there (tracked in `your_persona_ui` issue FE-04).
- `NEXT_PUBLIC_*` values are inlined **at Docker build time** — the `docker` job passes branch-dependent build-args (production vs. staging API base URL, Turnstile sitekey), so the staging and production images are **not interchangeable** even though they come from the same Dockerfile.
- `bun test` job is guarded to no-op when zero test files exist yet (avoids permanently red-flagging CI before the first test is written — see `your_persona_ui` issue FE-01, tracked to remove the guard once apiClient tests land).
- New `docker/docker-compose.prod.yml` and `docker/docker-compose.staging.yml` — each stack is a single `ui`/`ui-staging` container joining the external `your-persona-shared` network so the BE's shared Caddy can reverse-proxy to it; no public ports exposed by the FE containers themselves.

#### [A] Branch protection & environments
- `main` and `develop` both protected: PR required, 6 required status checks (`secrets`, `lint`, `typecheck`, `test`, `build`, `docker`), conversation resolution required, no force-push/delete.
- GitHub environments `production` (required-reviewer gate) and `staging` (no gate, auto-deploy) created, mirroring `controller-api`.

## [UNRELEASED] — 2026-07-19

> All of M1–M5's code was written in this single work session; none of it had been verified end-to-end against a running backend at the time of writing (see `CHECKLIST.md` DoD notes) — tracked for a full E2E sweep in `your_persona_ui` issue FE-02.

### M1 — Foundation & Scaffold

#### [A] Clean Architecture skeleton: `core/{domain,application,infrastructure}` + `components/{ui,features}`
- `core/domain` — Zod schemas + TS types mirroring the BE DTOs (auth, guest-session, submit, result, dashboard), written from `controller-api/docs/swagger.json` per project convention (never guessed from Go source).
- `core/infrastructure/apiClient` — single fetch wrapper: envelope parsing (`success`/`data`/`error`), 401/`TOKEN_VERSION_MISMATCH` → refresh → retry interceptor, `Idempotency-Key` injection, `X-CSRF-Token` header read from the `csrf_token` cookie on every non-GET request.
- `core/application` — hooks layer (`useAuth`, `useSubmitAssessment`, `usePdfStatus`, `useQuota`) as the only thing components are allowed to call; components never `fetch` directly.
- Zustand stores (`useAuthStore` — `access_token` in-memory only; `useAssessmentStore` — answers persisted to localStorage via `persist` middleware) + TanStack Query provider.
- next-intl configured (EN default + ID) with locale negotiation in `middleware.ts`; PostHog initialized with the project's minimum event set from day 1 (not deferred to launch polish).
- Tailwind theme tokens: `primary #0E9AA8`, `secondary #14B8A6`, `accent #9333EA`, `rounded-2xl/3xl` radii.

### M2 — Discovery & Onboarding

#### [A] Landing page + SEO/GEO scaffolding
- SSR landing (hero, how-it-works, CTA) instrumented with `landing_view`.
- `app/robots.ts` (allow AI crawlers — GPTBot/PerplexityBot/ClaudeBot/Google-Extended; disallow `/results`, `/dashboard`, `/auth`), `app/sitemap.ts` (marketing pages only), `public/llms.txt`, landing JSON-LD.
- Onboarding form (display name / age / status, 13+ & privacy-notice checkboxes) → `POST /v1/guest-session` (skipped entirely for already-logged-in Members); `?ref=` capture to localStorage for later use at register.

### M3 — Assessment Engine

#### [A] SJT/Likert/Essay question flow with idempotent, resumable submit
- `AssessmentForm` + `QuestionInputs` render `GET /v1/questions?locale=` — answer values follow the BE scoring contract exactly (SJT = letter `A`.`.E`, Likert = `"1"`.`.`"5"`).
- Answers persist to localStorage (Zustand `persist`) so a mid-Section-C refresh loses nothing.
- Submit generates one `Idempotency-Key` per payload snapshot: network-failure or delayed retry reuses the same key (no double Gemini burn); changing an answer mints a new key. `X-CSRF-Token` is attached automatically by apiClient.
- Waiting Room (Framer Motion) tied to the actual in-flight submit request duration, not a fixed timer.
- `429 QUOTA_EXCEEDED` → dedicated panel + register CTA (not a generic toast); `429 RATE_LIMITED` → wait message with `meta.retry_after_seconds`.

### M4 — Grand Reveal

#### [A] Result page (Teaser/Full), mascot system, sharing
- Result page renders Teaser vs. Full purely from the API's `is_owner` flag on the full response (blur is FE-only rendering, per the contract's deliberate no-field-omission design).
- 32-mascot integration with a Style A/B switcher persisted via `PATCH /v1/results/:id/mascot-style` (optimistic update); defensive against pre-scoring-engine zero-value results (no mascot rendered when `mbti_type` is empty/invalid).
- Wellbeing panel rendered alongside (never replacing) results when `wellbeing_flag=true`, with locale-specific support-resource copy.
- `app/api/og` — 9:16 OG image route reading `GET /v1/results/:id`; `robots: noindex` set on `/results/[id]` as the second layer behind the BE's `X-Robots-Tag` header.
- Share flow via Web Share API with copy-link fallback (`share_clicked`); share URL is `/results/[id]` alone — no `share_token` in the contract.
- Claim Banner loss-framing for Guests ("save your result before it's gone in 14 days"); expired/not-found result → dedicated terminal-state page (no retry loop).

### M5 — Auth & Member Dashboard

#### [A] Full auth lifecycle + protected dashboard
- Register (with `referral_code` from the `?ref=` localStorage capture), Login, Forgot/Verify-Reset/Reset Password (3-step flow) — all with Cloudflare Turnstile (`cf_turnstile_response`, Cloudflare's test sitekey in dev).
- Email-OTP verification: 6-digit input, `meta.attempts_remaining`, 60s resend cooldown mirroring the BE's `retry_after_seconds`, auto-login on success; `EMAIL_NOT_VERIFIED` on login redirects to the OTP page.
- Token management: `access_token` in-memory only; `refresh_token` in localStorage (a documented trade-off — BE issues it in the JSON body, not a cookie; mitigated by BE-side rotation + denylist + `token_version` revocation). Boot-time background refresh restores a session from a stored `refresh_token`.
- `middleware.ts` + non-httpOnly `yp_session` flag cookie gate `/dashboard` for UX only (flash-of-protected-content avoidance) — real enforcement stays at the API (401 → interceptor → redirect).
- Dashboard: remaining quota, hand-drawn SVG GRIT trend chart (no chart library for one graph), micro-insights (rendered as-is, never re-translated client-side), paginated history + PDF re-download (fetched as a blob since `Authorization` can't ride along `window.open`).
- `usePdfStatus` polling: exponential backoff (2s→4s→8s, cap 10s) keyed off `dataUpdateCount` (not `fetchFailureCount`), hard 90s deadline, immediate stop on `failed`.
- Settings: locale change (`PATCH /v1/account/profile` persisted before switching UI language), on-demand referral-code generation, delete-request + cancel with all three deletion error codes handled.

## [UNRELEASED] — 2026-07-17

#### [A] 32 mascot art assets
- Added to `public/mascots/` as `{MBTI}_style_{a,b}.jpeg` (provisional — source assets are raster JPEG; the naming convention documented in `AGENTS.md`/Tech Doc originally specified `.svg`, corrected in FE-13). WebP conversion + lazy-loading tracked in `your_persona_ui` issue FE-12.

## [UNRELEASED] — 2026-07-15

#### [A] Initial project scaffold
- Next.js 14+ App Router + TypeScript strict, `output: 'standalone'`.
- Package manager migrated from pnpm to Bun (runtime + package manager + test runner) for production parity with the `bun server.js` deploy target.
