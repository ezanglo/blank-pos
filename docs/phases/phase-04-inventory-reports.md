# Phase 4 — Inventory depth and reporting (v1.1)

**Goal:** Inventory is **operationally trustworthy**: movements and adjustments are logged, **composite sales** can **auto-deduct** ingredients per policy, **low-stock** signals fire, and managers have **daily sales** plus **product performance** views. Reporting reads primarily from the **hosted Postgres** / app API (authoritative for the online MVP). If [recommended-future-offline-sync.md](recommended-future-offline-sync.md) ships later, reconcile optional local summaries—document the single source of truth.

**Prerequisites:** Phase 3 checkout with transactions persisted **server-side**; Phase 2: **`inventory_stock`**, **`product_ingredient`** (`quantity_milli`), **`track_inventory`** semantics defined.

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (`inventory_movements`), §5 v1.1.

**Testing:** Automated tests for deduction idempotency and reporting are **deferred** until there is a shared test harness for server actions and queries; spot-check with SQL and manual flows for now.

---

## Direction — tier-scoped recipes and `track_inventory` (revisit before build)

This section records **intent only**; nothing here is required for Phase 3 POS. Revisit when scoping **Phase 4** (or a smaller inventory slice).

- **`track_inventory`** — Stored on **`product`** and editable in **catalog admin** today. **POS does not** read it; there are **no low-stock badges** on the register until movements, deduction policy, and alerts exist (see **Outcomes** below). Avoid implying POS behavior from the flag until then.
- **`product_ingredient`** — Recipe lines are keyed by **`product_id` only** (one BOM per product for all price tiers). For menus where **Small / Large** (or other tiers) need **different** ingredient quantities, the planned direction is **tier-scoped BOM**: attach recipe lines to the **sellable tier** the cashier actually picks — e.g. **`product_price.id`**, or a unique **`(product_id, category_variant_id)`** — **not** to **`product_category_variant` alone** (those labels are **category-wide** and shared by every product in the category). Aligning BOM with **`product_price_id`** (or equivalent) keeps **checkout, receipts, and deduction** on the same key.
- Until that migration, composite **cost** in admin and any future deduction logic should treat the current rows as **product-level** defaults; when tier-scoped recipes ship, **auto-deduct on sale** should use the recipe for the tier that was sold.

---

## Outcomes (exit criteria)

- [x] **`inventory_movements`** implemented with **`organization_id`**, `type` in (`in`, `out`, `adjustment`), `quantity`, `reference_id` (nullable FK to transaction line or adjustment batch), `note`, `created_at`, `user_id` optional.
- [x] **Adjustment UI:** manager can record stock correction with reason; writes movement + updates `inventory_stock` in one DB transaction.
- [x] **Auto-deduct on sale:** when a completed sale includes a **composite** product, create `inventory_movements` of type `out` for each ingredient with quantity `sale_qty × recipe_qty`; update `inventory_stock`; **idempotent** per transaction id (reprocessing sale must not double-deduct).
- [x] **Low-stock alerts:** configurable per `inventory_item` `reorder_point`; dashboard widget or list page “Below reorder” for this **organization** (store).
- [x] **Daily sales summary:** date picker (single UTC calendar day); metrics: gross subtotal, transaction count, average basket (subtotal only—no tax); optional **status** filter.
- [x] **Product sales report:** units sold and revenue per product for range; **CSV** download (same filters as the table).
- [x] **Transaction list** page (manager): filter by date, **status**; **drill-down** to line items; pagination.

---

## Frozen decisions (apply in this phase)

- **Tax:** reports exclude tax (still zero).
- **COGS:** optional display using ingredient costs at time of sale—**MVP default:** no historical COGS frozen snapshot; show **current** ingredient-based estimate only if trivial, else defer.

---

## Workstream A — Schema and triggers

- [x] Ensure **`inventory_movements`** access is scoped by **application RBAC** to the organization (optional Postgres RLS later, aligned with [docs/security/authorization.md](../security/authorization.md)).
- [x] Add indexes for reporting queries: **`(organization_id, created_at)`** on `transactions`; `(transaction_id)` on `transaction_items`; **`(inventory_item_id, organization_id, created_at)`** on movements.
- [x] **Server-side hook** after sale completion: call `applyInventoryDeduction(txId)` once (Postgres function or application transaction).

