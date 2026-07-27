# Deploy Runbook — Front-End

This is a runbook, not an essay — follow it top to bottom for a fresh deploy. A second person should be able to run this from nothing but this file and a fresh VM, without asking questions.

Scope note: this FE has no database, no migrations, and no persisted runtime secrets — `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`NEXT_PUBLIC_POSTHOG_*` are baked into the Docker image **at build time** (see `.github/workflows/ci.yml`'s `docker` job), but `NEXT_PUBLIC_API_BASE_URL` is now a constant (`/api/be`) and the real BE address (`API_INTERNAL_URL`) is a plain runtime env var set per docker-compose file (FE-03) — nothing to seed, migrate, or back up here.

## Prerequisites (do these once, before touching the VM)

1. **Domain topology (FE-03) — already decided, nothing to do here.** `next.config.mjs` proxies `/api/be/*` to `API_INTERNAL_URL` so `session_id`/`csrf_token` cookies stay first-party no matter which sites FE/BE end up on (two flat DuckDNS names count as different sites for `SameSite=Strict`). `API_INTERNAL_URL` is already set correctly per environment in `docker/docker-compose.prod.yml` / `docker-compose.staging.yml` — nothing to change during activation.
2. **DNS**: register the FE production + staging domains (DuckDNS: two flat names, e.g. `your-personas-app.duckdns.org` / `your-personas-app-stg.duckdns.org` — DuckDNS does not support subdomains of an existing name) pointing at the same VM IP the `controller-api` stack already runs on.
3. **Caddyfile** (lives in the `controller-api` repo, one shared Caddy serves every domain on the VM): add two site blocks routing to this FE's container names —
   ```
   your-personas-app.duckdns.org     { reverse_proxy ui:3000 }
   your-personas-app-stg.duckdns.org { reverse_proxy ui-staging:3000 }
   ```
   Deploy that change through `controller-api`'s normal pipeline (or `docker compose restart caddy` on the VM after editing the file directly).
4. **GHCR pull access on the VM** — same one-time `docker login ghcr.io` as `controller-api`'s runbook already set up; it is a registry-level credential, not per-repository, so if the VM already pulls `ghcr.io/aprxty3/your_persona_controller` it can pull `ghcr.io/aprxty3/your_persona_ui` too without repeating this step. If this is a fresh VM, see `controller-api/docs/deploy_runbook.md` Prerequisites #6.
5. Have SSH access to the VM with Docker + Docker Compose v2 installed (already true if `controller-api` is running there).
6. **GitHub Actions secrets/variables** (repo Settings → Secrets and variables → Actions):
   - Secrets: `VPS_SSH_KEY`, `VPS_HOST`, `VPS_USER` (same values as `controller-api`'s), optional `VPS_PORT`.
   - Variables: `FE_PROD_URL`, `FE_STAGING_URL` (the domains from step 2, used by the deploy job's smoke test), plus the production launch config from issue FE-05 (`NEXT_PUBLIC_TURNSTILE_SITE_KEY` real sitekey, `NEXT_PUBLIC_POSTHOG_KEY`/`_HOST`) if not already set — until these exist, production builds silently fall back to Cloudflare's always-pass test key.

## 1. First-time deploy

```sh
# On the VM — two checkout dirs, mirroring controller-api's prod/staging separation
sudo mkdir -p /opt/your-persona/your-persona-ui /opt/your-persona/your-persona-ui-staging
git clone https://github.com/aprxty3/your_persona_ui.git /opt/your-persona/your-persona-ui                     # tracks main
git clone -b develop https://github.com/aprxty3/your_persona_ui.git /opt/your-persona/your-persona-ui-staging  # tracks develop
```

```sh
cd /opt/your-persona/your-persona-ui

# Pulls the image CI already built & pushed from the last push to main — the
# same artifact that passed lint/typecheck/test/build, not a fresh rebuild
# from whatever happens to be in the working tree on this VM. No .env needed:
# this compose file has no runtime env vars (see scope note above).
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d --no-build

# No image reachable yet (first push to main hasn't run, or GHCR unreachable)?
# There is no local Dockerfile fallback build wired into this compose file —
# build directly instead:
#   docker build -t ghcr.io/aprxty3/your_persona_ui:latest .
#   docker compose -f docker/docker-compose.prod.yml up -d --no-build
```

Repeat the same two commands in `/opt/your-persona/your-persona-ui-staging` with `docker/docker-compose.staging.yml`.

```sh
# Smoke test (both domains)
curl -i https://your-personas-app.duckdns.org
curl -i https://your-personas-app-stg.duckdns.org
# → 200 and a valid TLS cert (Caddy/ACME — same mechanism as controller-api's domains)
```

Then manually, from a browser: full Guest flow (onboarding → assessment → submit → result) against the real FE origin — this is the first point where the domain-topology decision from Prerequisites #1 gets proven right or wrong (watch for the `session_id` cookie actually being sent on the `submit` request in DevTools' Network tab).

## 2. Redeploy (routine updates)

**Automated** — `.github/workflows/ci.yml`'s `deploy` (production, gated by the `production` environment's required-reviewer approval) and `deploy-staging` (auto) jobs run this exact sequence over SSH on every qualifying push, once the secrets in Prerequisites #6 are set. Until then, both are safe no-ops (skipped, not failed) — CI stays green while the VM is still being provisioned.

**Manual** (fallback, or for a release you want to babysit):

```sh
cd /opt/your-persona/your-persona-ui        # or your-persona-ui-staging
git pull
docker compose -f docker/docker-compose.prod.yml pull       # or docker-compose.staging.yml
docker compose -f docker/docker-compose.prod.yml up -d --no-build --remove-orphans
```

There is no in-flight-request drain concern here beyond Next.js's own default `SIGTERM` handling (a short-lived page render, not a long-running job) — nothing equivalent to `controller-api`'s Asynq graceful-shutdown wait applies to this container.

## 3. Rollback

**Fast path** — every image the `docker` job ever pushed is still in GHCR under its immutable `sha-<commit>` tag (Packages tab on the repo, or `git log --oneline` to find the commit and take its short SHA):

```sh
cd /opt/your-persona/your-persona-ui        # or your-persona-ui-staging
export UI_IMAGE_TAG=sha-<short-sha-of-last-known-good-commit>
docker compose -f docker/docker-compose.prod.yml pull       # or docker-compose.staging.yml
docker compose -f docker/docker-compose.prod.yml up -d --no-build
```

This is deliberately a one-off shell `export`, not written into any file — the next automated deploy run doesn't set `UI_IMAGE_TAG` itself (it exports it fresh per SSH session from the branch's latest build), so it will overwrite this rollback on the next push. If the rollback needs to *stick*, pause the workflow (Actions tab → disable) until you're ready to resume normal deploys.

**If the fast path isn't available** (rolling back further than any pushed image, or GHCR itself is down):

```sh
cd /opt/your-persona/your-persona-ui
git checkout <commit-sha>
docker build -t ghcr.io/aprxty3/your_persona_ui:latest \
  --build-arg NEXT_PUBLIC_TURNSTILE_SITE_KEY=<sitekey> \
  --build-arg NEXT_PUBLIC_POSTHOG_KEY=<key> \
  --build-arg NEXT_PUBLIC_POSTHOG_HOST=<host> \
  .
docker compose -f docker/docker-compose.prod.yml up -d --no-build
```
Building locally means supplying the same `NEXT_PUBLIC_*` build-args the CI `docker` job would have used for that branch — a local build without them silently bakes in empty/dev values (Turnstile falls back to the test sitekey). `NEXT_PUBLIC_API_BASE_URL` needs no build-arg (Dockerfile defaults it to `/api/be`, FE-03); `API_INTERNAL_URL` is already set in `docker-compose.prod.yml`'s `environment:` block, not something this build step touches. Check `.github/workflows/ci.yml`'s `docker` job env block for the exact Turnstile/PostHog values in effect at the time.

## Reference — what's already handled by code, not this runbook

- `NEXT_PUBLIC_*` build-arg selection per branch (production vs. staging config) — handled entirely in `.github/workflows/ci.yml`'s `docker` job, nothing to configure per-deploy.
- No database, no migrations, no backup/restore — this service is stateless; a bad deploy is always solved by rolling the image back (Section 3), never a data-recovery problem.
