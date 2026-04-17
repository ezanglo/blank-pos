# Blank POS

Phase 1 foundation: **Next.js 16**, **better-auth** (email/password + organization + admin), **Drizzle** on **PostgreSQL**, org shell with multi-branch **`location`** rows and per-organization **`business_details`** (branding, legal, onboarding fields). Public URL segment is **`businessSlug`** → routes **`/{businessSlug}/l/{locationSlug}/…`**.

## First run

1. Copy [`.env.example`](.env.example) to `.env` and set:
   - **`DATABASE_URL`** — any standard Postgres (local, Docker, Neon, RDS, pooler URL for serverless, etc.).
   - **`BETTER_AUTH_SECRET`** (32+ characters) and **`BETTER_AUTH_URL`** / **`NEXT_PUBLIC_APP_URL`** for local dev (typically `http://localhost:3000`).
   - **`STORAGE_MODE=local`** for local image uploads to `public/uploads/`, or configure **cloud** S3-compatible storage (required on Vercel). See [docs/storage-uploads.md](docs/storage-uploads.md).

2. Apply migrations from the repo root. If you are **upgrading from an older schema** (e.g. `store_branding`, username-only auth), **drop and recreate** the database (or `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`) so the current baseline migration applies cleanly:

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
- [docs/onboarding-first-run.md](docs/onboarding-first-run.md)
