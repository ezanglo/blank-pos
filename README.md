# Blank POS

Phase 1 foundation: **Next.js 16**, **better-auth** (username + organization + admin), **Drizzle** on **PostgreSQL**, store + multi-branch shell (`organization` = store, `location` = branch) and per-store branding.

## First run

1. Copy [`.env.example`](.env.example) to `.env` and set:
   - **`DATABASE_URL`** — any standard Postgres (local, Docker, Neon, RDS, pooler URL for serverless, etc.).
   - **`BETTER_AUTH_SECRET`** (32+ characters) and **`BETTER_AUTH_URL`** / **`NEXT_PUBLIC_APP_URL`** for local dev (typically `http://localhost:3000`).
   - **`STORAGE_MODE=local`** for local image uploads to `public/uploads/`, or configure **cloud** S3-compatible storage (required on Vercel). See [docs/storage-uploads.md](docs/storage-uploads.md).

2. Apply migrations from the repo root (if you previously used the older single-location schema, **drop and recreate** the database first):

   ```bash
   pnpm db:migrate
   ```

3. Start the app:

   ```bash
   pnpm dev
   ```

4. Open `/` — with an empty `user` table you are redirected to **`/setup`**. Complete the wizard (**owner → store → first location → per-store branding**). You land on **`/{storeSlug}/l/{locationSlug}/dashboard`**.

5. Returning users sign in at **`/login`**. There is no public registration after the first user exists (`/setup` is blocked).

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

Regenerating the auth schema requires a live `DATABASE_URL` and uses [`lib/auth.config.ts`](lib/auth.config.ts) (CLI-only config).

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
