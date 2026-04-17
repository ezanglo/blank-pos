# Phase 1 — Foundation, auth, tenancy, branding

**Goal:** A secure shell for **one install per business**: users authenticate with **email + password**, create a **business** (**better-auth `organization`**) with **multiple branches** (**`location`** rows: slug, name, address, default currency), and configure org-level profile in **`business_details`** (display, legal, contact, colors, logo, receipt copy, optional onboarding fields). Person-level extras live on **`user_profile`**. Branch-scoped UI lives under **`/{businessSlug}/l/{locationSlug}/…`**. Stack: **Next.js App Router**, **Drizzle**, **better-auth** + organizations; Postgres via **`DATABASE_URL`**.

**Prerequisites:** Repo scaffold (Next 16, Tailwind 4, shadcn v4) per [package.json](../../package.json) and [components.json](../../components.json).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) (§2, §4, §7, §9), [schema-better-auth-alignment.md](../schema-better-auth-alignment.md), [onboarding-first-run.md](../onboarding-first-run.md).

**Note:** The physical Postgres table for branches remains **`location`**; Drizzle uses the **`businessLocation`** symbol. The org-level table is **`business_details`** (replaces legacy `store_branding` naming).

---

## Status summary

| Area | State |
|------|--------|
| Auth (email/password + org + admin), Drizzle adapter, org/member roles | Implemented |
| **`/signup`**, **`/login`**, **`/onboarding`**, **`/choose-location`**; **`/`** routing per session + branches | Implemented |
| Team: server **`createUser`** (real email) + **`addMember`** | Implemented |
| Org routes `/(protected)/(org)/[businessSlug]/…`, branch routes `…/l/[locationSlug]/…` | Implemented |
| **`business_details`** per **`organization_id`**, **`location`** many per org, **`user_profile`** per user | Implemented |
| Business settings UI (`business_details`, per-card save) | **`/{businessSlug}/settings/business`**; legacy **`/settings/branding`** redirects there |
| Locations admin (org-wide branches) | **`/{businessSlug}/settings/locations`** (owner/manager) |
| **Image uploads** (`POST /api/upload`, local or S3-compatible cloud) | Implemented — [docs/storage-uploads.md](../storage-uploads.md) |
| **`--brand-primary` / `--brand-accent`** from `business_details` on org shell | Implemented ([`OrgAppShell`](../../components/org-app-shell.tsx)) |
| **Public sign-up** (`emailAndPassword.disableSignUp: false` in [lib/auth.ts](../../lib/auth.ts)) | Implemented |
| **CI** (`lint`, `typecheck`, `build` on push/PR) | Implemented ([`.github/workflows/ci.yml`](../../.github/workflows/ci.yml)) |
| **Business / protected error UI** + **server auth logs** | Implemented ([`error.tsx`](../../app/(protected)/(org)/[businessSlug]/error.tsx), [`log-server.ts`](../../lib/log-server.ts)) |
| **Sidebar business switcher** + **header branch switcher** | Implemented |

---

## Outcomes (exit criteria) — implemented vs deferred

### Implemented

