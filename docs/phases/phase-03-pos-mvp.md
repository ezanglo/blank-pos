# Phase 3 — POS terminal (MVP sales)

**Goal:** Cashiers complete **checkout** for the **active organization** (v1: org = store): browse products, build a **cart**, pick **price tier**, optionally choose **category-scoped add-ons** (e.g. toppings, milk swaps), record **payment method** (no processor), persist **transactions** and **line items** (including per-line add-on breakdown), view and **browser-print** a **branded receipt**. **No discounts, coupons, or tax configuration** in this phase.

**Prerequisites:** Phase 1 (branding, org + branches, `session.activeOrganizationId`), Phase 2 (products, **`amount_minor`** prices, catalog **filtered by active `location`** per availability rules). Managers configure **category-scoped add-ons** (and variants / special instructions) under **Catalog → Categories** — open the **Add-ons** dialog for each category. There is **no** separate add-ons admin route (legacy **`/catalog/add-ons`** redirects to categories).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (transactions, `transaction_items`, **`transaction_item_addon`**, **`product_addon`**, **`product_category_addon`**), §5 v1 POS bullets.

**Status (repo):** Core Phase 3 **MVP is implemented** — register at **`/{businessSlug}/l/{locationSlug}/pos`**, [`createSale`](../../lib/actions/sales.ts), responsive cart (**`Sheet`** on small viewports, **`aside`** on **`lg+`**), sale-complete **`Dialog`**, in-app receipt preview **`Sheet`** (shared [`PosReceiptDocument`](../../components/pos/pos-receipt-document.tsx)), print rules in [`globals.css`](../../app/globals.css) (`#pos-receipt-root`), **last-receipt** shortcut from the DB + toolbar badge, cart store, category-scoped add-ons and special instructions. **F&B-style extras:** optional **call-out name** on checkout, **per-branch daily queue number** on the transaction + receipt, and **estimated prep** from catalog `prep_time_seconds` × line qty (cart + completion dialog). The checklists below match the codebase; a few items remain **optional** or **informal QA** rather than missing product features.

---

## Outcomes (exit criteria)

