# Phase 2 — Product engine

**Goal:** Managers maintain one **org-wide catalog** (categories, simple and composite products, multi-tier pricing, inventory items, per-organization stock). Products are **shared across all branches by default**, with an option to restrict availability to **selected `location` rows only** (including “this product only at one branch”). Composite products show **rolled-up cost** from ingredients using **exact integer money math** (no floating-point drift). **Authorization** is **application RBAC** on server actions and loaders (session + `member.role`); **Postgres RLS is not required** in this phase.

**Prerequisites:** Phase 1 complete (auth, **`organization` + `member`**, roles on **`member.role`**, **`location`** with `default_currency`, **`business_details`**; Drizzle migrations).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (keep in sync with this doc for column names).

---

## Outcomes (exit criteria)

- [ ] Full CRUD for **categories** with `name`, `color`, `icon`, `sort_order`; list is sortable and used as filters later by POS.
- [ ] **`product_category_variant`** per category: preset **labels** (e.g. Small / Medium / Large) with **`sort_order`** for consistent POS ordering; optional **`product_price.category_variant_id`** FK (restrict on delete) with **`label` denormalized** at write time; custom tiers use `category_variant_id` null + free-text `label`.
- [ ] Full CRUD for **products**: `name`, `description`, `category_id`, `sku`, `barcode`, `image_url` (optional—can be Storage later), `is_active`, `is_composite`, `track_inventory`, **availability** (all locations vs selected branches), timestamps.
- [ ] **`product_locations`** (when availability is “selected only”): rows `(product_id, location_id)`; all `location_id` values must belong to the product’s `organization_id`. Empty selection invalid.
- [ ] **product_prices:** multiple rows per product; `label`, optional **`category_variant_id`**, **`amount_minor`** (`bigint`, integer **minor units**), `currency`; **no** `location_id` on price rows in Phase 2 (org-wide tiers only).
- [ ] **inventory_items** org-scoped: `name`, `unit`, **`cost_per_unit_minor`** (`bigint`), `reorder_point`; prefer **inventory_stock** as quantity source of truth (not a denormalized float on the item).
- [ ] **inventory_stock:** quantity per **`(inventory_item_id, organization_id)`**; UI for initial quantity / adjustments can stay minimal if Phase 5 owns movements.
- [ ] **product_ingredients:** `(inventory_item_id, quantity_fixed_scale)` — store quantity as an **integer at a fixed scale** (e.g. milli-units), not a float; validation (no cycles, positive quantities; ingredients reference **inventory_items** only).
- [ ] **Computed composite cost** in UI: sum using **bigint** math from `cost_per_unit_minor` and scaled quantities; display with **2 decimal places** (major.minor) without float round-trip.
- [ ] Server-side authorization: **`owner` / `manager`** for catalog mutations; **`cashier`** read-only on catalog reads used by POS (align with matrix; refine in Phase 7). **No reliance on RLS** for enforcement in Phase 2.

---

## Frozen decisions (apply in this phase)

- **Tax:** still out of scope; `products` / lines may have tax fields at zero.
- **Promotions:** no UI or tables in this phase.
- **Currency:** Price rows store `currency`. **Default for new tiers:** prefer **`business_details.default_currency`** when that column exists; otherwise a documented fallback (e.g. default **`location`** for the org). **POS / receipts** continue to use the **active `location.default_currency`** ([schema-better-auth-alignment.md](../schema-better-auth-alignment.md)).
- **Money (exact):** Persist and compute in **integer minor units** (`bigint` in Postgres and TypeScript server code). **Never** use IEEE floats for amounts, costs, or running totals. **UI** parses and displays **2 decimal places** at the boundary only. For `quantity × cost`, use integer widening multiply and **one** explicit rounding step to minor units per line where needed (document half-up or chosen mode). See **Risks** below.
- **Security:** **Application RBAC only** for Phase 2 catalog tables (same pattern as team settings). Optional Postgres RLS remains a later hardening step, not an exit criterion here.

---

## Workstream A — Schema and migrations

