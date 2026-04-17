# First-run onboarding (clone → browser setup)

This describes the **guided setup** so someone can **clone the repo**, configure environment variables, run migrations, start the app, and **finish initial configuration entirely in the UI**—no manual SQL or seed scripts required for the happy path.

It belongs to **Phase 1**; see [phases/phase-01-foundation-branding.md](phases/phase-01-foundation-branding.md) for scope and deferred items.

**Auth model (v1):** There is **no public user registration**. Only the **bootstrap wizard** creates the first user. Every **other** account is created by an **owner/manager** from org settings with a **username + password** you choose (see [schema-better-auth-alignment.md](schema-better-auth-alignment.md) — Admin + Username plugins, **`createUser`** + **`addMember`**). **No email invite flow.**

---

## Goals

- Create the **first user** (bootstrap **owner**).
- Configure **shared store branding** (`store_branding` — display name, optional logo URL for login/shell).
- Create the **first organization** (v1: **org = store**) via **`authClient.organization.create`**, then persist **site fields** on the **`location`** row (name/slug also on `organization`; currency, address, phone on `location`).
- After completion, land on **`/{orgSlug}/dashboard`** with the organization session context set.

---

## What still happens outside the browser (unavoidable, keep minimal)

Document these clearly in the root **README** (copy-paste checklist):

1. **Create or point to a PostgreSQL database** — local install, Docker, Neon, RDS, or any host that gives you a standard `DATABASE_URL` compatible with Drizzle.
2. **Copy `.env.example` → `.env`** and fill: `DATABASE_URL`, `BETTER_AUTH_SECRET` (32+ chars), `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`, and **`STORAGE_*`** / **`STORAGE_MODE`** for image uploads (see [storage-uploads.md](storage-uploads.md)).
3. **Run migrations** once (`pnpm db:migrate`) so tables exist **before** the first user exists.

Everything **after** step 3 should be doable from the **frontend wizard**.

---

## Entry and routing

- **Detection:** If there are **zero users** in the auth `user` table (server-checked), **`/`** redirects to **`/setup`** ([app/page.tsx](../app/page.tsx)).
- **If users exist:** **`/setup`** redirects to **`/login`** ([app/setup/layout.tsx](../app/setup/layout.tsx)).
- **After setup complete:** returning users use **`/login`** only. **Do not** ship a public **`/register`** route in v1. Authenticated app routes live under **`(protected)`** ([app/(protected)/](../app/(protected)/)).

Avoid leaking precise user counts to anonymous clients if you care about user enumeration; the repo uses **server-only** `count(users) === 0` for routing.

---

## Wizard steps (actual order in repo)

Single linear wizard in [components/setup/setup-wizard.tsx](../components/setup/setup-wizard.tsx). Persist sensitive steps in **session** (user is created and signed in before org exists).

1. **Welcome** — Short copy; continue to owner step.
2. **Bootstrap owner** — **`username`**, **`password`**, **display name**. Server **`bootstrapCreateOwner`** (gated `count(user) === 0`) then **`authClient.signIn.username`** so the session exists.
3. **Branding (shared)** — Display name and optional **logo** (HTTPS URL, **`/uploads/...`** after file upload, or offline-queued upload). Writes **`store_branding`** via **`setupPhaseSaveStoreBranding`** ([lib/actions/branding.ts](../lib/actions/branding.ts)).
4. **Location / organization** — **Shop display name**, **`slug`**, **default currency**, address fields, phone. Client **`authClient.organization.create`**, then server **`updateOrganizationStore`** to upsert **`location`** ([components/setup/setup-steps.tsx](../components/setup/setup-steps.tsx)). Redirect to **`/{slug}/dashboard`**.

Optional **step 0** “Verify connectivity” only if it reduces support burden; keep lightweight.

---

## Staff after bootstrap (same Phase 1 surface)

**`/{orgSlug}/settings/staff`**:

- Form: **`username`**, **`password`**, **`name`**, **`role`** (`manager` \| `cashier`; only **owner** creates **managers**).
- **Server-only:** `createUser` (Admin plugin) then **`addMember`** ([lib/actions/staff.ts](../lib/actions/staff.ts)).
- List members, change role, remove member (per better-auth org APIs), **never** expose a public registration URL.

---

## Server rules (security and integrity)

- **Bootstrap gate:** Create-first-user paths must **refuse** when `count(user) > 0`.
- **Staff create:** Only **`member.role`** in `owner` (and `manager` where allowed) may call the create-user server action; always validate on server.
- **Organization create:** Only authenticated users; wizard step 4 runs after session exists.
- **Rate limiting** on bootstrap and staff-create (middleware or server) remains recommended for production.

**Future:** **`organizationHooks.afterCreateOrganization`** could seed rows (e.g. default per-org branding); today **`location`** is written in the wizard via **`updateOrganizationStore`**, and **`store_branding`** is written in step 3.

---

## README contract (for contributors)

Root **README** “First run” should list:

- Prerequisite: Node / pnpm, PostgreSQL (any standard `DATABASE_URL`).
- Env var names (see [`.env.example`](../.env.example)).
- Commands: `pnpm install`, `pnpm db:migrate`, `pnpm dev`.
- URLs: **`/`** → **`/setup`** on empty DB; **`/login`** for return visits.
- **Auth:** “No public sign-up; add staff under **Settings → Staff** after login.”

---

## Acceptance criteria

- [x] Fresh DB + env → migrations → `pnpm dev` → complete wizard → **`/{orgSlug}/dashboard`** without SQL.
- [x] With users present: **`/setup`** bootstrap **blocked**; **`/register`** absent; **`/login`** + username/password works.
- [x] Owner can add a second user from **Settings → Staff**; new user can log in and sees org per **`member`** row.
- [x] README first-run order matches wizard: **owner → branding → organization / location**.

---

## Related docs

- [schema-better-auth-alignment.md](schema-better-auth-alignment.md) — org = store location, `member.role`, **`location`**, **`store_branding`**.
- [blank-pos-dev-plan.md](blank-pos-dev-plan.md) §9 — route groups under `app/` as implemented.
- [storage-uploads.md](storage-uploads.md) — image uploads and `STORAGE_*` env.
- [security/authorization.md](security/authorization.md) — app-layer access control.
- [phases/phase-01-foundation-branding.md](phases/phase-01-foundation-branding.md) — implemented vs deferred (RLS, signed logos, per-org branding).
