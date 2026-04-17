# Phase 2 — Product engine

**Goal:** Managers can maintain **categories**, **simple and composite products**, **multi-tier pricing** (org-scoped; v1 one store per org), **inventory items**, and **per-organization stock**. Composite products show **rolled-up cost** from ingredient `cost_per_unit` × quantity. All data is **org-scoped** (`organization_id`); there is **no** `location_id` in v1.

**Prerequisites:** Phase 1 complete (auth, **`organization` + `member`**, roles on **`member.role`**, default currency + site fields on **`location`**, shared **`business_details`** as needed; Drizzle migrations).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (categories, products, prices, inventory, ingredients).

---

## Outcomes (exit criteria)

- [ ] Full CRUD for **categories** with `name`, `color`, `icon`, `sort_order`; list is sortable and used as filters later by POS.
- [ ] Full CRUD for **products**: `name`, `description`, `category_id`, `sku`, `barcode`, `image_url` (optional—can be Storage later), `is_active`, `is_composite`, `track_inventory`, timestamps.
- [ ] **product_prices:** multiple rows per product; `label`, `amount`, `currency` (default from org); **no** `location_id` in v1.
- [ ] **inventory_items** org-scoped: `name`, `unit`, `cost_per_unit`, `reorder_point`; optional denormalized `current_stock` only if you keep doc’s field—prefer **inventory_stock** as source of truth (see below).
- [ ] **inventory_stock:** quantity per **`(inventory_item_id, organization_id)`**; UI to set opening/adjustment can be minimal if Phase 5 owns movements—**minimum** is initial quantity for MVP POS stock display.
- [ ] **product_ingredients:** for `is_composite` products, list `(inventory_item_id, quantity)` with validation (no cycles, positive quantities, units consistent or documented).
- [ ] **Computed composite cost** displayed in UI: sum of `quantity × cost_per_unit` for ingredients (live recompute on change).
- [ ] Server-side authorization: **manager+** for catalog mutations; **cashier** read-only on catalog endpoints used by POS (align with matrix; refine in Phase 7).

---

## Frozen decisions (apply in this phase)

- **Tax:** still out of scope; `products` / lines may have tax fields at zero.
- **Promotions:** no UI or tables in this phase.
- **Currency:** price rows store `currency`; default from **`organization` default-currency field** (better-auth `additionalFields` / metadata—see [schema-better-auth-alignment.md](../schema-better-auth-alignment.md)) on create.

---

## Workstream A — Schema and migrations

- [ ] Add tables: `categories`, `products`, `product_prices`, `inventory_items`, `inventory_stock`, `product_ingredients` per dev plan §4.
- [ ] Indexes: `(organization_id)` on all org tables; `(product_id)` on prices/ingredients; **`(inventory_item_id, organization_id)`** unique on stock; `(category_id)` on products.
- [ ] Foreign keys with `ON DELETE` behavior defined (restrict vs cascade—document choices; e.g. delete category: restrict if products exist, or soft-delete categories).
- [ ] **RLS policies** for each new table: read/write constrained by **`member.organizationId`** matching row **`organization_id`**.

---

## Workstream B — Server layer

- [ ] Drizzle queries or repository modules per aggregate: `categories`, `products`, `inventory`.
- [ ] **Server actions** (or route handlers) with:
  - [ ] Zod validation for all inputs (money as integer minor units **or** decimal with explicit scale—pick one convention and document it project-wide).
  - [ ] Role checks using session + **`member`** (same `organizationId` as active org).
- [ ] **Transactions** for multi-step writes (e.g. create product + default price tier + ingredients list).
- [ ] **Barcode/SKU uniqueness** optional constraint per `(organization_id, sku)` and same for barcode if used.

---

## Workstream C — Admin UI (org routes)

- [ ] **Categories** list + create/edit/delete; color/icon pickers using shadcn patterns.
- [ ] **Products** list with filters (category, active, composite); detail form with tabs: General, Pricing, Ingredients (if composite), Inventory link (if `track_inventory` maps to a policy—clarify: composite uses ingredients; simple product may optionally consume an inventory item in a later phase—**MVP:** `track_inventory` is flag for Phase 5 auto-deduct path; no extra wiring required here beyond storing flag).
- [ ] **Pricing** sub-UI: add/remove tiers (org-wide only in v1).
- [ ] **Inventory** list + item editor; **stock for this organization** (single column or grid without location dimension).
- [ ] **Composite builder:** ingredient search, quantity inputs, live cost summary, validation errors (e.g. empty recipe for `is_composite`).

---

## Workstream D — Data integrity and UX

- [ ] Prevent toggling `is_composite` off while ingredients exist without confirm cleanup.
- [ ] Empty states, loading skeletons, optimistic UI only where rollback is trivial.
- [ ] **Audit fields:** `created_by` / `updated_by` optional; minimum `updated_at` for LWW sync in Phase 4.

---

## Workstream E — Quality

- [ ] Seed script: sample categories, products, composite, prices for demo org.
- [ ] Manual test matrix: create composite → change ingredient cost → composite cost updates.
- [ ] Performance: list endpoints paginated (cursor or offset) for 1k+ products.

---

## Dependencies for later phases

- Phase 3 needs: active products, resolvable **default price tier** rule (define: “lowest `sort`” or explicit `is_default` on `product_prices`—**add `is_default` boolean** or deterministic sort order documented).
- Phase 4 needs: `updated_at` on mutable entities for LWW.

---

## Risks and mitigations

- **Money rounding:** use integer minor units or a single decimal library; never float.
- **RLS gaps:** add automated test or SQL fixtures that attempt cross-org access and expect deny.
- **Composite without ingredients:** block `is_composite=true` with zero ingredients at save time.

---

## Definition of done (checklist)

- [ ] Manager can maintain full catalog demo without SQL.
- [ ] Cashier (test user) cannot mutate catalog via server actions.
- [ ] Drizzle migrations + RLS reviewed in PR description.
