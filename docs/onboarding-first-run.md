# First-run onboarding (clone → browser setup)

This describes the **guided setup** so someone can **clone the repo**, configure environment variables, run migrations, start the app, and **finish initial configuration entirely in the UI**—no manual SQL or seed scripts required for the happy path.

It belongs to **Phase 1**; see [phases/phase-01-foundation-branding.md](phases/phase-01-foundation-branding.md) for implementation tasks.

**Auth model (v1):** There is **no public user registration**. Only the **bootstrap wizard** creates the first user. Every **other** account is created by an **owner/manager** from org settings with a **username + password** you choose (see [schema-better-auth-alignment.md](schema-better-auth-alignment.md) — Admin + Username plugins, **`createUser`** + **`addMember`**). **No email invite flow.**

---

## Goals

- Create the **first user** (bootstrap **owner** of the first organization).
- Create the **first organization** (v1: **org = store**) with required **site fields** (name, slug, address, phone, **default currency**).
- Configure **branding** (`organization_branding` + optional logo upload) and any other **minimum required** POS settings so the shell and receipts are coherent.
- After completion, land on **`(org)/[orgSlug]/dashboard`** with `session.activeOrganizationId` set.

---

## What still happens outside the browser (unavoidable, keep minimal)

Document these clearly in the root **README** (copy-paste checklist):

1. **Create a Supabase project** (or run **Supabase local** if you add that path).
2. **Copy `.env.example` → `.env.local`** and fill: database URL (or Supabase connection), `NEXT_PUBLIC_SUPABASE_URL`, **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`** (Supabase publishable key; legacy anon JWT is still accepted by the app env parser), server secrets, **better-auth** secret and `BETTER_AUTH_URL` / app URL.
3. **Run migrations** once (`drizzle-kit` / Better Auth migrate—whatever the repo standardizes on) so tables exist **before** the first user exists.

Everything **after** step 3 should be doable from the **frontend wizard**.

---

## Entry and routing

- **Detection:** On app load, if there are **zero users** in the auth `user` table (server-checked), treat the app as **first-run** and send unauthenticated visitors to **`/setup`** (or `/welcome`) instead of `/login`.
- **If users exist but the session user has no organization:** send them to **“Create your store”** (same wizard subset or `/setup/organization`) rather than a broken dashboard.
- **After setup complete:** only **`/login`** for returning users (username + password). **Do not** ship a public **`/register`** route in v1. Middleware protects `(org)/*`.

Avoid leaking precise user counts to anonymous clients if you care about user enumeration; acceptable alternative for OSS is a **`SETUP_COMPLETE=1`** env set after first deploy, but the **recommended** approach is **server-only** `count(users) === 0` for routing so clone-and-run works without extra env toggles.

---

## Wizard steps (recommended order)

Use a **single linear wizard** with progress (shadcn steps or simple numbered sections). Persist progress in **session** where possible so refresh does not lose the account step after the bootstrap user is created.

1. **Welcome** — Short copy: connect Supabase, run migrations, then continue here.
2. **Bootstrap owner** — **`username`**, **`password`**, and **display name** (and **optional email** only if you require it for better-auth / recovery—otherwise omit from UI per [schema-better-auth-alignment.md](schema-better-auth-alignment.md)).  
   - Use a **server action** that only runs when `count(user) === 0`, internally calling better-auth **Admin `createUser`** + establishing session, **or** a one-time gated sign-up path wired exclusively to `/setup`.  
   - This user will become **owner** in step 3.
3. **Store / organization** — Collect: **display name**, **slug** (with **checkSlug** from better-auth client), **default currency** (select), **address** and **phone** (stored on **`organization` additionalFields**).  
   - Submit: **`authClient.organization.create`** (or server `createOrganization`) so **`organization` + `member` (owner)** exist for the bootstrap user.  
   - Set **active organization** on the session immediately after create.
4. **Branding** — Colors, optional logo upload, receipt header/footer, display name override if needed. Writes **`organization_branding`** and applies **CSS variables** preview.
5. **Review & finish** — Summary; button **“Go to dashboard”** → `(org)/[orgSlug]`.

Optional **step 0** “Verify connectivity” (ping Supabase) only if it reduces support burden; keep lightweight.

---

## Staff after bootstrap (same Phase 1 surface)

Implement **`(org)/[orgSlug]/settings/staff`** (or **Users**):

- Form: **`username`**, **`password`**, **`name`**, **`role`** (`manager` | `cashier`; only **owner** creates **managers** if you want that rule).
- **Server-only:** `createUser` (Admin plugin) then **`addMember`** for `session.activeOrganizationId`.
- List members, change role, remove member (per better-auth org APIs), **never** expose a public registration URL.

---

## Server rules (security and integrity)

- **Bootstrap gate:** The endpoint that creates the first user must **refuse** when `count(user) > 0`. No second bootstrap user via UI.
- **Global sign-up disabled:** In better-auth config, **disable** open `signUp` for the product surface; only `/setup` uses the gated create path (or only server `createUser` with zero-user check).
- **Staff create:** Only **`member.role`** in `owner` (and optionally `manager` if you allow) may call the create-user server action; always validate on server.
- **Organization create:** Only authenticated users; wizard step 3 runs after session exists.
- **Rate limiting** on bootstrap account creation and on staff-create (middleware or server) to reduce abuse.
- **Hooks:** Use **`organizationHooks.afterCreateOrganization`** to insert default **`organization_branding`** if step 4 is skipped (defaults only), so DB is never missing a branding row.

---

## README contract (for contributors)

Add a **“First run”** section to the README with:

- Prerequisite links (Supabase, Node version).
- Env var table (name + purpose + required/optional).
- Commands: `pnpm install`, `pnpm db:migrate` (or actual script names), `pnpm dev`.
- URL: **`http://localhost:3000/setup`** (or auto-redirect from `/`).
- **Auth:** “No public sign-up; add cashiers under Settings → Staff after login.”
- Screenshot or one-line “you should see the wizard.”
- **Troubleshooting:** migrations not run, wrong `BETTER_AUTH_URL`, CORS/cookies on non-localhost.

---

## Acceptance criteria

- [ ] Fresh DB + env → migrations → `pnpm dev` → complete wizard → dashboard with branding visible **without** running SQL.
- [ ] With users present: **`/setup`** bootstrap **blocked**; **`/register`** absent or returns 404; **`/login`** + username/password works.
- [ ] Owner can add a second user from **Settings → Staff** with username/password; new user can log in and sees org per **`member`** row.
- [ ] README first-run section matches real routes and scripts.

---

## Related docs

- [schema-better-auth-alignment.md](schema-better-auth-alignment.md) — org = store, `member.role`, **User lifecycle (v1)**, plugins.
- [blank-pos-dev-plan.md](blank-pos-dev-plan.md) §9 — extend folder tree with `app/(setup)/` and settings staff routes as implemented.
