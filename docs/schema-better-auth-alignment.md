# Schema alignment with better-auth

This document is the **source of truth** for how Blank POS Postgres schema relates to **better-auth** so we can use **built-in user and organization APIs** (create org, members, roles, active organization) without duplicating or fighting the auth layer.

Official references:

- [Organization plugin](https://www.better-auth.com/docs/plugins/organization) (tables, session fields, hooks)
- [Admin plugin](https://www.better-auth.com/docs/plugins/admin) (server-side **`createUser`** for staff provisioning)
- [Drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle) (schema generation, `modelName` mapping)

---

## Principles

1. **Do not hand-roll parallel tables** for core tenancy or membership. Use the plugin’s **`organization`** and **`member`** tables as better-auth defines them. The **`invitation`** table may exist from the organization plugin schema but **v1 does not use email invites** for staff; see **User lifecycle (v1)** below.
2. **Generate auth schema from the tool** for the exact plugins you enable: run the Better Auth CLI (`pnpm auth:schema`) and treat that output as authoritative; wire **Drizzle** via the official adapter so runtime ([`lib/auth.ts`](../lib/auth.ts)) and [`lib/auth.config.ts`](../lib/auth.config.ts) (CLI-only) stay aligned.
3. **App tables scoped to the organization (business)** use **`organization_id` → `organization.id`** where the row belongs to the whole tenant (e.g. **`business_details`**). **App tables scoped to a physical branch** use **`location.id`** (Postgres table `location`; Drizzle symbol **`businessLocation`**) and **`location.organization_id`** for membership checks. Multiple **`organization`** rows mean **multiple businesses** on one database; each has **many** **`location`** rows (branches).
4. **Roles** for POS (`owner` | `manager` | `cashier`) are stored in **`member.role`** (string). Allowed organization roles are configured in the organization plugin in [`lib/auth.ts`](../lib/auth.ts).
5. **Active organization context** comes from **`session.activeOrganizationId`**. Prefer **`auth.api.getSession` / client session** and better-auth’s **`organization.setActive`** when switching businesses (see **Business switcher** in the shell). **Active branch** is carried in the URL: **`/{businessSlug}/l/{locationSlug}/…`** (path is authoritative for RSC).

---

## Tenancy: organization = business; `location` = branch

**One better-auth `organization`** is one **business** (team, org-level profile, shared settings). **Branches** are rows in the app-owned **`location`** table: many per **`organization_id`**, each with **`slug`** (unique per org), **`name`**, **`is_default`**, address fields, and **`default_currency`**.

- **Receipts / POS context** for a branch read from the **`location`** row selected by **`/{businessSlug}/l/{locationSlug}`**. See [`lib/db/schema-app.ts`](../lib/db/schema-app.ts).
- **`business_details`** is **1:1 with `organization.id`**: primary key **`organization_id` → `organization.id`**, cascade on delete. Holds display/legal/contact, optional onboarding fields (`business_category`, `team_scale_band`, `expected_go_live`), shell colors, logo URLs, receipt copy. **`/login`** uses static **Blank POS** app branding, not this table. Optional **`default_currency`** is the **business-level default** for **new/edited** catalog **`product_price`** and **`product_addon`** rows (via [`getDefaultCatalogCurrencyCode`](../lib/queries/catalog-currency.ts), with fallback to the default branch’s **`location.default_currency`**); **branch receipts and POS** still use the active **`location.default_currency`** where applicable unless the app overrides in UI.
- **`user_profile`** is **1:1 with `user.id`**: person-level optional fields (phone, locale, marketing intent); separate from **`member`**.

Optional better-auth **teams** remain off unless you later map teams to branches.

---

## Tables owned by better-auth (organization plugin)

Per the [Organization schema](https://www.better-auth.com/docs/plugins/organization#schema) (verify field names against your generated Drizzle schema after upgrades):

- **`organization`** — `id`, `name`, `slug`, optional `logo`, optional `metadata`, `createdAt`, etc.
- **`member`** — `id`, `userId`, `organizationId`, `role`, `createdAt` — v1 uses role only (no custom job title on **`member`**).
- **`invitation`** — exists if the organization plugin migration includes it; **not used** for Blank POS v1 staff onboarding.
- **`session`** — extended with **`activeOrganizationId`** (and **`activeTeamId`** only if you enable teams)

Core auth tables (`user`, `account`, `verification`, …) remain better-auth’s responsibility. **`user`** uses **email** as the credential identifier (no Username plugin).

---

## User lifecycle (v1): email sign-up + email login + admin team provisioning

**Public sign-up**  
[`lib/auth.ts`](../lib/auth.ts) sets **`emailAndPassword.disableSignUp: false`**. New users register at **`/signup`** with **`authClient.signUp.email`** (`email`, `password`, `name`). Email verification is **off** until SMTP is configured (see README / follow-ups).

**First business**  
After sign-in, users who cannot yet open a branch dashboard complete **`/onboarding`**: **`authClient.organization.create`**, optional branding on **`business_details`** in the same step, then first **`location`**. The organization creator is **`member.role` = `owner`**. (**`user_profile`** can be added in settings later; v1 onboarding does not collect it.)

**Team**  
Owners (and managers where allowed) add users from **Settings → Team** with a **real email**, temporary password, display name, and role:

1. **Server-only** [`lib/actions/staff.ts`](../lib/actions/staff.ts): **`auth.api.createUser`** with **`email`** + **`password`** + **`name`**, then **`addMember`** with **`member.role`** (`manager` | `cashier`).
2. New members sign in at **`/login`** with **`authClient.signIn.email`**.

**Multi-branch**  
If a user can open **more than one** `(organization, location)` pair, **`/`** and post-login redirects send them to **`/choose-location`** before landing on a dashboard.

---

## Extending org data without breaking the plugin

**POS-specific columns** should not overload the auth model unnecessarily. **Current repo split:**

- **Branch address / phone / default currency** — on **`location`** (`id` PK, **`organization_id`**, **`slug`**, **`name`**, **`is_default`**, …). Created in onboarding via **`createFirstLocationAfterOrgCreate`**; updated from **Location** settings ([`lib/actions/organization.ts`](../lib/actions/organization.ts)).
- **Org-level profile / branding / onboarding extras** — on **`business_details`** (PK **`organization_id`**). Upserted from onboarding and **Settings → Business settings** ([`lib/actions/branding.ts`](../lib/actions/branding.ts)) via **`patchBusinessDetails`** / **`updateBusinessDetails`** / **`setupPhaseSaveBusinessDetails`**.
- **Person extras** — on **`user_profile`** ([`lib/actions/user-profile.ts`](../lib/actions/user-profile.ts)).
- **`organization.logo` / `metadata`** — reserved for better-auth plugin defaults; avoid duplicating full **`business_details`** here unless you add an explicit sync hook.

**Removing members** — use organization plugin **remove member** / role update APIs so **`member`** rows stay authoritative.

---

## Authorization and optional RLS

**Today:** the app talks to Postgres through **server-side Drizzle** (`DATABASE_URL`), with **membership enforced in application code**. See **[docs/security/authorization.md](security/authorization.md)**.

If you add **Postgres RLS** later:

- **Org-scoped rows:** allow when **`member.userId`** matches and **`member.organizationId = row.organization_id`**.
- **Branch-scoped rows:** allow when a **`location`** row exists with **`location.id = row.location_id`** and the user is a **`member`** of **`location.organization_id`**.

---

## Drizzle and naming

- Prefer **default better-auth model/table names** in Drizzle (`organization`, `member`) to match docs and examples.
- **App tables** live in the same Drizzle project; import relations from generated auth schema where useful, but **do not redefine** `organization` / `member` columns by hand.

---

## Checklist — foundation (Phase 1) and catalog (Phase 2)

- [x] **Email** sign-in and **public email sign-up** enabled (`disableSignUp: false`); **Admin** plugin for **`createUser`** (staff).
- [x] Organization plugin enabled on server and **organizationClient** on client.
- [x] Auth tables + **`session.activeOrganizationId`** present in DB.
- [x] App table **`location`** (many per **`organization_id`**); **`business_details`** per **`organization_id`** (including optional **`default_currency`** for catalog defaults); **`user_profile`** per **`user.id`**.
- [x] POS roles assigned only through **`member.role`**.
- [x] No parallel custom `organizations` / `user_roles` tables duplicating auth.
- [x] **Phase 2 catalog** tables and org admin UI — see [`lib/db/schema-catalog.ts`](../lib/db/schema-catalog.ts) and [phases/phase-02-product-engine.md](phases/phase-02-product-engine.md) (`/{businessSlug}/catalog/…`).

Optional:

- [ ] **RLS** policies for org-scoped and location-scoped app tables.

---

## Onboarding

First account, first business, first branch, and branding should follow [onboarding-first-run.md](onboarding-first-run.md) so new deployments do not require ad-hoc SQL beyond migrations.