- [x] **Signup + onboarding:** **`/signup`** then **`/onboarding`** (org + optional branding on store step → first **`location`**) → **`/{businessSlug}/l/{locationSlug}/dashboard`** ([onboarding-first-run.md](../onboarding-first-run.md)).
- [x] **Email auth:** **`signIn.email`** / **`signUp.email`**; no Username plugin.
- [x] **Team provisioning:** owner/manager uses **`/{businessSlug}/settings/staff`** (sidebar: **Team**; searchable table, dialogs for add / view / edit role / remove) with **`staffCreateUser`**, **`staffUpdateMemberRole`**, **`staffRemoveMember`** ([`lib/actions/staff.ts`](../../lib/actions/staff.ts)); real **email** + password.
- [x] **Multi-branch picker:** **`/choose-location`** when the user has more than one accessible branch.
- [x] **Organization** with stable **`slug`** in URLs (`/{businessSlug}/…`); **location** slug under `/l/{locationSlug}/`.
- [x] **Roles** (`owner` \| `manager` \| `cashier`) in **`member.role`** in [lib/auth.ts](../../lib/auth.ts); enforced in server actions.
- [x] **Drizzle** migrations + [`.env.example`](../../.env.example) documented vars.
- [x] **Tooling:** ESLint, Prettier, `lib/env.ts` zod validation for core server env.
- [x] **CI:** GitHub Actions on **`main`**, **`master`**, PRs.
- [x] **Error boundaries:** [`app/(protected)/(org)/[businessSlug]/error.tsx`](../../app/(protected)/(org)/[businessSlug]/error.tsx) and [`app/(protected)/error.tsx`](../../app/(protected)/error.tsx).

### Deferred

- [ ] **Private object storage** + signed read URLs if logos must not be public.
- [ ] **Optional Postgres RLS** ([docs/security/authorization.md](../security/authorization.md)).

---

## Architecture decisions (current repo)

- **Organization = business.** A second legal entity is a **second `organization`**. A second **branch** is another **`location`** row under the same `organization_id`.
- **Branch address + default currency:** on **`location`**.
- **Org-level profile / branding:** on **`business_details`**. **`/login`** uses static app chrome; per-business styling after sign-in in the org shell.
- **Person extras:** **`user_profile`**.
- **Auth plugins:** **Organization** + **Admin** (`createUser` for team provisioning); **emailAndPassword** with **`disableSignUp: false`**.

---

## Routing (actual paths)

| Route | Role |
|-------|------|
| `/` | No users → `/signup`; else session → `/choose-location` if needed, dashboard, `/onboarding`, or `/login` ([app/page.tsx](../../app/page.tsx)) |
| `/signup` | Public registration ([app/(auth)/signup/](../../app/(auth)/signup/)) |
| `/login` | Email sign-in ([app/(auth)/login/](../../app/(auth)/login/)) |
| `/onboarding` | Incomplete tenancy ([app/(protected)/onboarding/](../../app/(protected)/onboarding/)) |
| `/choose-location` | Multiple branches ([app/(protected)/choose-location/](../../app/(protected)/choose-location/)) |
| `/(protected)/(org)/[businessSlug]` | Redirects to default branch dashboard |
| `/(protected)/(org)/[businessSlug]/l/[locationSlug]/dashboard` | Branch home |
| `/(protected)/(org)/[businessSlug]/l/[locationSlug]/settings/store` | Branch name, address, currency |
| `/(protected)/(org)/[businessSlug]/settings/locations` | Branch list + dialogs: create / view / edit / delete (`location` rows; owner/manager) |
| `/(protected)/(org)/[businessSlug]/settings/staff` | **Team** UI: table + dialogs — add, view, role update, remove (org-wide; owner/manager) |
| `/(protected)/(org)/[businessSlug]/settings/business` | `business_details` + org display name, grouped cards with per-card save (owner/manager) |
| `/(protected)/(org)/[businessSlug]/settings/branding` | Redirects to **`/settings/business`** |

---

## Dependencies for later phases

- Phase 2 needs: stable **`organization.id`**, **`location.id`**, role checks, **default currency** from **`location`**.

---

## Risks and mitigations

- **Cross-branch access:** rely on **server actions** + **`getLocationForUserByBusinessAndLocationSlug`**. Optional RLS later.
- **Slug collisions:** unique index on `organization.slug` and on `(organization_id, location.slug)` + UX retry.

---

## Definition of done

- [x] New developer can follow README **First run**: migrate → **`/signup`** → **`/onboarding`** → **`/{businessSlug}/l/{locationSlug}/dashboard`** on empty DB.
- [x] **`pnpm lint`**, **`pnpm typecheck`**, **`pnpm build`** green; CI matches.
