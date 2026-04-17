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
3. **All app tables scoped to a store location** use a foreign key **`organization_id` → `organization.id`** (same string/id type better-auth uses for `organization.id`). Naming in app tables can stay `organization_id` for readability; the referenced table is still singular **`organization`**. One deployment serves **one business**; multiple **`organization`** rows mean **multiple store locations**, not unrelated SaaS tenants on one DB.
4. **Roles** for POS (`owner` | `manager` | `cashier`) are stored in **`member.role`** (string). Configure **allowed organization roles** in the organization plugin so API and UI stay consistent with better-auth validation.
5. **Active org context** comes from **`session.activeOrganizationId`** (required field when the organization plugin is enabled). Prefer **`auth.api.getSession` / client session** and better-auth’s **active organization** helpers over inventing a second “current org” store.

---

## v1 tenancy: organization = physical site (+ `location` row)

**In v1, one better-auth `organization` is exactly one retail site** (one storefront, one stock pool, one POS context). There is **no** `location_id` dimension on sales, inventory, or promotions—**`organization_id`** is the tenancy key.

- **Address, phone, and default currency** live in the app-owned Drizzle table **`location`**, **1:1** with **`organization.id`** (`organization_id` as primary key → `organization.id`). This keeps the better-auth **`organization`** table plugin-canonical while still giving SQL-friendly columns for receipts and settings. See [lib/db/schema-app.ts](../lib/db/schema-app.ts).
- **Shared branding and receipt-oriented copy** (display name, colors, optional logo URL or upload path, etc.) live in **`store_branding`**, a **single global row** (`id = default`) used for login chrome and the org app shell. It is **not** per-organization today; if multiple brands per shop are needed, add a per-org table later and migrate.
- **Optional Postgres RLS** (if added later) should key off **`member.organizationId = row.organization_id`** for org-scoped tables. The **`location`** row shares the same `organization_id` as the org. Today, access is enforced in **application code** ([docs/security/authorization.md](security/authorization.md)).
- **Multi-branch under one legal entity** (several stores, shared catalog) is **out of scope** for v1. Until then, **a second store = a second better-auth organization** (separate slug, members, `location` row).

Optional better-auth **teams** remain off unless you later map teams to branches; they are not required for v1.

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
Owners (and optionally **managers**, per your RBAC) add staff from **Settings → Staff / Users** in the org shell:

1. **Server-only** action (must check `member.role`): create credentials with the **[Admin plugin](https://www.better-auth.com/docs/plugins/admin)** **`auth.api.createUser`** (or equivalent server API) supplying **`username`**, **`password`**, and **`name`** (and **`email`** only if your better-auth / DB layer still requires a unique email—then use a controlled placeholder pattern or collect an optional work email; document the chosen rule in code comments).
2. Immediately add them to the active organization with the **[Organization plugin](https://www.better-auth.com/docs/plugins/organization)** **`addMember`** (or server `organization.addMember`) with the desired **`member.role`** (`manager` | `cashier`).

**Login**  
Staff sign in with **`signIn.username`** from the **[Username plugin](https://www.better-auth.com/docs/plugins/username)** (`username` + `password`). No invite links, no self-registration, no magic-link requirement for v1 unless you add it later.

**Password hygiene**  
Document in the UI that the admin sets an **initial password**; optional follow-up: “force change on first login” as a later enhancement (not required for v1 plan).

---

## Extending org data without breaking the plugin

**POS-specific columns** should not overload the auth model unnecessarily. **Current repo split:**

- **`default_currency`** and **mailing address / phone** — on app table **`location`**, FK **`organization_id` → `organization.id`**, one row per org. Updated from org settings and setup wizard ([lib/db/schema-app.ts](../lib/db/schema-app.ts), `updateOrganizationStore`).
- **Shared branding** — on **`store_branding`** (single row). Optional **`logo_storage_path`** reserved for future private object keys; today the UI uses **`logo_image_url`** (https or **`/uploads/...`** from [docs/storage-uploads.md](storage-uploads.md)). Receipt header/footer, colors, and legal/tax placeholders also live here when used.
- **`organization.logo` / `metadata`** — reserved for better-auth plugin defaults; do not duplicate full branding here unless you add an explicit sync hook later.

**Removing members** — use organization plugin **remove member** / role update APIs so **`member`** rows stay authoritative.

---

## Authorization and optional RLS

**Today:** the app talks to Postgres through **server-side Drizzle** (`DATABASE_URL`), with **membership enforced in application code**. See **[docs/security/authorization.md](security/authorization.md)**.

If you add **Postgres RLS** later, resolve **which organizations may this user touch?** from better-auth data:

- Resolve **`user.id`** for the current request.
- **Allow row access** when there exists a **`member`** row with `member.userId = current_user_id` and `member.organizationId = row.organization_id` (including for **`location`** rows keyed by `organization_id`).

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
- [x] App table **`location`** (1:1 **`organization_id`**) for site + default currency; **`store_branding`** for shared branding. No separate multi-site **`locations`** hierarchy or `member_location` in v1.
- [x] POS roles assigned only through **`member.role`**.
- [x] No parallel custom `organizations` / `user_roles` tables duplicating auth.

Optional before exposing Postgres directly to clients:

- [ ] **RLS** policies for org-scoped app tables, aligned with **`member`**.

---

## Onboarding

First user and initial org/branding should follow [onboarding-first-run.md](onboarding-first-run.md) so new deployments do not require ad-hoc SQL beyond migrations.
