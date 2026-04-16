# Phase 1 — Foundation, auth, tenancy, branding

**Goal:** A secure multi-tenant shell: users authenticate, create or join an **organization** (v1: **org = one physical store**), capture **site details on the org** (address via better-auth `additionalFields`), and configure **organization branding** for UI tokens and receipts. Cloud source of truth is **Supabase Postgres** with **RLS**; app uses **Next.js App Router**, **Drizzle**, **better-auth** with organizations.

**Prerequisites:** Repo scaffold (Next 16, Tailwind 4, shadcn v4) per [package.json](../../package.json) and [components.json](../../components.json).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) (§2, §4, §7, §9), [schema-better-auth-alignment.md](../schema-better-auth-alignment.md), [onboarding-first-run.md](../onboarding-first-run.md).

---

## Outcomes (exit criteria)

- [ ] **First-run onboarding:** with empty DB, visitor completes **[onboarding-first-run.md](../onboarding-first-run.md)** wizard: **bootstrap owner** (`username` + `password`) → **organization (store)** → **branding** (+ required org fields), then lands on dashboard **without SQL**.
- [ ] **No public registration:** no `/register`; global sign-up **disabled** in better-auth after bootstrap; **`/login`** uses **username + password** ([Username plugin](https://www.better-auth.com/docs/plugins/username)).
- [ ] **Staff provisioning:** owner (and optionally manager) uses **Settings → Staff** to add **`username` + `password` + role** via server **`createUser`** (Admin) + **`addMember`** ([schema-better-auth-alignment.md](../schema-better-auth-alignment.md)); **no email invites**.
- [ ] Returning users use **`/login`** only; `/setup` is **inaccessible** once `count(user) > 0` (per onboarding doc).
- [ ] **Organization** (better-auth) persists in Supabase with **site fields** on the org row; URLs use stable **`orgSlug`** (document pattern).
- [ ] **Roles** (`owner` | `manager` | `cashier`) live in better-auth **`member.role`** (organization plugin), with allowed roles configured in auth; enforced on **server actions / API** (UI gating deepens in Phase 7).
- [ ] **Branding:** owner can set display fields, colors, optional receipt copy, upload **logo** to **private Storage**; app reads **`logo_storage_path`** and shows images via **short-lived signed URLs**.
- [ ] Org-scoped layout applies **CSS variables** from branding (e.g. `--brand-primary`, `--brand-accent`) for shell chrome.
- [ ] **Drizzle** migrations apply cleanly to Supabase; local `.env.example` documents required vars.
- [ ] **Dependency pass:** Next 16.x, Tailwind 4.x, shadcn v4 toolchain on latest stable you accept for the milestone; `build`, `lint`, `typecheck` green.

---

## Frozen decisions (apply in this phase)

- **Currency:** add **default currency** (ISO 4217, e.g. `USD`) via better-auth **`organization` `additionalFields`** (e.g. `defaultCurrency`) or typed **`metadata`**—not a duplicate org table. All monetary fields in later phases use this default unless overridden per price row (see Phase 2).
- **Branding table:** **`organization_branding`** 1:1 with **`organization.id`** (better-auth table); logo **storage path** in DB, not long-lived public URL.
- **No `locations` table in v1** ([schema-better-auth-alignment.md](../schema-better-auth-alignment.md)); a second storefront is a **second organization**.
- **Auth plugins:** **Organization** + **Username** + **Admin** (for bootstrap + staff `createUser`); email-invite / public sign-up **off** for v1 product behavior.
- **Tax:** not implemented; numeric fields can exist as **zero** placeholders where schema requires them.

---

## Workstream A — Tooling and project hygiene

- [ ] Add and configure **ESLint / Prettier** (already present—ensure rules align with Next 16).
- [ ] Add **environment** validation (e.g. `zod` + `src/env` pattern) for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, server-only secrets, better-auth secrets.
- [ ] Document **local dev**: Supabase CLI optional, seed commands, how to run migrations.
- [ ] Add **shadcn** primitives needed for shell and forms: `button`, `input`, `label`, `card`, `dialog`, `dropdown-menu`, `avatar`, `toast`/`sonner`, `form` (as needed)—install via `npx shadcn@latest` to match registry.

---

## Workstream B — Supabase and Drizzle

- [ ] Create Supabase project; enable **Storage**; create **private** bucket for org logos (e.g. `org-logos`) with path convention `{organization_id}/{filename}`.
- [ ] **Auth schema:** enable **organization**, **username**, and **admin** plugins in better-auth config, then **generate** Drizzle schema / migrations with the **Better Auth CLI** and wire the **Drizzle adapter** ([docs](https://www.better-auth.com/docs/adapters/drizzle)). **Do not** manually create parallel `organizations` / `user_roles` tables.
- [ ] **App-only Drizzle tables** (you own migrations for these; FK types must match **`organization.id`** / **`member.id`** / `user.id` from generated schema):
  - [ ] **`organization` extensions** via better-auth **`additionalFields`**: at minimum **default currency** and **site address** (and any fields receipts need: phone, tax id placeholder, etc.).
  - [ ] `organization_branding` — `organization_id` PK/FK → **`organization.id`**, `display_name`, `tagline`, `primary_color`, `accent_color`, `receipt_header_text`, `receipt_footer_text`, `logo_storage_path` (nullable), `updated_at`
- [ ] Migrations: apply **generated** auth migrations first, then app tables; index **`organization_branding.organization_id`**.
- [ ] **RLS (first pass):** policies use **`member`**: allow access when `member.userId = auth.uid()` (or your session→user mapping) and `member.organizationId = row.organization_id`; align Storage policies with the same rule. Avoid referencing a legacy `user_roles` table.
- [ ] Server-only Supabase client for admin operations if needed (logo upload finalize, signed URL generation with service role—minimize service role usage and prefer user-scoped where possible).

---

## Workstream C — better-auth and session model

- [ ] Integrate **better-auth** with Next.js App Router (route handlers / server config per official docs).
- [ ] Enable **organization** + **username** + **admin** plugins and matching clients (`organizationClient`, `usernameClient`, `adminClient` as required by docs).
- [ ] **Disable public sign-up** in config; expose only **`signIn.username`** on the login page.
- [ ] Use **`authClient.organization.create`**, **list members**, **update member role**, **removeMember** per docs—**not** `inviteMember` for v1 staff.
- [ ] Ensure **`session.activeOrganizationId`** is set after org create/switch; org-scoped layouts read active org from session APIs, not a divergent client-only store.
- [ ] On org creation: use plugin API (creates **`organization`** + creator **`member`** with **owner** role); in **`organizationHooks.afterCreateOrganization`**, create default **`organization_branding`** row (no separate location row).
- [ ] Session refresh, sign-out, protected layouts: unauthenticated users only on `(auth)` routes.

---

## Workstream D — Routing and UI (App Router)

- [ ] Route groups per [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §9: **`(auth)/login` only** (no public register), and **`(setup)/`** or **`/setup`** for [onboarding-first-run.md](../onboarding-first-run.md) (welcome → bootstrap owner → org → branding → finish).
- [ ] **Middleware / layout guard:** redirect `/` when `count(users)=0` to **`/setup`**; after setup, redirect `/` to login or last-used org as appropriate.
- [ ] `(org)/[orgSlug]/layout.tsx`: resolve org by slug, verify membership, inject **branding CSS variables** on a wrapper element.
- [ ] `(org)/[orgSlug]/dashboard`: minimal home (store/org name; **no** location switcher in v1).
- [ ] `(org)/[orgSlug]/settings/branding`: form with color pickers or hex inputs + text fields + logo upload + **live preview** of shell/receipt stub.
- [ ] `(org)/[orgSlug]/settings/store` (or **Organization**): owner edits **site details** stored on **`organization` additionalFields** (address, phone, etc.).
- [ ] `(org)/[orgSlug]/settings/staff`: **add / list / remove** members; **add** = server **`createUser`** + **`addMember`** with **username**, **password**, **role** ([onboarding-first-run.md](../onboarding-first-run.md)).

---

## Workstream E — Branding and Storage behavior

- [ ] Logo upload flow: client → signed upload URL or server action → Storage → save `logo_storage_path` + optional `logo_mime_type` / dimensions in branding row.
- [ ] **Validation:** max file size, allowed MIME types (png, jpeg, webp, svg policy—note SVG XSS risk if inlined; prefer raster or sanitize).
- [ ] **Signed URL helper:** server action or route that returns URL + expiry; client caches briefly; handle missing logo gracefully.
- [ ] Map `primary_color` / `accent_color` to CSS variables; ensure **contrast** for text (WCAG AA on primary buttons or use neutral text on colored buttons).

---

## Workstream F — Quality and observability

- [ ] Basic **error boundaries** on org layout.
- [ ] Structured logging for auth/org errors (no secrets in client logs).
- [ ] **Smoke tests** (manual script checklist in PR template): full **first-run wizard** on empty DB; **username login**; **add cashier** from Staff; new user logs in; edit branding, reload, verify persistence.

---

## Workstream G — Contributor experience (README)

- [ ] Root **README** “First run” matches [onboarding-first-run.md](../onboarding-first-run.md): env vars, migrate commands, `pnpm dev`, URL to wizard, troubleshooting.
- [ ] **`.env.example`** lists every variable with a one-line comment (no real secrets).

---

## Dependencies for later phases

- Phase 2 needs: stable **`organization.id`**, role checks on server, `default_currency` (and address on org for receipts if needed).
- Phase 3 needs: branding CSS variables + signed logo URL helper reused on receipt.

---

## Risks and mitigations

- **better-auth ↔ Supabase RLS mismatch:** prototype one vertical slice early; use documented session shape in RLS `auth.uid()`.
- **Storage path leaks across orgs:** enforce path prefix `{org_id}/` + RLS on metadata table; never trust client-provided paths.
- **Slug collisions:** unique index + UX retry; optional reserved slug list.

---

## Definition of done (checklist)

- [ ] New developer can follow README **First run** section and reach branded org dashboard via **`/setup`** (or documented entry URL).
- [ ] No secrets in repo; CI runs `lint` + `typecheck` + `build`.
- [ ] RLS prevents cross-org reads in a manual SQL check.
