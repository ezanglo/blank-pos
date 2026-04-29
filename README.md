# Blank POS

Phase 1 foundation: **Next.js 16**, **better-auth** (email/password + organization + admin), **Drizzle** on **PostgreSQL**, org shell with multi-branch **`location`** rows and per-organization **`business_details`** (branding, legal, onboarding fields). Public URL segment is **`businessSlug`** → routes **`/{businessSlug}/l/{locationSlug}/…`**.

## First run

### Full stack in Docker

Install **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**, clone the repo, copy **[`.env.docker.example`](.env.docker.example)** to **`.env.docker`** (on Windows: `copy .env.docker.example .env.docker`), then:

```bash
docker compose --env-file .env.docker up -d --build
```

**`-d`** runs containers in the background. Same as **`pnpm docker:up`**. Follow logs with **`docker compose logs -f app`** (or **`docker compose logs -f`** for all services).

Docker-related variables live only in **`.env.docker`** ([`.env.docker.example`](.env.docker.example)); [`docker-compose.yml`](docker-compose.yml) still pins **`DATABASE_URL`** inside the stack to the **`postgres`** service. Open **`http://localhost:3000`** after **migrate** finishes.

**Restore workflow:** **`SKIP_DB_MIGRATE=1`** while bringing the stack up (or start **`postgres`** only first), run **`pnpm db:restore`**, then **`docker compose --env-file .env.docker up -d --build`** again if needed.

**Supabase dumps:** they reference **`supabase_vault`** / **`vault`**, which plain Postgres in Docker does not include. Run **`RESTORE_SUPABASE_LOCAL=1 pnpm db:restore ./backups/your.dump`**, or pass **`pg_restore`** excludes manually — see [`scripts/restore-docker-db.sh`](scripts/restore-docker-db.sh).

Postgres on the **host**: **`postgresql://postgres:postgres@localhost:5433/blankpos`** (Compose publishes **5433** so **5432** stays free for a local Postgres).

### Host-only Next.js (Postgres in Docker optional)

1. Copy [`.env.example`](.env.example) to `.env` / **`.env.local`** and set:
   - **`DATABASE_URL`** — **`postgresql://postgres:postgres@localhost:5433/blankpos`** when using [`docker compose`](docker-compose.yml) Postgres.
   - **`BETTER_AUTH_SECRET`** (32+ characters) and **`BETTER_AUTH_URL`** / **`NEXT_PUBLIC_APP_URL`** for local dev (typically `http://localhost:3000`).
   - **`STORAGE_MODE=local`** for local image uploads to `public/uploads/`, or configure **cloud** S3-compatible storage (required on Vercel). See [docs/storage-uploads.md](docs/storage-uploads.md).

2. Apply migrations from the repo root with the **same `DATABASE_URL`** the app loads (e.g. `.env.local` for local dev). If the CLI and Next.js point at different databases, migrations can look “done” while tables are missing at runtime. If you are **upgrading from an older schema** (e.g. `store_branding`, username-only auth), **drop and recreate** the database (or `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) so the current baseline migration applies cleanly:

   ```bash
   pnpm db:migrate
   ```

3. Start the app:

   ```bash
   pnpm dev
   ```

4. Open **`/`** — routing depends on session and data:
   - **No users yet:** redirect to **`/signup`** to create the first account (email + password).
   - **Signed in:** if you have **more than one** accessible branch → **`/choose-location`**; else if you can open a dashboard → **`/{businessSlug}/l/{locationSlug}/dashboard`**; else if onboarding is incomplete → **`/onboarding`**; otherwise **`/login`** as needed.

5. **`/login`** — returning users sign in with **email + password**. **`/signup`** remains available for additional accounts on the same install (first user still typically creates the first organization from **`/onboarding`**).

See [docs/onboarding-first-run.md](docs/onboarding-first-run.md) and [docs/schema-better-auth-alignment.md](docs/schema-better-auth-alignment.md) for the full model.

## Scripts

| Script            | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `pnpm dev`        | Next dev (Turbopack)                         |
| `pnpm build`      | Production build                             |
| `pnpm typecheck`  | `tsc --noEmit`                               |
| `pnpm lint`       | ESLint                                       |
| `pnpm db:generate`| Drizzle migrations from `lib/db/schema.ts`   |
| `pnpm db:migrate` | Apply migrations via drizzle-kit             |
| `pnpm db:restore` | Restore a dump into Compose Postgres (`scripts/restore-docker-db.sh`) |
| `pnpm docker:up` | `docker compose --env-file .env.docker up -d --build` (detached / background) |
| `pnpm db:seed:coffee` | Optional demo coffee-shop catalog (see **Optional — demo catalog seed** in [phase-03-pos-mvp.md](docs/phases/phase-03-pos-mvp.md)) |
| `pnpm auth:schema`| Regenerate `lib/db/auth-schema.ts` from CLI  |

Regenerating the auth schema requires a live `DATABASE_URL` and uses [`lib/auth.config.ts`](lib/auth.config.ts) (CLI-only config; must stay aligned with [`lib/auth.ts`](lib/auth.ts)).

## CI

Pushes and pull requests against **`main`** or **`master`** run **`pnpm lint`**, **`pnpm typecheck`**, and **`pnpm build`** (with **`SKIP_ENV_VALIDATION=1`**) in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Adding shadcn components

```bash
npx shadcn@latest add button
```

## Docs

- [docs/storage-uploads.md](docs/storage-uploads.md) — image uploads and `STORAGE_*` env.
- [docs/phases/phase-01-foundation-branding.md](docs/phases/phase-01-foundation-branding.md)
- [docs/phases/phase-02-product-engine.md](docs/phases/phase-02-product-engine.md) — catalog (categories with variants / instructions / **add-ons** dialogs, products, inventory).
- [docs/phases/phase-03-pos-mvp.md](docs/phases/phase-03-pos-mvp.md) — register, responsive cart, **category add-ons**, checkout, receipt sheet + print + **Reorder**, last-receipt badge, optional **`db:seed:coffee`**.
- [docs/phases/phase-04-inventory-reports.md](docs/phases/phase-04-inventory-reports.md) — inventory, sales reports, transactions list (**name for order**, search), dashboard.
- [docs/onboarding-first-run.md](docs/onboarding-first-run.md)
- [docs/blank-pos-dev-plan.md](docs/blank-pos-dev-plan.md) — schema sketch and roadmap.
