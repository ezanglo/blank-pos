# Phase execution plans

Detailed task breakdowns for Blank POS delivery. They follow the frozen stack and sequencing in the Cursor master plan (Next 16, Tailwind 4, shadcn v4, PostgreSQL via `DATABASE_URL`, Drizzle, better-auth, offline/sync direction, Zustand) and extend [blank-pos-dev-plan.md](../blank-pos-dev-plan.md).

**Auth schema:** [schema-better-auth-alignment.md](../schema-better-auth-alignment.md) — use better-auth **`organization`** / **`member`** / **`session.activeOrganizationId`**; **many `location` rows per organization** (branches); org-level profile on **`business_details`**; do not duplicate org membership tables.

**First-run UX:** [onboarding-first-run.md](../onboarding-first-run.md) — clone, env, migrate, then **`/signup`** and **`/onboarding`** (**`organization`** + **`business_details`** + **`location`** + presentation). Users with multiple branches use **`/choose-location`**. Additional users via **Settings → Team** (`createUser` + **`addMember`**, real **email** + password).

| Phase | Document |
| --- | --- |
| 1 — Foundation, auth, tenancy, branding | [phase-01-foundation-branding.md](phase-01-foundation-branding.md) |
| 2 — Product engine | [phase-02-product-engine.md](phase-02-product-engine.md) |
| 3 — POS MVP (sales, **category add-ons**, no promos/tax) | [phase-03-pos-mvp.md](phase-03-pos-mvp.md) |
| 4 — Offline-first and sync | [phase-04-offline-sync.md](phase-04-offline-sync.md) |
| 5 — Inventory depth and reporting | [phase-05-inventory-reports.md](phase-05-inventory-reports.md) |
| 6 — Promotions and coupons | [phase-06-promotions-coupons.md](phase-06-promotions-coupons.md) |
| 7 — Operations, hardening, QA | [phase-07-operations-qa.md](phase-07-operations-qa.md) |

Run phases in order unless a later phase explicitly allows parallel prep (called out per doc).

**Phase 2:** the [phase-02-product-engine.md](phase-02-product-engine.md) doc includes a **status summary** and **routing table** kept in sync with the repo’s **`/{businessSlug}/catalog/*`** implementation.