- [x] **Organization context** via **`session.activeOrganizationId`** and routes; **branch context** from **`/{businessSlug}/l/{locationSlug}`**. Product grid lists only products **available at that location** (Phase 2 **`product.availability_mode`** + optional **`product_location`** rows) — see [`listPosProductsForLocation`](../../lib/queries/pos.ts) / [`listSellableProductIdsForLocation`](../../lib/queries/catalog.ts).
- [x] **POS grid** of active products with category filter and client search (name / SKU / QR substring) — [`PosTerminal`](../../components/pos/pos-terminal.tsx). **Register** page title is **hidden below `lg`** so the search + cart row fits small screens.
- [x] **Cart layout:** shared [`PosCartPanelInner`](../../components/pos/pos-terminal.tsx) in a **right-side [`Sheet`](../../components/ui/sheet.tsx)** on mobile / narrow viewports, and in a collapsible **`aside`** on **`lg+`** (`useViewportMinLg` aligns with Tailwind’s `lg` breakpoint). Flush-right sheet sizing matches receipt preview width (~420px max).
- [x] **Cart** supports add/remove, quantity stepper, empty cart; shows line subtotals and **grand subtotal** (no tax line). **Add-ons** appear **indented under the parent line**; totals include base price plus add-ons scaled by line quantity.
- [x] **Cart line identity:** the same **product + price tier** with **different add-on selections** are **separate lines**. Quantity **merges** only when product, tier, and **full add-on and instruction signatures** match — [`pos-cart-store.ts`](../../lib/stores/pos-cart-store.ts).
- [x] **Add-on UX:** after quantity and **price tier** are chosen, if the product’s **category** has active add-ons whose **currency matches** the selected tier, an **add-ons** step lets staff toggle options (optional; can add with none). **Special instructions** use the same flow. Add-ons are **not** separate cart rows; they nest under the parent item — [`pos-addons-dialog.tsx`](../../components/pos/pos-addons-dialog.tsx).
- [x] **Price tier selection** — **per line:** default tier from org price default / sort; staff can change tier per product before add to cart ([`pos-price-picker-dialog.tsx`](../../components/pos/pos-price-picker-dialog.tsx)).
- [x] **Checkout** captures `payment_method` enum; optional **`customer_call_name`**; assigns **`queue_number`** via **`location_queue_counter`** (UTC calendar date per branch); persists **`pos_transactions`** as completed in **`createSale`** (single-step).
- [x] **transaction_items** store `product_id`, `product_price_id`, `quantity`, **`unit_price_minor`** (product unit only), discount zero, **`subtotal_minor`** = full line total — see [`lib/actions/sales.ts`](../../lib/actions/sales.ts) + [`schema-transactions.ts`](../../lib/db/schema-transactions.ts).
- [x] **`transaction_item_addon`** (and **`transaction_item_instruction`**) snapshot rows; receipts use snapshots — same files as above.
- [x] **Receipt markup (shared):** [`PosReceiptDocument`](../../components/pos/pos-receipt-document.tsx) renders branded content (`#pos-receipt-root`): logo, header/footer copy, line items with **indented add-on lines**, totals, transaction id, branch address, timestamp, cashier display name, **order #** and **call-out name** when present. Preview shape is built with [`transactionBundleToPreviewModel`](../../lib/pos/receipt-preview.ts) from [`getTransactionReceiptBundle`](../../lib/queries/transactions.ts).
- [x] **Receipt routes / flows:**
  - **Standalone page** — [`pos/receipt/[transactionId]/page.tsx`](../../app/(protected)/(org)/[businessSlug]/l/[locationSlug]/pos/receipt/[transactionId]/page.tsx) for bookmarking or opening in a new tab; uses `PosReceiptDocument` + **Print** control.
  - **In-register preview** — after checkout, **Print receipt** opens a **right `Sheet`** (same width pattern as the cart sheet). Data is loaded with the server action [`loadPosReceiptPreview`](../../lib/actions/pos-receipt.ts) (`businessSlug` + `transactionId`).
- [x] **Sale complete UX:** centered **`Dialog`** (not a full-page takeover) showing **queue #**, optional **for [name]**, optional **est. prep** when catalog prep times exist; **Print receipt** and **New sale**; printing uses the sheet flow above.
- [x] **Last sale receipt shortcut:** POS page server-loads the latest transaction id for the branch via [`getLatestTransactionIdForLocation`](../../lib/queries/transactions.ts) and passes it as `initialLastOrderTransactionId` ([`pos/page.tsx`](../../app/(protected)/(org)/[businessSlug]/l/[locationSlug]/pos/page.tsx)). [`PosTerminal`](../../components/pos/pos-terminal.tsx) shows a **Last receipt** badge in the **cart header** and a compact **Receipt** badge **next to the cart icon** in the toolbar (always visible even when the desktop cart rail is collapsed). Each successful checkout updates the tracked id client-side.
- [x] **Print rules:** [`app/globals.css`](../../app/globals.css) — `@media print` scoped with **`body:has(#pos-receipt-root)`** so only the receipt prints (plus `.no-print` for chrome like sheet footers).
- [x] **Zustand** store for cart ([`pos-cart-store.ts`](../../lib/stores/pos-cart-store.ts)); reset after successful sale. Cart persistence across refresh remains out of scope.

---

## Frozen decisions (apply in this phase)

- **No promotions:** transaction **`discount_amount_minor`** remains **0**; no `promotions` tables.
- **Tax:** **`tax_amount_minor`** = 0; UI does not imply tax configuration.
- **Payments:** no Stripe; enum only.

---

## Workstream A — Schema and persistence

