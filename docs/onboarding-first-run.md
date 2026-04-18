# First-run and post-signup onboarding

This describes how someone can **clone the repo**, configure **`.env`**, run **migrations**, start the app, and complete **signup + onboarding** in the browser—no manual SQL for the happy path.

It belongs to **Phase 1**; see [phases/phase-01-foundation-branding.md](phases/phase-01-foundation-branding.md) for scope and deferred items.

**Auth model (v1):** **Email + password** for **`/signup`** and **`/login`**. The **first user** (and any later user) self-registers at **`/signup`**. **Team members** are created by **owner/manager** from **Settings → Team** with a **real email** + temporary password ([`lib/actions/staff.ts`](../lib/actions/staff.ts) — Admin **`createUser`** + **`addMember`**). **No email invite flow** yet.

---

## Goals

- **Empty `user` table:** landing **`/`** sends visitors to **`/signup`** so the install can bootstrap without SQL.
- **After signup / login:** resolve **dashboard**, **`/choose-location`** (multiple accessible branches), or **`/onboarding`** (no membership yet, or org exists with **zero** `location` rows) via [`lib/dashboard-path.ts`](../lib/dashboard-path.ts) and [`lib/actions/nav.ts`](../lib/actions/nav.ts).
- **Onboarding** (signed-in): create **`organization`** (business slug), optional branding on the same step (**`setupPhaseSaveBusinessDetails`** after seed), first **`location`** via **`createFirstLocationAfterOrgCreate`**, then open **`/{businessSlug}/l/{locationSlug}/dashboard`**. (Person-level **`user_profile`** is deferred in the UI; the table remains for later settings.)

---

## Outside the browser (minimal checklist)

Documented in the root **README**:

1. **PostgreSQL** and **`DATABASE_URL`**.
2. **`.env`** from [`.env.example`](../.env.example): `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`, **`STORAGE_*`** ([storage-uploads.md](storage-uploads.md)).
3. **`pnpm db:migrate`** before first use. If upgrading from an older schema, **reset the database** and re-run migrations (see README).

**Optional demo data (POS / catalog):** after migrations, **`pnpm db:seed:coffee`** loads a sample coffee-shop catalog for an org (see [phases/phase-03-pos-mvp.md](phases/phase-03-pos-mvp.md) — *Optional — demo catalog seed*).

---

## Routes (implemented)

| Route | Purpose |
|-------|---------|
| **`/`** | If no users → **`/signup`**; if signed in → **`/choose-location`** when needed, else dashboard, else **`/onboarding`**, else **`/login`** ([`app/page.tsx`](../app/page.tsx)). |
| **`/signup`** | Public registration ([`app/(auth)/signup/`](../app/(auth)/signup/)). |
| **`/login`** | Email sign-in ([`app/(auth)/login/`](../app/(auth)/login/)). |
| **`/onboarding`** | Signed-in wizard when user cannot open a branch yet ([`app/(protected)/onboarding/`](../app/(protected)/onboarding/)). |
| **`/choose-location`** | When user has **>1** accessible branch; pick org + branch, **`organization.setActive`**, then dashboard ([`app/(protected)/choose-location/`](../app/(protected)/choose-location/)). |
| **`/{businessSlug}/catalog/categories`**, **`/{businessSlug}/catalog/products`**, **`/{businessSlug}/catalog/inventory`** | Org-wide **Catalog** admin (Phase 2–3). **Categories** also hosts **variants**, **special instructions**, and **add-ons** per category (dialogs); **`/catalog/add-ons`** redirects to **categories**. Writes require **`owner`** / **`manager`**. See [`docs/phases/phase-02-product-engine.md`](phases/phase-02-product-engine.md), [`docs/phases/phase-03-pos-mvp.md`](phases/phase-03-pos-mvp.md). |

Shared step UI lives under [`components/setup/setup-steps.tsx`](../components/setup/setup-steps.tsx) (reused by [`components/onboarding/onboarding-wizard.tsx`](../components/onboarding/onboarding-wizard.tsx)); there is **no** `/setup` app route.

---

## Onboarding steps (order in repo)

1. **Business + branding** — name, web slug, optional logo / category / team scale / go-live; **`authClient.organization.create`**, **`seedInitialBusinessDetailsAfterOrgCreate`**, **`setupPhaseSaveBusinessDetails`** ([`lib/actions/branding.ts`](../lib/actions/branding.ts)); slug checks in [`lib/actions/setup-slugs.ts`](../lib/actions/setup-slugs.ts).
2. **First location** — name, slug, currency, address → **`createFirstLocationAfterOrgCreate(businessSlug, …)`** ([`lib/actions/organization.ts`](../lib/actions/organization.ts)), then redirect to **`/{businessSlug}/l/{locationSlug}/dashboard`**.

---

## Team (after the first business exists)

**`/{businessSlug}/settings/staff`** (labeled **Team** in the sidebar under Administration):

- UI: **search**, **Add member** (dialog), and a **paginated table** with view / edit role / remove (dialogs).
- Add member: **email**, **password**, **name**, **role** (`manager` | `cashier`; only **owner** creates **managers**).
- Server: **`staffCreateUser`** (`createUser` + `addMember`), **`staffUpdateMemberRole`**, **`staffRemoveMember`** ([`lib/actions/staff.ts`](../lib/actions/staff.ts)).

---

## Related docs

- [schema-better-auth-alignment.md](schema-better-auth-alignment.md) — tenancy, tables, checklist.
- [blank-pos-dev-plan.md](blank-pos-dev-plan.md) — schema §4 and §9 folder tree (high level).
- [phases/phase-02-product-engine.md](phases/phase-02-product-engine.md) — catalog routes and implementation status.
- [phases/phase-03-pos-mvp.md](phases/phase-03-pos-mvp.md) — POS register, **category add-ons**, checkout, receipts.
- [storage-uploads.md](storage-uploads.md) — uploads env.
- [security/authorization.md](security/authorization.md) — app-layer access control.
