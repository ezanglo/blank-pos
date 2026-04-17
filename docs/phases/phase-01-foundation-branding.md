# Phase 1 — Foundation, auth, tenancy, branding

**Goal:** A secure shell for **one install per business**: users authenticate, create an **organization** (v1: **organization = one store location / site**), capture **site details** in a Drizzle **`location`** row (1:1 with `organization.id`), and configure **shared store branding** in **`store_branding`** (login chrome, optional colors, receipt-oriented text, optional logo via URL or file upload). The app uses **Next.js App Router**, **Drizzle**, **better-auth** with organizations; Postgres is any standard **`DATABASE_URL`** (local, Docker, hosted, pooler).

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
| **Image uploads** (`POST /api/upload`, local or S3-compatible cloud) | Implemented — see [docs/storage-uploads.md](../storage-uploads.md) |
| **`--brand-primary` / `--brand-accent`** from `store_branding` on org shell | Implemented ([`OrgAppShell`](../../components/org-app-shell.tsx); invalid hex omitted) |
| **`disableSignUp`** / hard-disable public email sign-up in better-auth | Implemented (`emailAndPassword.disableSignUp: true` in [lib/auth.ts](../../lib/auth.ts)) |
| **CI** (`lint`, `typecheck`, `build` on push/PR) | Implemented ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) |
| **Org / protected error UI** + **server auth logs** | Implemented ([`error.tsx`](../../app/(protected)/(org)/[orgSlug]/error.tsx), [`log-server.ts`](../../lib/log-server.ts)) |

---

## Outcomes (exit criteria) — as implemented vs deferred

### Implemented

- [x] **First-run onboarding:** empty `user` table → **[onboarding-first-run.md](../onboarding-first-run.md)** wizard: **bootstrap owner** → **shared branding step** → **organization + `location`** (name, slug, currency, address), then `/{orgSlug}/dashboard` without SQL.
- [x] **No public registration:** no `/register`; **`/login`** uses **username + password** ([Username plugin](https://www.better-auth.com/docs/plugins/username)); **`emailAndPassword.disableSignUp`** blocks **`signUp.email`** / **`POST …/sign-up/email`** while keeping Admin **`createUser`** for bootstrap and staff.
- [x] **Staff provisioning:** owner/manager uses **`/{orgSlug}/settings/staff`** with server **`createUser`** (Admin) + **`addMember`** ([schema-better-auth-alignment.md](../schema-better-auth-alignment.md)); no email invites.
- [x] **`/setup`** inaccessible once `count(user) > 0` (layout guard).
- [x] **Organization** (better-auth) with stable **`slug`** in URLs (`/{orgSlug}/…`).
- [x] **Roles** (`owner` \| `manager` \| `cashier`) in **`member.role`**, configured in [lib/auth.ts](../../lib/auth.ts); enforced in server actions (UI matrix deepens in Phase 7).
- [x] **Drizzle** migrations + [`.env.example`](../../.env.example)** documented vars.
- [x] **Tooling:** ESLint, Prettier, `lib/env.ts` zod validation for core server env (`DATABASE_URL`, auth, `STORAGE_*`).
- [x] **CI:** GitHub Actions runs **`pnpm install --frozen-lockfile`**, **`pnpm lint`**, **`pnpm typecheck`**, **`pnpm build`** with **`SKIP_ENV_VALIDATION=1`** on **`main`**, **`master`**, and PRs.
- [x] **Error boundaries:** [`app/(protected)/(org)/[orgSlug]/error.tsx`](../../app/(protected)/(org)/[orgSlug]/error.tsx) and [`app/(protected)/error.tsx`](../../app/(protected)/error.tsx) with **Try again** + navigation.
- [x] **Server logging:** [`lib/log-server.ts`](../../lib/log-server.ts) **`logAuthEvent`** used on bootstrap / staff / organization better-auth failures (JSON lines; sensitive keys stripped).

### Deferred (not in repo today; optional hardening)

- [ ] **Private object storage** + **`logo_storage_path`** + **signed read URLs** if logos must not use public URLs (today: **`logo_image_url`** accepts https or same-origin **`/uploads/...`**).
- [x] **Org-scoped layout** injecting **`--brand-primary` / `--brand-accent`** from **`store_branding`** on **`SidebarProvider`** ([lib/brand-color.ts](../../lib/brand-color.ts)). Components can adopt these tokens over time; WCAG contrast for primary buttons is a follow-up.
- [ ] **Optional Postgres RLS** as defense in depth (not required today; access enforced in app code — [docs/security/authorization.md](../security/authorization.md)).

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

- **Cross-location access:** rely on **server actions** + membership checks (`getOrgForUser`, `member` queries). Optional RLS later if you expose Postgres directly to clients.
- **Storage path leaks:** when Storage ships, enforce `{organization_id}/` prefix and never trust client paths.
- **Slug collisions:** unique index on `organization.slug` + UX retry.

---

## Definition of done (contributor)

- [x] New developer can follow README **First run** and reach **`/{orgSlug}/dashboard`** via **`/setup`** on an empty DB.
- [x] No secrets in repo; local **`pnpm lint`**, **`pnpm typecheck`**, **`pnpm build`** expected green; **CI** runs the same on push/PR ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)).
- [ ] Optional RLS smoke check if you add database-level policies later.
