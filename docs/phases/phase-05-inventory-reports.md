# Phase 5 — Inventory depth and reporting (v1.1)

**Goal:** Inventory is **operationally trustworthy**: movements and adjustments are logged, **composite sales** can **auto-deduct** ingredients per policy, **low-stock** signals fire, and managers have **daily sales** plus **product performance** views. Reporting reads primarily from the **hosted Postgres** / app API (authoritative after Phase 4 sync); local DB optional for cached aggregates—document choice.

**Prerequisites:** Phase 3–4: transactions persisted/synced; Phase 2: **`inventory_stock`**, **`product_ingredient`** (`quantity_milli`), **`track_inventory`** semantics defined.

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (`inventory_movements`), §5 v1.1.

---

## Outcomes (exit criteria)

- [ ] **`inventory_movements`** implemented with **`organization_id`**, `type` in (`in`, `out`, `adjustment`), `quantity`, `reference_id` (nullable FK to transaction line or adjustment batch), `note`, `created_at`, `user_id` optional.
- [ ] **Adjustment UI:** manager can record stock correction with reason; writes movement + updates `inventory_stock` in one DB transaction.
- [ ] **Auto-deduct on sale:** when a completed sale includes a **composite** product, create `inventory_movements` of type `out` for each ingredient with quantity `sale_qty × recipe_qty`; update `inventory_stock`; **idempotent** per transaction id (reprocessing sale must not double-deduct).
- [ ] **Low-stock alerts:** configurable per `inventory_item` `reorder_point`; dashboard widget or list page “Below reorder” for this **organization** (store).
- [ ] **Daily sales summary:** date range default “today”; metrics: gross subtotal, transaction count, average basket (subtotal only—no tax).
- [ ] **Product sales report:** units sold and revenue per product for range; export CSV optional stretch.
- [ ] **Transaction list** page (manager): filter by date, status (org implied by active tenant); drill-down to lines.

---

## Frozen decisions (apply in this phase)

- **Tax:** reports exclude tax (still zero).
- **COGS:** optional display using ingredient costs at time of sale—**MVP default:** no historical COGS frozen snapshot; show **current** ingredient-based estimate only if trivial, else defer.

---

## Workstream A — Schema and triggers

- [ ] Ensure **`inventory_movements`** access is scoped by **application RBAC** to the organization (optional Postgres RLS later, aligned with [docs/security/authorization.md](../security/authorization.md)).
- [ ] Add indexes for reporting queries: **`(organization_id, created_at)`** on `transactions`; `(transaction_id)` on `transaction_items`; **`(inventory_item_id, organization_id, created_at)`** on movements.
- [ ] **Server-side hook** after sale completion: call `applyInventoryDeduction(txId)` once (Postgres function or application transaction).

---

## Workstream B — Deduction rules (explicit)

- [ ] **Composite products:** always deduct ingredients on sale completion (unless `is_composite` false).
- [ ] **Simple products with `track_inventory`:** if you map simple products to a single `inventory_item` in a future schema, defer here—**Phase 5 MVP:** only composite deduction required per master roadmap; document if simple product stock is out of scope.
- [ ] **Insufficient stock:** policy choice—**recommend:** allow sale with **warning** + negative stock forbidden **or** block sale—pick one and implement consistently in POS + server.

---

## Workstream C — Admin and reporting UI

- [ ] **Movements** log table with filters.
- [ ] **Adjustments** flow separate from “stealth edits” to stock grid.
- [ ] **Reports** pages under `(org)/[businessSlug]/l/[locationSlug]/reports/` (or org-level) with date pickers; add **`location_id`** filters when reporting is branch-specific.
- [ ] **Loading states** and empty states for reports.

---

## Workstream D — Performance

- [ ] Use SQL aggregates (`GROUP BY`) on server for summaries; avoid loading all transactions to client for month ranges.
- [ ] Pagination on transaction list.

---

## Workstream E — Quality

- [ ] **Regression tests** for deduction idempotency (replay handler).
- [ ] **Data validation:** adjustment cannot drive negative stock if policy forbids it.

---

## Dependencies for later phases

- Phase 6: `transaction_promotions` joins into reports (discount lines).
- Phase 7: void/refund reversals must write compensating **inventory_movements** (`in`)—design hooks now.

---

## Risks and mitigations

- **Race:** concurrent sales same ingredient—use row-level locking on `inventory_stock` during deduction transaction.
- **Sync + deduct:** if sale originates offline, deduction runs when sale is finalized locally; when synced, server must recognize same transaction id—align Phase 4 idempotency with server triggers or run deductions only on server when sale arrives (choose **single place of truth**).

---

## Definition of done (checklist)

- [ ] Manager can explain stock changes from movements log alone.
- [ ] Composite sale reduces ingredient counts predictably.
- [ ] Reports match raw SQL spot-check for a sample day.
