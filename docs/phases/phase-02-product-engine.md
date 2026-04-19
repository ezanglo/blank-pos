# Phase 2 — Product engine

**Goal:** Managers maintain one **org-wide catalog** (categories, simple and composite products, multi-tier pricing, inventory items, per-organization stock). Products are **shared across all branches by default**, with an option to restrict availability to **selected `location` rows only** (including “this product only at one branch”). Composite products show **rolled-up cost** from ingredients using **exact integer money math** (no floating-point drift). **Authorization** is **application RBAC** on server actions and loaders (session + `member.role`); **Postgres RLS is not required** in this phase.

**Prerequisites:** Phase 1 complete (auth, **`organization` + `member`**, roles on **`member.role`**, **`location`** with `default_currency`, **`business_details`**; Drizzle migrations).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (physical table names — keep in sync with [`lib/db/schema-catalog.ts`](../../lib/db/schema-catalog.ts)).

---

## Status summary

| Area | State |
|------|--------|
| Drizzle schema: **`product_category`**, **`product_category_variant`**, **`product`** (incl. optional **`prep_time_seconds`** for typical make time), **`product_location`**, **`product_price`**, **`product_addon`**, **`product_category_addon`**, **`inventory_item`**, **`inventory_stock`**, **`product_ingredient`** (`quantity_milli`) | Implemented ([`lib/db/schema-catalog.ts`](../../lib/db/schema-catalog.ts)); add-ons are configured in admin and consumed on the POS ([`phase-03-pos-mvp.md`](phase-03-pos-mvp.md)) |
| Org default currency for new prices (`business_details.default_currency` → fallback to first branch → **`PHP`**) | Implemented ([`lib/queries/catalog-currency.ts`](../../lib/queries/catalog-currency.ts)) |
| Server actions + Zod (`lib/actions/catalog-*.ts`, [`lib/schemas/catalog.ts`](../../lib/schemas/catalog.ts)); **minor units** / **milli-units** at parse boundaries ([`lib/money.ts`](../../lib/money.ts)) | Implemented |
| RBAC: **`requireCatalogManager`** (mutations), **`requireCatalogMember`** (reads / POS prep) | Implemented ([`lib/catalog-access.ts`](../../lib/catalog-access.ts)) |
| **`listSellableProductIdsForLocation`** (active products × availability mode) | Implemented ([`lib/queries/catalog.ts`](../../lib/queries/catalog.ts)) |
| Admin UI: **Categories** (category list + per-category dialogs: **variants**, **special instructions**, **add-ons** — drag reorder, no manual sort fields; add-ons created per category, edited in place), **Products** (table, create/edit, delete, image upload, prices dialog), **Inventory** (items + org stock) | Implemented under **`/{businessSlug}/catalog/…`** (see below) |
| **`POST /api/upload`** for product **`image_url`** (same contract as branding) | Implemented ([`docs/storage-uploads.md`](../storage-uploads.md)) |
| Server-side **offset pagination** + URL params: **`/catalog/products`** (`page`, `per`, `q`, `category`) and **`/catalog/inventory`** (`page`, `per`, `q`; same helpers) | Implemented ([`lib/queries/catalog.ts`](../../lib/queries/catalog.ts), [`lib/catalog-products-url.ts`](../../lib/catalog-products-url.ts)) |
| **Demo seed** script for sample catalog | Deferred |
| **Free-text price tiers** with `category_variant_id` null (DB nullable; UI requires a variant per tier today) | Deferred |
| **Global barcode** uniqueness (only **`(organization_id, sku)`** is unique today) | Deferred |
| Optional **`created_by` / `updated_by`** on catalog rows | Deferred |
| **`inventory_movements`** table | Phase 4 ([phase-04-inventory-reports.md](phase-04-inventory-reports.md)) — not in Drizzle yet |

---

## Routing (actual paths)

Catalog is **organization-scoped** (sidebar **Catalog** group). Layout uses **`OrgAppShellLoader`** with **no** active branch segment — managers edit the shared catalog once per business.

| Route | Purpose |
|-------|---------|
| **`/{businessSlug}/catalog/categories`** | Categories (table with drag reorder), and **per-category** dialogs: **variants** (labels, drag reorder, add/edit/delete), **special instructions** (same), **add-ons** (create new org add-on + link to this category, edit name/price, drag reorder, unlink; **currency** from org/branch default — no currency field in UI). **`/{businessSlug}/catalog/add-ons`** **redirects** here ([`next.config.mjs`](../../next.config.mjs)). ([`.../catalog/categories/page.tsx`](../../app/(protected)/(org)/[businessSlug]/catalog/categories/page.tsx)) |
| **`/{businessSlug}/catalog/products`** | Product table, filters, dialogs ([`.../catalog/products/page.tsx`](../../app/(protected)/(org)/[businessSlug]/catalog/products/page.tsx)) |
| **`/{businessSlug}/catalog/inventory`** | Inventory items and stock ([`.../catalog/inventory/page.tsx`](../../app/(protected)/(org)/[businessSlug]/catalog/inventory/page.tsx)) |
| **`/{businessSlug}/settings/products`** | Redirects to **`/{businessSlug}/catalog/products`** ([`.../settings/products/page.tsx`](../../app/(protected)/(org)/[businessSlug]/settings/products/page.tsx)) |

