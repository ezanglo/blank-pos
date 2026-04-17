# First-run onboarding (clone → browser setup)

This describes the **guided setup** so someone can **clone the repo**, configure environment variables, run migrations, start the app, and **finish initial configuration entirely in the UI**—no manual SQL or seed scripts required for the happy path.

It belongs to **Phase 1**; see [phases/phase-01-foundation-branding.md](phases/phase-01-foundation-branding.md) for scope and deferred items.

**Auth model (v1):** There is **no public user registration**. Only the **bootstrap wizard** creates the first user. Every **other** account is created by an **owner/manager** from **Settings → Staff** with a **username + password** you choose (see [schema-better-auth-alignment.md](schema-better-auth-alignment.md) — Admin + Username plugins, **`createUser`** + **`addMember`**). **No email invite flow.**

---

## Goals

- Create the **first user** (bootstrap **owner**).
- Create the **first store** (**`organization`**) via **`authClient.organization.create`** (store slug is **suggested** from the store name, editable, with debounced availability checks). Server **`seedInitialStoreBrandingAfterOrgCreate`** inserts **`store_branding`** with **display name = organization name**. Then the **first branch** (**`location`**) in a separate step via **`createFirstLocationAfterOrgCreate`** (location slug suggested from name, editable, debounced check within the store; currency, address).
- Save **per-store branding** on **`store_branding`** (`organization_id` PK) via **`setupPhaseSaveStoreBranding(storeSlug, …)`** after the store exists.
- After completion, land on **`/{storeSlug}/l/{locationSlug}/dashboard`** with organization session context set.

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
- **If users exist:** **`/setup`** is for **signed-in** users only. Anonymous visitors are sent to **`/login`**. If the session already has a resolvable branch dashboard, **`/setup`** redirects there; if the user is still mid-wizard (no org yet, or a store without any **`location`**), the layout allows **`/setup`** to render ([app/setup/layout.tsx](../app/setup/layout.tsx), [lib/dashboard-path.ts](../lib/dashboard-path.ts) **`userShouldContinueSetupWizard`**).
- **After setup complete:** returning users use **`/login`** only. **Do not** ship a public **`/register`** route in v1. Authenticated app routes live under **`(protected)`** ([app/(protected)/](../app/(protected)/)).

Avoid leaking precise user counts to anonymous clients if you care about user enumeration; the repo uses **server-only** `count(users) === 0` for routing.

---

## Wizard steps (actual order in repo)

Single linear wizard in [components/setup/setup-wizard.tsx](../components/setup/setup-wizard.tsx). Persist sensitive steps in **session** (user is created and signed in before the store exists).

1. **Welcome** — Short copy; continue to owner step.
2. **Bootstrap owner** — **`username`**, **`password`**, **display name**. Server **`bootstrapCreateOwner`** (gated `count(user) === 0`) then **`authClient.signIn.username`** so the session exists.
3. **Store** — **Store name** and editable **store web slug** (suggested from name; debounced **`checkSetupStoreSlugAvailable`** in [lib/actions/setup-slugs.ts](../lib/actions/setup-slugs.ts)). Client **`authClient.organization.create`**, then **`seedInitialStoreBrandingAfterOrgCreate`** ([lib/actions/branding.ts](../lib/actions/branding.ts)); suggestion helper in [lib/slugify-web-segment.ts](../lib/slugify-web-segment.ts).
4. **First location** — **Location name**, editable **location slug** (suggested; **`checkSetupLocationSlugAvailable`**), **default currency**, address fields, phone. Server **`createFirstLocationAfterOrgCreate(storeSlug, …)`** ([lib/actions/organization.ts](../lib/actions/organization.ts)).
5. **Branding (this store)** — Display name and optional **logo** (refines the row from step 3). **`setupPhaseSaveStoreBranding(storeSlug, …)`** ([lib/actions/branding.ts](../lib/actions/branding.ts)). Redirect to **`/{storeSlug}/l/{locationSlug}/dashboard`**.

Optional **step 0** “Verify connectivity” only if it reduces support burden; keep lightweight.

---

## Staff after bootstrap (same Phase 1 surface)

**`/{storeSlug}/settings/staff`**:

- Form: **`username`**, **`password`**, **`name`**, **`role`** (`manager` \| `cashier`; only **owner** creates **managers**).
- **Server-only:** `createUser` (Admin plugin) then **`addMember`** ([lib/actions/staff.ts](../lib/actions/staff.ts)).
- List members, change role, remove member (per better-auth org APIs), **never** expose a public registration URL.

---

## Server rules (security and integrity)

- **Bootstrap gate:** Create-first-user paths must **refuse** when `count(user) > 0`.
- **Staff create:** Only **`member.role`** in `owner` (and `manager` where allowed) may call the create-user server action; always validate on server.
- **Organization create:** Only authenticated users; wizard store step runs after session exists.
- **Rate limiting** on bootstrap and staff-create (middleware or server) remains recommended for production.

**Future:** **`organizationHooks.afterCreateOrganization`** could seed rows (e.g. default branding); today **`location`** is written in the wizard on the **First location** step via **`createFirstLocationAfterOrgCreate`**, and **`store_branding`** in the branding step.

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

- [x] Fresh DB + env → migrations → `pnpm dev` → complete wizard → **`/{storeSlug}/l/{locationSlug}/dashboard`** without SQL.
- [x] With users present: anonymous **`/setup`** blocked (→ **`/login`**); signed-in incomplete onboarding can finish **`/setup`**; **`/register`** absent; **`/login`** + username/password works.
- [x] Owner can add a second user from **Settings → Staff**; new user can log in and sees stores per **`member`** rows.
- [x] README first-run order matches wizard: **owner → store → first location → branding**.

---

## Related docs

- [schema-better-auth-alignment.md](schema-better-auth-alignment.md) — store vs branch, `member.role`, **`location`**, **`store_branding`**.
- [blank-pos-dev-plan.md](blank-pos-dev-plan.md) §9 — route groups under `app/` as implemented.
- [storage-uploads.md](storage-uploads.md) — image uploads and `STORAGE_*` env.
- [security/authorization.md](security/authorization.md) — app-layer access control.
- [phases/phase-01-foundation-branding.md](phases/phase-01-foundation-branding.md) — implemented vs deferred.