- [x] **`pos_transactions`** (incl. **`queue_number`**, **`customer_call_name`**), **`location_queue_counter`**, **`pos_transaction_items`**, and related tables in Drizzle + migrations — [`lib/db/schema-transactions.ts`](../../lib/db/schema-transactions.ts).
- [x] **`product_addon`** and **`product_category_addon`** (migrations under `drizzle/`).
- [x] **`pos_transaction_item_addon`** (and instruction snapshots); **`checkoutId`** idempotency supported in **`createSale`**.
- [x] **Authorization:** **`requireCatalogMember`** on sales; catalog mutations remain manager/owner. **Postgres RLS** not required for MVP.

---

## Workstream B — POS application logic

- [x] **Sellable prices** from **`product_price`** for org; tier picked per line; validation in **`createSale`**.
- [ ] **Stock display (optional):** low/zero badge for **`track_inventory`** products — **not** implemented on POS grid (checkout is not blocked on stock).
- [x] **`createSale`:** single DB transaction; validates products, prices, add-ons (**active**, linked to line’s category, currency match), and optional **`checkoutId`** deduplication.

---

## Workstream C — UI/UX (POS-focused)

- [x] Touch-oriented layout, quantity stepper, large product tiles — iterate as needed.
- [x] **Org shell** with location context (`OrgAppShellLoader`, branch switcher) — see branch layout under **`l/[locationSlug]`**.
- [x] Post-checkout **Dialog** + **Print receipt** (preview **`Sheet`**) + **New sale** — [`pos-terminal.tsx`](../../components/pos/pos-terminal.tsx).
- [x] **Last receipt** badges (toolbar + cart header) wired to latest branch transaction + receipt sheet.
- [x] Basic error surfaces on failed checkout; deeper retry UX can be hardened later.

---

## Workstream D — Branding integration

- [x] Receipt uses **`business_details`** branding bundle from **`getTransactionReceiptBundle`** (via preview model for `PosReceiptDocument`).
- [x] Global print CSS for receipt isolation; user print dialog controls backgrounds (e.g. “background graphics” for logo colors — hinted in sheet UI).

---

## Workstream E — Quality and testing

- [ ] **Formal QA:** scripted large-cart run, concurrency tests, and accessibility audit — recommended before production hardening; not blockers for “MVP shipped in repo.”

---

## Dependencies for later phases

- Recommended future [offline sync](recommended-future-offline-sync.md): same write path would enqueue to local DB + sync; keep **createSale** isolated behind a service function to swap implementation.
- Phase 4: transaction list UI, reporting, inventory movements reference `transaction_id` / line ids.
- Phase 5: extend checkout to evaluate promotions and write `transaction_promotions`.

---

## Risks and mitigations

- **Double submit:** use disabled button + idempotency key.
- **Wrong org sales:** prominent org/store badge + server-side **`organization_id`** from trusted session, not client override.
- **Receipt PII:** receipts show minimal cashier identifier per policy (name vs id).

---

## Definition of done (checklist)

- [x] End-to-end path: product → cart (optional add-ons / instructions) → pay → persisted rows (including add-on snapshots) → branded printable receipt (standalone page and/or in-register sheet).
- [x] **Role matrix:** cashiers use **`requireCatalogMember`** for POS; catalog admin pages **`notFound`** for non–owner/manager (e.g. [`catalog/categories/page.tsx`](../../app/(protected)/(org)/[businessSlug]/catalog/categories/page.tsx)).

---

## Optional — demo catalog seed (local dev)

For a **Philippines-oriented coffee-shop sample** (categories, products, prices, inventory, add-ons, transactions optional wipe), run:

- **`pnpm db:seed:coffee`** — [`scripts/seed-coffee-catalog.ts`](../../scripts/seed-coffee-catalog.ts) (see script header for flags: org slug, `--wipe-catalog`, `--full-reset`). Loads **`.env`** then **`.env.local`** (override).
