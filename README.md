# Blank POS

Phase 1 foundation: **Next.js 16**, **better-auth** (username + organization + admin), **Drizzle** on **Postgres** (Supabase), multi-tenant org shell and branding.

## First run

1. Copy [`.env.example`](.env.example) to `.env` and set `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ characters), and `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` for local dev (typically `http://localhost:3000`). For Supabase client features, set `NEXT_PUBLIC_SUPABASE_URL` and **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** (the legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` name is still read if the new variable is unset).

2. Apply the SQL migration (see [`drizzle/0000_init.sql`](drizzle/0000_init.sql)) to your database, or from the repo root:

   ```bash
   pnpm db:migrate
   ```

3. Start the app:

   ```bash
   pnpm dev
   ```

4. Open `/` — with an empty `user` table you are redirected to **`/setup`**. Complete the wizard (owner account → store org → branding). You land on `/{orgSlug}/dashboard`.

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

## Adding shadcn components

```bash
npx shadcn@latest add button
```

## Docs

- [`docs/phases/phase-01-foundation-branding.md`](docs/phases/phase-01-foundation-branding.md)
- [`docs/onboarding-first-run.md`](docs/onboarding-first-run.md)