UI building blocks live under [`components/catalog/`](../../components/catalog/).

---

## Code map

| Concern | Location |
|---------|----------|
| Catalog tables + enums | [`lib/db/schema-catalog.ts`](../../lib/db/schema-catalog.ts) |
| Queries (lists, product detail, sellable IDs) | [`lib/queries/catalog.ts`](../../lib/queries/catalog.ts), [`lib/queries/catalog-addons.ts`](../../lib/queries/catalog-addons.ts) (`listActiveAddonsByCategoryId`, etc.) |
| Mutations | [`lib/actions/catalog-categories.ts`](../../lib/actions/catalog-categories.ts), [`catalog-category-variants.ts`](../../lib/actions/catalog-category-variants.ts), [`catalog-products.ts`](../../lib/actions/catalog-products.ts), [`catalog-product-prices.ts`](../../lib/actions/catalog-product-prices.ts), [`catalog-addons.ts`](../../lib/actions/catalog-addons.ts), [`catalog-inventory.ts`](../../lib/actions/catalog-inventory.ts) |
| Access control | [`lib/catalog-access.ts`](../../lib/catalog-access.ts) |

---

## Outcomes (exit criteria) — implemented vs deferred

### Implemented

- [x] Full CRUD for **categories** with `name`, `color`, `icon`, `sort_order`; list reorder and filters on the product table.
- [x] **`product_category_variant`** per category: preset **labels** with **`sort_order`** (admin order is **drag-and-drop**, not a manual sort field); **`product_price.category_variant_id`** with **`label` snapshot** at write time.
- [x] Full CRUD for **products**: `name`, `description`, `category_id`, `sku`, **`qr_code`**, **`image_url`** (upload or URL), `is_active`, `is_composite`, `track_inventory`, optional **`prep_time_seconds`** (admin + products table “Prep” column; feeds POS cart / sale-complete prep hints), **availability** (`all_locations` \| `selected_locations_only`), **`product_location`** rows when restricted; timestamps.
- [x] **`product_location`:** `(product_id, location_id)` unique; server validates IDs belong to the product’s org. Empty selection invalid when mode is **`selected_locations_only`**.
- [x] **Product prices:** multiple rows per product; **`amount_minor`** (`bigint`), **`currency`**, **`is_default`**, **`sort_order`**; org-wide only (no `location_id`). **Current UI:** each tier is tied to a **category variant** (one price per variant enforced on create). **`currency`** on insert/update is set from **`getDefaultCatalogCurrencyCode`** (business **`default_currency`**, else default branch, else **`PHP`**); there is **no per-tier currency field** in the product UI.
- [x] **Category add-ons:** org **`product_addon`** rows linked via **`product_category_addon`**; **create** and **edit** from the category dialog; **order** by drag-and-drop. **Add-on `currency`** is set on create/update by the same **`getDefaultCatalogCurrencyCode`** resolver (not a form field). To hide an add-on on the POS for a category, **unlink** it; **`product_addon.is_active`** remains in the schema for POS filtering and legacy rows—catalog saves normalize **active** when updating add-ons.
- [x] **Inventory items** org-scoped: `name`, `unit`, **`cost_per_unit_minor`**, `reorder_point`; **inventory_stock** quantity per **`(inventory_item_id, organization_id)`**.
- [x] **Product ingredients:** **`quantity_milli`** (integer × 1000 for three decimal places); references **inventory_item** only; composite cost summary uses **bigint** helpers in the product form.
- [x] Server-side authorization: **`owner` / `manager`** for catalog mutations; membership required for reads (cashier-safe POS prep can use **`requireCatalogMember`** on read paths).

### Deferred / follow-ups

- [x] **Pagination** for the products admin list (default **25** / page, max **100** via `per` query param).
- [ ] **Seed** data for demo orgs.
- [ ] **Free-text** price **`label`** without variant (column supports null FK; flows do not yet).
- [ ] **Barcode** uniqueness policy if scanners need hard guarantees beyond SKU.
- [ ] **Audit** columns on mutable catalog entities for future **last-write-wins** sync (see [recommended-future-offline-sync.md](recommended-future-offline-sync.md)).

---

## Frozen decisions (apply in this phase)

