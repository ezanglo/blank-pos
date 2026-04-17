# Phase 1 — Foundation, auth, tenancy, branding

**Goal:** A secure shell for **one install per business**: users authenticate, create a **store** (**better-auth `organization`**) with **multiple branches** (**`location`** rows: slug, name, address, default currency), and configure **per-store branding** in **`store_branding`** (PK `organization_id`, login chrome, optional colors, receipt-oriented text, optional logo). Branch-scoped UI lives under **`/{storeSlug}/l/{locationSlug}/…`**. The app uses **Next.js App Router**, **Drizzle**, **better-auth** with organizations; Postgres is any standard **`DATABASE_URL`** (local, Docker, hosted, pooler).

**Prerequisites:** Repo scaffold (Next 16, Tailwind 4, shadcn v4) per [package.json](../../package.json) and [components.json](../../components.json).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) (§2, §4, §7, §9), [schema-better-auth-alignment.md](../schema-better-auth-alignment.md), [onboarding-first-run.md](../onboarding-first-run.md).

**Note:** Earlier drafts assumed **`organization_branding`** or a global-only `store_branding`. The **implemented** model uses **per-organization `store_branding`** and **many `location` rows per store**.

---

## Status summary

| Area | State |
|------|--------|
| Auth (username + org + admin plugins), Drizzle adapter, org/member roles | Implemented |
| First-run `/setup` wizard, `/` → setup when no users; `/setup` for signed-in users mid-onboarding | Implemented |
| `/login` username/password, no `/register` | Implemented |
| Staff: server `createUser` + `addMember` | Implemented |
| Store routes `/(protected)/(org)/[storeSlug]/…`, branch routes `…/l/[locationSlug]/…` | Implemented |
| **`store_branding`** per **`organization_id`**, **`location`** many per store | Implemented |
| Branding settings UI | Implemented at **`/{storeSlug}/settings/branding`** |
| **Image uploads** (`POST /api/upload`, local or S3-compatible cloud) | Implemented — see [docs/storage-uploads.md](../storage-uploads.md) |
| **`--brand-primary` / `--brand-accent`** from `store_branding` on org shell | Implemented ([`OrgAppShell`](../../components/org-app-shell.tsx); invalid hex omitted) |
| **`disableSignUp`** / hard-disable public email sign-up in better-auth | Implemented (`emailAndPassword.disableSignUp: true` in [lib/auth.ts](../../lib/auth.ts)) |
| **CI** (`lint`, `typecheck`, `build` on push/PR) | Implemented ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) |
| **Store / protected error UI** + **server auth logs** | Implemented ([`error.tsx`](../../app/(protected)/(org)/[storeSlug]/error.tsx), [`log-server.ts`](../../lib/log-server.ts)) |
| **Sidebar store switcher** + **header branch switcher** | Implemented |

---

## Outcomes (exit criteria) — as implemented vs deferred

### Implemented

