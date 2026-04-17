# Schema alignment with better-auth

This document is the **source of truth** for how Blank POS Postgres schema relates to **better-auth** so we can use **built-in user and organization APIs** (create org, members, roles, active organization) without duplicating or fighting the auth layer.

Official references:

- [Organization plugin](https://www.better-auth.com/docs/plugins/organization) (tables, session fields, hooks)
- [Username plugin](https://www.better-auth.com/docs/plugins/username) (username + password sign-in)
- [Admin plugin](https://www.better-auth.com/docs/plugins/admin) (server-side **`createUser`** for staff provisioning)
- [Drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle) (schema generation, `modelName` mapping)

---

## Principles

1. **Do not hand-roll parallel tables** for core tenancy or membership (no custom `organizations` + `user_roles` that mirror auth). Use the plugin’s **`organization`** and **`member`** tables as better-auth defines them. The **`invitation`** table may exist from the organization plugin schema but **v1 does not use email invites** for staff; see **User lifecycle (v1)** below.
2. **Generate auth schema from the tool** for the exact plugins you enable: run the Better Auth CLI (`auth migrate` / `auth generate` per current docs) and treat that output as authoritative; wire **Drizzle** via the official adapter so runtime and migrations stay aligned.
3. **App tables scoped to the store** use **`organization_id` → `organization.id`** where the row belongs to the whole store (e.g. **`store_branding`**). **App tables scoped to a physical branch** use **`location.id`** (and **`location.organization_id`** for store membership checks). Multiple **`organization`** rows on one database mean **multiple stores** (multi-tenant-ready); each store has **many** **`location`** rows (branches).
4. **Roles** for POS (`owner` | `manager` | `cashier`) are stored in **`member.role`** (string). Configure **allowed organization roles** in the organization plugin so API and UI stay consistent with better-auth validation.
5. **Active store context** comes from **`session.activeOrganizationId`**. Prefer **`auth.api.getSession` / client session** and better-auth’s **`organization.setActive`** when switching stores. **Active branch** is carried in the URL: **`/{storeSlug}/l/{locationSlug}/…`** (path is authoritative for RSC).

---

## Tenancy: organization = store; `location` = branch

**One better-auth `organization` is one store** (team, branding, shared settings). **Branches** (physical sites, per-branch currency and address) are rows in the app-owned **`location`** table: many per **`organization_id`**, each with **`slug`** (unique per store), **`name`**, **`is_default`**, address fields, and **`default_currency`**.

- **Receipts / POS context** for a branch read from the **`location`** row selected by **`/{storeSlug}/l/{locationSlug}`**. See [lib/db/schema-app.ts](../lib/db/schema-app.ts).
- **`store_branding`** is **1:1 with `organization.id`**: primary key **`organization_id` → `organization.id`**, cascade on delete. Shell and receipt styling **after sign-in** for that store; **`/login`** uses static **Blank POS** app branding, not this table. Not keyed by `location`.
- **Optional Postgres RLS** (if added later) should key store-scoped rows off **`member.organizationId`**, and branch-scoped rows off **`location.id`** with a join proving **`location.organization_id`** is a store the user belongs to. Today, access is enforced in **application code** ([docs/security/authorization.md](security/authorization.md)).

Optional better-auth **teams** remain off unless you later map teams to branches.

---

## Tables owned by better-auth (organization plugin)

Per the [Organization schema](https://www.better-auth.com/docs/plugins/organization#schema) (verify field names against your generated Drizzle schema after upgrades):

- **`organization`** — `id`, `name`, `slug`, optional `logo`, optional `metadata`, `createdAt`, etc.
- **`member`** — `id`, `userId`, `organizationId`, `role`, `createdAt`
- **`invitation`** — exists if the organization plugin migration includes it; **not used** for Blank POS v1 staff onboarding (no invite-by-email flow).
- **`session`** — extended with **`activeOrganizationId`** (and **`activeTeamId`** only if you enable teams)

Core auth tables (`user`, `account`, `verification`, …) remain better-auth’s responsibility the same way.

---

## User lifecycle (v1): no public registration; admin-created staff

**Bootstrap (once per empty database)**  
Only the **[onboarding-first-run.md](onboarding-first-run.md)** wizard may create the **first** `user` (the **owner**). This is **not** a global “Sign up” product feature. The server sets **`emailAndPassword.disableSignUp: true`** in [lib/auth.ts](../lib/auth.ts) so **`POST /api/auth/sign-up/email`** (and client **`signUp.email`**) return **`EMAIL_PASSWORD_SIGN_UP_DISABLED`**. **`emailAndPassword.enabled`** stays **`true`** so password hashes and credential accounts created by the **Admin** plugin (`createUser`) and used by **`signIn.username`** keep working. The bootstrap action still enforces **`count(user) === 0`** before calling **`auth.api.createUser`**.

**All other users**  
Owners (and optionally **managers**, per your RBAC) add staff from **Settings → Staff** under a store:

1. **Server-only** action (must check `member.role`): create credentials with the **[Admin plugin](https://www.better-auth.com/docs/plugins/admin)** **`auth.api.createUser`** (or equivalent server API) supplying **`username`**, **`password`**, and **`name`** (and **`email`** only if your better-auth / DB layer still requires a unique email—then use a controlled placeholder pattern or collect an optional work email; document the chosen rule in code comments).
2. Immediately add them to the store with the **[Organization plugin](https://www.better-auth.com/docs/plugins/organization)** **`addMember`** with the desired **`member.role`** (`manager` | `cashier`).

**Login**  
Staff sign in with **`signIn.username`** from the **[Username plugin](https://www.better-auth.com/docs/plugins/username)** (`username` + `password`). No invite links, no self-registration, no magic-link requirement for v1 unless you add it later.

**Password hygiene**  
Document in the UI that the admin sets an **initial password**; optional follow-up: “force change on first login” as a later enhancement (not required for v1 plan).

---

## Extending org data without breaking the plugin

**POS-specific columns** should not overload the auth model unnecessarily. **Current repo split:**

- **Branch address / phone / default currency** — on app table **`location`** (`id` PK, **`organization_id`**, **`slug`**, **`name`**, **`is_default`**, …). Created on setup in a **separate wizard step** after the store exists, via **`createFirstLocationAfterOrgCreate`**; updated per branch from **Location** settings ([lib/actions/organization.ts](../lib/actions/organization.ts)).
- **Store branding** — on **`store_branding`** with PK **`organization_id`**. Upserted from setup (per store) and **Settings → Branding** ([lib/actions/branding.ts](../lib/actions/branding.ts)).
- **`organization.logo` / `metadata`** — reserved for better-auth plugin defaults; do not duplicate full branding here unless you add an explicit sync hook later.

**Removing members** — use organization plugin **remove member** / role update APIs so **`member`** rows stay authoritative.

---

## Authorization and optional RLS

**Today:** the app talks to Postgres through **server-side Drizzle** (`DATABASE_URL`), with **membership enforced in application code**. See **[docs/security/authorization.md](security/authorization.md)**.

If you add **Postgres RLS** later:

- **Store-scoped rows:** allow when **`member.userId`** matches and **`member.organizationId = row.organization_id`**.
- **Branch-scoped rows:** allow when a **`location`** row exists with **`location.id = row.location_id`** and the user is a **`member`** of **`location.organization_id`**.

Avoid duplicating membership in a second table that could drift out of sync with **`member`**.

---

## Drizzle and naming

- Prefer **default better-auth model/table names** in Drizzle (`organization`, `member`) to match docs and examples. If you must use plural table names, use the adapter’s **`schema` / `modelName` mapping** explicitly so the CLI and runtime agree ([Drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle)).
- **App tables** (`categories`, `transactions`, …) live in the same Drizzle project; import relations from generated auth schema where useful, but **do not redefine** `organization` / `member` columns by hand—extend via plugin options or separate app tables.

---

## Checklist before Phase 2+

- [x] **Username** + **Admin** plugins enabled (server + matching clients) for username login and **`createUser`** provisioning.
- [x] Organization plugin enabled on server and **organizationClient** on client.
- [x] Auth tables + **`session.activeOrganizationId`** present in DB (per better-auth organization plugin).
- [x] App table **`location`** (many per **`organization_id`**, branch **`slug`**); **`store_branding`** per **`organization_id`**.
- [x] POS roles assigned only through **`member.role`**.
- [x] No parallel custom `organizations` / `user_roles` tables duplicating auth.

Optional before exposing Postgres directly to clients:

- [ ] **RLS** policies for org-scoped and location-scoped app tables, aligned with **`member`** and **`location`**.

---

## Onboarding

First user, first store, first branch, and branding should follow [onboarding-first-run.md](onboarding-first-run.md) so new deployments do not require ad-hoc SQL beyond migrations.
