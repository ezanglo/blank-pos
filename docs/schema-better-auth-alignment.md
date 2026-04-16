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
3. **All app “tenant” tables** use a foreign key **`organization_id` → `organization.id`** (same string/id type better-auth uses for `organization.id`). Naming in app tables can stay `organization_id` for readability; the referenced table is still singular **`organization`**.
4. **Roles** for POS (`owner` | `manager` | `cashier`) are stored in **`member.role`** (string). Configure **allowed organization roles** in the organization plugin so API and UI stay consistent with better-auth validation.
5. **Active org context** comes from **`session.activeOrganizationId`** (required field when the organization plugin is enabled). Prefer **`auth.api.getSession` / client session** and better-auth’s **active organization** helpers over inventing a second “current org” store.

---

## v1 tenancy: organization = physical site

**In v1, one better-auth `organization` is exactly one retail site** (one storefront, one stock pool, one POS context). There is **no** separate **`locations`** table and **no** `location_id` dimension on sales, inventory, or promotions.

- **Address and site metadata** (street, city, region, postal code, phone, …) live on **`organization`** via **`additionalFields`** (or typed **`metadata`** with a clear schema in code). Do not model “the building” elsewhere unless you reintroduce multi-site later.
- **RLS** only needs **`member.organizationId = row.organization_id`**. No `member_location`, no cashier “branch” picker, no joins through a locations table for tenancy.
- **Multi-branch under one legal entity** (several stores, shared catalog) is **explicitly out of scope** for v1. If you add it later, introduce a real **`locations`** table, migrate `organization_id` usage on stock/transactions, and revisit RLS; until then, **a second store = a second better-auth organization** (separate slug, members, branding).

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
Only the **[onboarding-first-run.md](onboarding-first-run.md)** wizard may create the **first** `user` (the **owner**). This is **not** a global “Sign up” product feature—disable ordinary **sign-up** in better-auth after bootstrap (or gate it so only `count(user) === 0` allows account creation).

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

**POS-specific columns** should not overload the auth model unnecessarily. Recommended split:

- **`default_currency` (or `defaultCurrency`)** — add via the organization plugin’s **`additionalFields`** (or a typed layer on `metadata` if you must). Prefer **additionalFields** if you need RLS and SQL filters on it.
- **Site / mailing address** — same: **`additionalFields`** on **`organization`** (e.g. `addressLine1`, `city`, …) so receipts and settings have a single source of truth.
- **`organization_branding`** — keep a **1:1** app table keyed by **`organization_id` → `organization.id`** for POS/receipt branding (`logo_storage_path`, colors, receipt copy), as in the phase plans. Optionally sync a public thumbnail into **`organization.logo`** in an **`organizationHooks.afterUpdateOrganization`** hook if you want the auth “org logo” to stay in sync; otherwise keep **`organization.logo`** for auth UI only and branding for POS.

**Removing members** — use organization plugin **remove member** / role update APIs so **`member`** rows stay authoritative.

---

## RLS and Supabase

Supabase RLS must resolve **“which orgs may this user touch?”** from data better-auth owns:

- Resolve **`user.id`** for the current request (however your stack passes session to Postgres—e.g. JWT custom claim, or **no direct client Postgres** and only server-side Drizzle with service role; many setups use **server actions only** for mutations and still add RLS as defense in depth).
- **Allow row access** when there exists a **`member`** row with `member.userId = current_user_id` and `member.organizationId = row.organization_id`.

Avoid duplicating membership in a second table that could drift out of sync with **`member`**.

---

## Drizzle and naming

- Prefer **default better-auth model/table names** in Drizzle (`organization`, `member`) to match docs and examples. If you must use plural table names, use the adapter’s **`schema` / `modelName` mapping** explicitly so the CLI and runtime agree ([Drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle)).
- **App tables** (`categories`, `transactions`, …) live in the same Drizzle project; import relations from generated auth schema where useful, but **do not redefine** `organization` / `member` columns by hand—extend via plugin options or separate app tables.

---

## Checklist before Phase 2+

- [ ] **Username** + **Admin** plugins enabled (server + matching clients) for username login and **`createUser`** provisioning.
- [ ] Organization plugin enabled on server and **organizationClient** on client.
- [ ] Auth tables + **`session.activeOrganizationId`** present in DB.
- [ ] **`organization_branding`** (and any other app tables) FK to **`organization.id`**; **no** v1 `locations` / `member_location` unless you have explicitly replanned multi-site.
- [ ] POS roles assigned only through **`member.role`**.
- [ ] No remaining application reads of a legacy `user_roles` / duplicate `organizations` table.

---

## Onboarding

First user and initial org/branding should follow [onboarding-first-run.md](onboarding-first-run.md) so new deployments do not require ad-hoc SQL beyond migrations.