- [x] **First-run onboarding:** empty `user` table → **[onboarding-first-run.md](../onboarding-first-run.md)** wizard: **bootstrap owner** → **store** → **first `location`** → **branding for that store**, then **`/{storeSlug}/l/{locationSlug}/dashboard`** without SQL.
- [x] **No public registration:** no `/register`; **`/login`** uses **username + password** ([Username plugin](https://www.better-auth.com/docs/plugins/username)); **`emailAndPassword.disableSignUp`** blocks **`signUp.email`** / **`POST …/sign-up/email`** while keeping Admin **`createUser`** for bootstrap and staff.
- [x] **Staff provisioning:** owner/manager uses **`/{storeSlug}/settings/staff`** with server **`createUser`** (Admin) + **`addMember`** ([schema-better-auth-alignment.md](../schema-better-auth-alignment.md)); no email invites.
- [x] **`/setup`:** with users present, **anonymous** visits redirect to **`/login`**; **signed-in** users who still need the wizard (no org membership, or a store with zero **`location`** rows) can open **`/setup`**; fully onboarded users redirect to the branch dashboard ([`app/setup/layout.tsx`](../../app/setup/layout.tsx)).
- [x] **Organization** (better-auth) with stable **`slug`** in URLs (`/{storeSlug}/…`); **location** slug under `/l/{locationSlug}/`.
- [x] **Roles** (`owner` \| `manager` \| `cashier`) in **`member.role`**, configured in [lib/auth.ts](../../lib/auth.ts); enforced in server actions (UI matrix deepens in Phase 7).
- [x] **Drizzle** migrations + [`.env.example`](../../.env.example)** documented vars.
- [x] **Tooling:** ESLint, Prettier, `lib/env.ts` zod validation for core server env (`DATABASE_URL`, auth, `STORAGE_*`).
- [x] **CI:** GitHub Actions runs **`pnpm install --frozen-lockfile`**, **`pnpm lint`**, **`pnpm typecheck`**, **`pnpm build`** with **`SKIP_ENV_VALIDATION=1`** on **`main`**, **`master`**, and PRs.
- [x] **Error boundaries:** [`app/(protected)/(org)/[storeSlug]/error.tsx`](../../app/(protected)/(org)/[storeSlug]/error.tsx) and [`app/(protected)/error.tsx`](../../app/(protected)/error.tsx) with **Try again** + navigation.
- [x] **Server logging:** [`lib/log-server.ts`](../../lib/log-server.ts) **`logAuthEvent`** used on bootstrap / staff / organization better-auth failures (JSON lines; sensitive keys stripped).

### Deferred (not in repo today; optional hardening)

- [ ] **Private object storage** + **`logo_storage_path`** + **signed read URLs** if logos must not use public URLs (today: **`logo_image_url`** accepts https or same-origin **`/uploads/...`**).
- [x] **Org-scoped layout** injecting **`--brand-primary` / `--brand-accent`** from **`store_branding`** on **`SidebarProvider`** ([lib/brand-color.ts](../../lib/brand-color.ts)). Components can adopt these tokens over time; WCAG contrast for primary buttons is a follow-up.
- [ ] **Optional Postgres RLS** as defense in depth (not required today; access enforced in app code — [docs/security/authorization.md](../security/authorization.md)).

---

## Architecture decisions (current repo)

- **Organization = store.** A second legal/store entity is a **second `organization`** (new slug, own members and branding). A second **branch** under the same store is another **`location`** row (new `slug` under the same `organization_id`).
- **Branch address + default currency:** on **`location`** (`id` PK, `organization_id`, `slug`, `name`, `is_default`, …). The better-auth **`organization`** row stays plugin-canonical — see [lib/db/auth-schema.ts](../../lib/db/auth-schema.ts).
- **Branding / receipt copy / shell colors:** **`store_branding`** keyed by **`organization_id`**. **`/login`** uses static **Blank POS** app chrome (not per-store branding); per-store branding appears after sign-in in the org shell.
- **Auth plugins:** **Organization** + **Username** + **Admin** (bootstrap + staff `createUser`).
- **Tax:** not implemented; optional placeholders exist on `store_branding` for later receipts.

---

## Routing (actual paths)

| Route | Role |
|-------|------|
| `/` | Redirects to `/setup` if no users; else session → dashboard, **`/setup`** if onboarding incomplete, or `/login` ([app/page.tsx](../../app/page.tsx)) |
| `/setup` | First-run wizard ([app/setup/](../../app/setup/)); anonymous blocked when users exist; signed-in incomplete onboarding allowed |
| `/login` | Username sign-in ([app/login/](../../app/login/)) |
| `/(protected)/(org)/[storeSlug]` | Redirects to default branch dashboard |
| `/(protected)/(org)/[storeSlug]/l/[locationSlug]/dashboard` | Branch home |
| `/(protected)/(org)/[storeSlug]/l/[locationSlug]/settings/store` | Branch name, address, currency |
| `/(protected)/(org)/[storeSlug]/settings/staff` | Staff CRUD (store-wide) |
| `/(protected)/(org)/[storeSlug]/settings/branding` | Store `store_branding` (owner/manager of this store) |

---

## Dependencies for later phases

- Phase 2 needs: stable **`organization.id`**, **`location.id`** for branch-scoped data, role checks on server, **default currency** from **`location.default_currency`** (and address from `location` for receipts if needed).
- Phase 3 may want: branding tokens + signed logo helper.

---

## Risks and mitigations (unchanged intent)

- **Cross-branch access:** rely on **server actions** + **`getLocationForUserByStoreAndLocationSlug`**. Optional RLS later if you expose Postgres directly to clients.
- **Storage path leaks:** when Storage ships, enforce `{organization_id}/` prefix and never trust client paths.
- **Slug collisions:** unique index on `organization.slug` and on `(organization_id, location.slug)` + UX retry.

---

## Definition of done (contributor)

- [x] New developer can follow README **First run** and reach **`/{storeSlug}/l/{locationSlug}/dashboard`** via **`/setup`** on an empty DB.
- [x] No secrets in repo; local **`pnpm lint`**, **`pnpm typecheck`**, **`pnpm build`** expected green; **CI** runs the same on push/PR ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)).
- [ ] Optional RLS smoke check if you add database-level policies later.
