# Phase execution plans

Detailed task breakdowns for Blank POS delivery. They follow the frozen stack and sequencing in the Cursor master plan (Next 16, Tailwind 4, shadcn v4, PostgreSQL via `DATABASE_URL`, Drizzle, better-auth, Zustand) and extend [blank-pos-dev-plan.md](../blank-pos-dev-plan.md). **Offline-first / PGlite sync** is documented as a [recommended future](recommended-future-offline-sync.md) upgrade, not a numbered execution phase for MVP.

**Auth schema:** [schema-better-auth-alignment.md](../schema-better-auth-alignment.md) — use better-auth **`organization`** / **`member`** / **`session.activeOrganizationId`**; **many `location` rows per organization** (branches); org-level profile on **`business_details`**; do not duplicate org membership tables.

**First-run UX:** [onboarding-first-run.md](../onboarding-first-run.md) — clone, env, migrate, then **`/signup`** and **`/onboarding`** (**`organization`** + **`business_details`** + **`location`** + presentation). Users with multiple branches use **`/choose-location`**. Additional users via **Settings → Team** (`createUser` + **`addMember`**, real **email** + password).

| Phase | Document |
| --- | --- |
| 1 — Foundation, auth, tenancy, branding | [phase-01-foundation-branding.md](phase-01-foundation-branding.md) |
| 2 — Product engine | [phase-02-product-engine.md](phase-02-product-engine.md) |
| 3 — POS MVP (sales, **category add-ons**, queue ticket + call-out name + prep hints, **Reorder** from receipt / deep link, no promos/tax) | [phase-03-pos-mvp.md](phase-03-pos-mvp.md) |
| 4 — Inventory depth and reporting | [phase-04-inventory-reports.md](phase-04-inventory-reports.md) (exit criteria + **Repo sync** table: transactions name + search, reports extensions, role-scoped dashboard, `lib/queries/reports.ts`) |
| 5 — Promotions and coupons | [phase-05-promotions-coupons.md](phase-05-promotions-coupons.md) |
| 6 — Operations, hardening, QA | [phase-06-operations-qa.md](phase-06-operations-qa.md) |
| 7 — Customers and loyalty (planned) | [phase-07-customers-loyalty.md](phase-07-customers-loyalty.md) |
| Recommended future — Offline-first and sync (not MVP sequence) | [recommended-future-offline-sync.md](recommended-future-offline-sync.md) |

Run phases **1 → 7** in order unless a later phase explicitly allows parallel prep (called out per doc).

**Phase 2:** the [phase-02-product-engine.md](phase-02-product-engine.md) doc includes a **status summary** and **routing table** kept in sync with the repo’s **`/{businessSlug}/catalog/*`** implementation.
