# Phase 1 — Foundation, auth, tenancy, branding

**Goal:** A secure multi-tenant shell: users authenticate, create an **organization** (v1: **org = one physical store**), capture **site details** in a Drizzle **`location`** row (1:1 with `organization.id`), and configure **shared store branding** in **`store_branding`** (login chrome, optional colors, receipt-oriented text, optional logo via HTTPS URL). The app uses **Next.js App Router**, **Drizzle**, **better-auth** with organizations; Postgres may be hosted on **Supabase**.

**Prerequisites:** Repo scaffold (Next 16, Tailwind 4, shadcn v4) per [package.json](../../package.json) and [components.json](../../components.json).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) (§2, §4, §7, §9), [schema-better-auth-alignment.md](../schema-better-auth-alignment.md), [onboarding-first-run.md](../onboarding-first-run.md).

**Note:** Earlier drafts of this phase assumed **`organization_branding`** (per org) and **site fields on `organization.additionalFields`**. The **implemented** model uses **`location`** + **`store_branding`** instead; this file matches the repo.

---

## Status summary

| Area | State |
|------|--------|
| Auth (username + org + admin plugins), Drizzle adapter, org/member roles | Implemented |
| First-run `/setup` wizard, `/` → setup when no users, `/setup` blocked when users exist | Implemented |
| `/login` username/password, no `/register` | Implemented |
| Staff: server `createUser` + `addMember` | Implemented |
| Org routes `/(protected)/(org)/[orgSlug]/…`, settings store + staff | Implemented |
| Shared **`store_branding`**, per-org **`location`** | Implemented |
| Branding settings UI | Implemented at **`/settings/branding`** (shared across orgs), not under `[orgSlug]` |
| Supabase **RLS**, private **Storage**, **signed URLs** for logos | Not implemented (server uses Drizzle; optional Supabase env vars) |
| **`--brand-*` CSS variables** from DB colors in org shell | Not implemented |
| **`disableSignUp`** / hard-disable public email sign-up in better-auth | Partially addressed by UX (wizard + staff only); verify API surface |

---

## Outcomes (exit criteria) — as implemented vs deferred

### Implemented

- [x] **First-run onboarding:** empty `user` table → **[onboarding-first-run.md](../onboarding-first-run.md)** wizard: **bootstrap owner** → **shared branding step** → **organization + `location`** (name, slug, currency, address), then `/{orgSlug}/dashboard` without SQL.
- [x] **No public registration:** no `/register`; **`/login`** uses **username + password** ([Username plugin](https://www.better-auth.com/docs/plugins/username)).
- [x] **Staff provisioning:** owner/manager uses **`/{orgSlug}/settings/staff`** with server **`createUser`** (Admin) + **`addMember`** ([schema-better-auth-alignment.md](../schema-better-auth-alignment.md)); no email invites.
- [x] **`/setup`** inaccessible once `count(user) > 0` (layout guard).
- [x] **Organization** (better-auth) with stable **`slug`** in URLs (`/{orgSlug}/…`).
- [x] **Roles** (`owner` \| `manager` \| `cashier`) in **`member.role`**, configured in [lib/auth.ts](../../lib/auth.ts); enforced in server actions (UI matrix deepens in Phase 7).
- [x] **Drizzle** migrations + [`.env.example`](../../.env.example)** documented vars.
- [x] **Tooling:** ESLint, Prettier, `lib/env.ts` zod validation for core server env (Supabase keys optional until Storage/RLS).

### Deferred (not in repo today; optional hardening)

- [ ] **Private logo Storage** + **`logo_storage_path`** + **short-lived signed URLs** (today: optional **`logo_image_url`** HTTPS on `store_branding`).
- [ ] **Org-scoped layout** injecting **`--brand-primary` / `--brand-accent`** from DB.
- [ ] **Supabase RLS** (and Storage policies) aligned with **`member`**; manual cross-org SQL denial checks.
- [ ] **CI** running `lint` + `typecheck` + `build` (add workflow if missing).
- [ ] **Org route `error.tsx`** and structured server logging for auth/org errors.

---

## Architecture decisions (v1 — current repo)

- **Org = one storefront.** A second physical store is a **second organization** (new slug), not a second row in a multi-site `locations` hierarchy.
- **Site + default currency:** stored on app table **`location`** (`organization_id` PK/FK → `organization.id`, 1:1). The better-auth **`organization`** row stays plugin-canonical (`id`, `name`, `slug`, `logo`, `metadata`, …) — see [lib/db/auth-schema.ts](../../lib/db/auth-schema.ts).
- **Branding / receipt copy / shell colors (shared):** single-row **`store_branding`** (`id = default`). Used for login page, org shell labels, and settings under **`/settings/branding`**. Per-org branding remains a **future** option if product needs differ per shop.
- **Auth plugins:** **Organization** + **Username** + **Admin** (bootstrap + staff `createUser`).
- **Tax:** not implemented; optional placeholders exist on `store_branding` for later receipts.

---

## Routing (actual paths)

| Route | Role |
|-------|------|
| `/` | Redirects to `/setup` if no users; else session → dashboard or `/login` ([app/page.tsx](../../app/page.tsx)) |
| `/setup` | First-run wizard ([app/setup/](../../app/setup/)); blocked when users exist |
| `/login` | Username sign-in ([app/login/](../../app/login/)) |
| `/(protected)/(org)/[orgSlug]/dashboard` | Org home |
| `/(protected)/(org)/[orgSlug]/settings/store` | Shop name, slug context, address, currency (`location`) |
| `/(protected)/(org)/[orgSlug]/settings/staff` | Staff CRUD |
| `/(protected)/settings/branding` | Shared `store_branding` (owner/manager of any org) |

---

## Dependencies for later phases

- Phase 2 needs: stable **`organization.id`**, role checks on server, **default currency** from **`location.default_currency`** (and address from `location` for receipts if needed).
- Phase 3 may want: branding tokens + signed logo helper — either extend **`store_branding`** or introduce per-org branding + Storage.

---

## Risks and mitigations (unchanged intent)

- **Cross-org access:** until RLS exists, rely on **server actions** + membership checks (`getOrgForUser`, `member` queries). Add RLS when exposing direct Supabase reads/writes.
- **Storage path leaks:** when Storage ships, enforce `{organization_id}/` prefix and never trust client paths.
- **Slug collisions:** unique index on `organization.slug` + UX retry.

---

## Definition of done (contributor)

- [x] New developer can follow README **First run** and reach **`/{orgSlug}/dashboard`** via **`/setup`** on an empty DB.
- [x] No secrets in repo; local **`pnpm lint`**, **`pnpm typecheck`**, **`pnpm build`** expected green.
- [ ] RLS smoke check (deferred until RLS ships).