---

## Workstream B — Deduction rules (explicit)

- [x] **Composite products:** always deduct ingredients on sale completion (unless `is_composite` false). When **tier-scoped recipes** exist (see **Direction** above), resolve the recipe for the sold **`product_price`** / tier, not the product default alone.
- [ ] **Simple products with `track_inventory`:** not in Phase 4 MVP (composite deduction only); map simple sellables to `inventory_item` in a later slice if needed.
- [x] **Insufficient stock:** policy choice—**recommend:** allow sale with **warning** + negative stock forbidden **or** block sale—pick one and implement consistently in POS + server.

---

## Workstream C — Admin and reporting UI

- [x] **Movements** log table with filters.
- [x] **Adjustments** flow separate from “stealth edits” to stock grid.
- [x] **Reports** pages under `(org)/[businessSlug]/l/[locationSlug]/reports/` with date pickers; **`location_id`** (branch) scoped in queries.
- [x] **Loading states** (`Suspense` shell on reports layout) and empty states for reports.

---

## Workstream D — Performance

- [x] Use SQL aggregates (`GROUP BY`) on server for summaries; avoid loading all transactions to client for month ranges.
- [x] Pagination on transaction list.

---

## Workstream E — Quality

- [ ] **Regression tests** for deduction idempotency (replay handler). *Deferred: add with broader server/query test suite.*
- [x] **Data validation:** adjustment cannot drive negative stock if policy forbids it.

---

## Dependencies for later phases

- Phase 5: `transaction_promotions` joins into reports (discount lines).
- Phase 6: void/refund reversals must write compensating **inventory_movements** (`in`)—design hooks now.

---

## Risks and mitigations

- **Race:** concurrent sales same ingredient—use row-level locking on `inventory_stock` during deduction transaction.
- **Sync + deduct:** if [offline sync](recommended-future-offline-sync.md) exists later, align deduction with the same `transaction` id / `checkoutId` idempotency—run deductions in **one** place (typically server when the sale is persisted).

---

## Definition of done (checklist)

- [x] Manager can explain stock changes from movements log alone.
- [x] Composite sale reduces ingredient counts predictably.
- [x] Reports match raw SQL spot-check for a sample day.

---

## Repo sync (implemented beyond original exit list)

These items align the phase doc with the current codebase; they do not reopen deferred scope (e.g. automated deduction tests).

| Area | Location / behavior |
|------|----------------------|
| **Reports** | `app/(protected)/(org)/[businessSlug]/l/[locationSlug]/reports/` — daily / products / transactions; **status** filter on all three; **CSV** at `reports/products/csv`; transaction **lines** page at `reports/transactions/[transactionId]`; layout **`Suspense`** + skeleton (`components/reports-content-skeleton.tsx`). |
| **Queries** | `lib/queries/reports.ts` — `getDailySalesSummary`, `getProductSalesForRange`, `listTransactionsForLocationPage`, `getTransactionReportDetail`, `getDailySalesSeries`, `fillDailySalesSeriesGaps`, `listRecentTransactionsForLocation`, CSV helpers; **status** parity uses “all statuses” when unset. |
| **Dashboard** | `app/(protected)/(org)/[businessSlug]/l/[locationSlug]/dashboard/page.tsx` — **owner/manager**: low-stock banner, KPI strip, 14-day chart, recent sales table, **Lines** / **Receipt** open in **side sheets** (`components/dashboard-recent-sales.tsx`, `lib/actions/dashboard-recent-preview.ts`); **cashier**: shell + register CTA only. |
| **RBAC** | Reports nav and dashboard analytics both require **owner** or **manager** (`components/app-sidebar.tsx`). |

**Migrations:** run **`pnpm db:migrate`** whenever you pull schema changes. Use the **same `DATABASE_URL`** for Next.js (e.g. `.env.local`) and for CLI tools so `drizzle.__drizzle_migrations` and the live database stay aligned—otherwise a migration can appear “applied” while a table is missing.