- [ ] Add tables: `categories`, **`product_category_variant`**, `products` (include **availability mode**), **`product_locations`**, `product_prices` (with optional **`category_variant_id`**), `inventory_items`, `inventory_stock`, `product_ingredients` per [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 and this doc.
- [ ] Optional: **`business_details.default_currency`** for org-level catalog pricing defaults.
- [ ] Indexes: `(organization_id)` on all org tables; `(product_id)` on prices/ingredients/locations; **`(inventory_item_id, organization_id)`** unique on stock; `(category_id)` on products.
- [ ] Foreign keys with `ON DELETE` behavior defined (restrict vs cascade—document choices; e.g. delete category: restrict if products exist, or soft-delete categories).
- [ ] **Do not** block Phase 2 on Postgres **RLS**; if RLS is added later, policies must mirror the same org/location rules as application code.

---

## Workstream B — Server layer

- [ ] Drizzle queries or repository modules per aggregate: `categories`, `products`, `inventory`.
- [ ] **Server actions** (or route handlers) with:
  - [ ] Zod validation for all inputs; **money fields as `bigint` / validated integer strings** mapped to minor units—**not** `z.number()` for currency amounts unless you immediately convert to integer and never use float math.
  - [ ] Role checks using session + **`member`** (same `organizationId` as active org); **mutations** restricted to **`owner` | `manager`**.
  - [ ] **Location-filtered product lists** for POS prep: only products available at the requested `location_id` under the same org.
- [ ] **Transactions** for multi-step writes (e.g. create product + default price tier + availability rows + ingredients list).
- [ ] **Barcode/SKU uniqueness** optional constraint per `(organization_id, sku)` and same for barcode if used.

---

## Workstream C — Admin UI (org routes)

- [ ] **Categories** list + create/edit/delete; color/icon pickers using shadcn patterns.
- [ ] **Products** list with filters (category, active, composite); detail form with tabs: General (**availability**: all branches vs multi-select locations), Pricing, Ingredients (if composite), Inventory link (`track_inventory` remains a Phase 5 flag for simple products).
- [ ] **Pricing** sub-UI: add/remove tiers (org-wide only in Phase 2); inputs show **2 decimals**, wire to **`amount_minor`**.
- [ ] **Inventory** list + item editor; **stock for this organization** (single quantity per item row in `inventory_stock`).
- [ ] **Composite builder:** ingredient search, scaled quantity inputs, live cost summary, validation errors (e.g. empty recipe for `is_composite`).

---

## Workstream D — Data integrity and UX

- [ ] Prevent toggling `is_composite` off while ingredients exist without confirm cleanup.
- [ ] Empty states, loading skeletons, optimistic UI only where rollback is trivial.
- [ ] **Audit fields:** `created_by` / `updated_by` optional; minimum `updated_at` for LWW sync in Phase 4.

---

## Workstream E — Quality

- [ ] Seed script: sample categories, products, composite, prices for demo org.
- [ ] Manual test matrix: create composite → change ingredient cost → composite cost updates **without float drift**; cashier cannot mutate catalog; **no cross-org** reads/writes via forged IDs.
- [ ] Performance: list endpoints paginated (cursor or offset) for 1k+ products.

---

## Dependencies for later phases

- Phase 3 needs: active products **per location** using availability rules; resolvable **default price tier** (`is_default` or deterministic `sort_order` on `product_prices`).
- Phase 4 needs: `updated_at` on mutable entities for LWW.
- Phase 5 may introduce **per-location stock** if needed; Phase 2 keeps **`inventory_stock`** at **`(inventory_item_id, organization_id)`** unless you explicitly extend it earlier.

---

## Risks and mitigations

- **Money rounding / drift:** **Integer minor units + bigint math** only; parse display at edges; document rounding for any division (e.g. ingredient line). Never float.
- **Authorization gaps:** Tests or manual matrix for **RBAC** and org scoping (including `product_locations` rows constrained to org’s branches).
- **Composite without ingredients:** block `is_composite=true` with zero ingredients at save time.

---

## Definition of done (checklist)

- [ ] Manager can maintain full catalog demo without SQL.
- [ ] Cashier (test user) cannot mutate catalog via server actions.
- [ ] Drizzle migrations reviewed in PR description; **RBAC** and **money representation** called out explicitly (**RLS not required** for merge).