- **Tax:** still out of scope; `products` / lines may have tax fields at zero.
- **Promotions:** no UI or tables in this phase.
- **Currency:** **`product_price`** and **`product_addon`** rows store `currency` for matching at checkout. **Resolved default** for **new/edited** catalog prices and add-ons: **`business_details.default_currency`**, else **default branch** **`location.default_currency`** (see [`listLocationsForOrganization`](../../lib/queries/location.ts) ordering), else **`PHP`** ([`getDefaultCatalogCurrencyCode`](../../lib/queries/catalog-currency.ts)). **POS / receipts** continue to use the **active `location.default_currency`** where applicable ([schema-better-auth-alignment.md](../schema-better-auth-alignment.md)).
- **Money (exact):** Persist and compute in **integer minor units** (`bigint` on the server). **Never** use IEEE floats for amounts, costs, or running totals. **UI** parses and displays **2 decimal places** at the boundary only. Ingredient quantities use **fixed-scale integers** (`quantity_milli`). See **Risks** below.
- **Security:** **Application RBAC only** for Phase 2 catalog tables (same pattern as team settings). Optional Postgres RLS remains a later hardening step, not an exit criterion here.

---

## Workstream A — Schema and migrations

- [x] Tables listed in **Status summary** per [`lib/db/schema-catalog.ts`](../../lib/db/schema-catalog.ts) and [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4.
- [x] **`business_details.default_currency`** for org-level catalog pricing defaults ([`lib/db/schema-app.ts`](../../lib/db/schema-app.ts)).
- [x] Indexes and FKs as in Drizzle schema (including **`(organization_id, sku)`** uniqueness; multiple null SKUs allowed per Postgres rules).
- [x] **Do not** block Phase 2 on Postgres **RLS**; if RLS is added later, policies must mirror the same org/location rules as application code.

---

## Workstream B — Server layer

- [x] Drizzle queries in [`lib/queries/catalog.ts`](../../lib/queries/catalog.ts) (and related loaders on each page).
- [x] **Server actions** with Zod validation; money as **validated strings → bigint**; **mutations** gated by **`requireCatalogManager`**.
- [x] **`listSellableProductIdsForLocation`** for branch-filtered product IDs (Phase 3 POS).
- [x] **Transactions** for multi-step writes (e.g. create product + prices + locations + ingredients).
- [x] **SKU** uniqueness per org (enforced in application / unique index); barcode optional without global unique constraint.

---

## Workstream C — Admin UI (org routes)

- [x] **Categories** + variants + special instructions + category add-ons (dialogs); category row drag reorder; variants / instructions / add-on links each use **drag-and-drop** order (no manual sort inputs).
- [x] **Products** list with search/category filter; create/edit dialog (availability, composite recipe, image upload); **Pricing** dialog; delete confirmation.
- [x] **Pricing:** tiers per **category variant**; **2 decimal** inputs → **`amount_minor`**.
- [x] **Inventory** list + item editor; **stock** for the organization.
- [x] **Composite:** ingredient lines, scaled quantity inputs, live cost summary, validation for composite without ingredients.

---

## Workstream D — Data integrity and UX

- [x] Validation for availability mode + location rows; composite / ingredient rules at save.
- [x] Empty states and loading paths in catalog panels; error surfaces for failed actions.
- [ ] Optional **`updated_by`** / **`created_by`** (deferred).

---

## Workstream E — Quality

- [ ] Seed script: sample categories, products, composite, prices for demo org.
- [ ] Automated or documented manual test matrix: composite cost math; cashier cannot mutate catalog; **no cross-org** reads/writes via forged IDs.
- [x] Performance: paginated product list query + total count (cursor-based paging optional later if needed).

---

## Dependencies for later phases

- Phase 3 needs: active products **per location** using availability rules; resolvable **default price tier** (`is_default` + `sort_order` on **`product_price`**).
- Future offline sync benefits from `updated_at` on mutable entities for LWW (already on several catalog tables; audit fields still optional) — [recommended-future-offline-sync.md](recommended-future-offline-sync.md).
- Phase 4 may introduce **per-location stock** if needed; Phase 2 keeps **`inventory_stock`** at **`(inventory_item_id, organization_id)`** unless you explicitly extend it earlier.
- **Inventory / recipes (future):** **`track_inventory`** is admin-only today (POS ignores it). **`product_ingredient`** is **product-scoped**; tier-scoped BOM and POS low-stock are **planned** — see *Direction — tier-scoped recipes and `track_inventory`* in [phase-04-inventory-reports.md](phase-04-inventory-reports.md).

---

## Risks and mitigations

- **Money rounding / drift:** **Integer minor units + bigint math** only; parse display at edges; ingredient lines use **milli** scale. Never float in persistence paths.
- **Authorization gaps:** Keep **`requireCatalogManager`** on every mutation; test **forbidden** paths for **`cashier`**.
- **Composite without ingredients:** blocked at save time in server actions.

---

## Definition of done (checklist)

- [x] Manager can maintain a full catalog in the UI without SQL.
- [x] Catalog mutations require **`owner` \| `manager`** (`requireCatalogManager`).
- [x] Drizzle migrations in tree; **RBAC** and **money representation** documented; **RLS not required** for this phase.
