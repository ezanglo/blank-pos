# Phase 3 — POS terminal (MVP sales)

**Goal:** Cashiers complete **checkout** for the **active organization** (v1: org = store): browse products, build a **cart**, pick **price tier**, optionally choose **category-scoped add-ons** (e.g. toppings, milk swaps), record **payment method** (no processor), persist **transactions** and **line items** (including per-line add-on breakdown), view and **browser-print** a **branded receipt**. **No discounts, coupons, or tax configuration** in this phase.

**Prerequisites:** Phase 1 (branding, org + branches, `session.activeOrganizationId`), Phase 2 (products, **`amount_minor`** prices, catalog **filtered by active `location`** per availability rules). Managers configure **category-scoped add-ons** (and variants / special instructions) under **Catalog → Categories** — open the **Add-ons** dialog for each category. There is **no** separate add-ons admin route (legacy **`/catalog/add-ons`** redirects to categories).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (transactions, `transaction_items`, **`transaction_item_addon`**, **`product_addon`**, **`product_category_addon`**), §5 v1 POS bullets.

---

## Outcomes (exit criteria)

- [ ] **Organization context** via **`session.activeOrganizationId`** and routes; **branch context** from **`/{businessSlug}/l/{locationSlug}`**. Product grid lists only products **available at that location** (Phase 2 **`product.availability_mode`** + optional **`product_location`** rows).
- [ ] **POS grid** of active products with category filter and search (name/SKU/QR partial match).
- [ ] **Cart** supports add/remove, quantity stepper, empty cart; shows line subtotals and **grand subtotal** (no tax line). **Add-ons** appear **indented under the parent line**; totals include base price plus add-ons scaled by line quantity.
- [ ] **Cart line identity:** the same **product + price tier** with **different add-on selections** are **separate lines** (e.g. small milk tea + pearl vs small milk tea + nata). Quantity **merges** only when product, tier, and **full add-on signature** (sorted add-on ids and per-add-on quantities) match.
- [ ] **Add-on UX:** after quantity and **price tier** are chosen, if the product’s **category** has active add-ons whose **currency matches** the selected tier, an **add-ons** step lets staff toggle options (optional; can add with none). Add-ons are **not** separate cart rows; they nest under the parent item.
- [ ] **Price tier selection** per line or per cart policy—**pick one UX** and document it (recommended: per line default to org-wide default tier; allow change per line before checkout).
- [ ] **Checkout** captures `payment_method` enum (`cash`, `card_placeholder`, …); persists `transactions` with `status=completed` (or `open` then complete—**MVP: single-step completed**).
- [ ] **transaction_items** store `product_id`, `product_price_id`, `quantity`, **`unit_price_minor`** (product unit only), `discount` column **always zero**, **`subtotal_minor`** = **full line total** (base × qty + all add-on money for that line).
- [ ] **`transaction_item_addon`** rows (per parent line): snapshot **`name`**, **`unit_price_minor`**, **`quantity`** (per-drink add-on units), **`subtotal_minor`** (already × parent line qty × add-on qty), FK to **`product_addon`** for catalog integrity; receipts use snapshots so past sales stay stable if catalog changes.
- [ ] **Receipt page:** org branding (signed logo URL, colors, header/footer copy), line items with **indented add-on lines**, totals, transaction id, **store/org name** (and address from org fields), timestamp, cashier display name.
- [ ] **Print stylesheet:** `@media print` hides chrome, fits paper, stable layout for browser print dialog.
- [ ] **Zustand** store for cart (ephemeral) with reset after successful sale; optional persistence across refresh is **out of scope** unless trivial.

---

## Frozen decisions (apply in this phase)

- **No promotions:** transaction **`discount_amount_minor`** remains **0**; no `promotions` tables.
- **Tax:** **`tax_amount_minor`** = 0; UI does not imply tax configuration.
- **Payments:** no Stripe; enum only.

---

## Workstream A — Schema and persistence

- [ ] Implement `transactions` and `transaction_items` in Drizzle + migrations (if not created earlier as stubs).
- [ ] **`product_addon`** (org-scoped name, **`amount_minor`**, **`currency`** — aligned to org/branch default via catalog actions — **`is_active`** for POS filtering, org-level sort) and **`product_category_addon`** (which categories expose which add-ons, per-category **`sort_order`** / drag order). Migration: e.g. `drizzle/0004_product_addons.sql`.
- [ ] **`transaction_item_addon`** child rows as above; **`checkoutId`** idempotency on **`transactions`** remains optional but recommended.
- [ ] **Authorization:** same **application RBAC** as catalog (org + membership); **Postgres RLS** for transactions remains **optional** hardening, not required for MVP merge.

---

## Workstream B — POS application logic

- [ ] Resolve **sellable price** for product: use **`product_price`** rows for this org only (fallback rule from Phase 2: `is_default` or sort); **no** location branch in v1.
- [ ] **Stock display (read-only optional):** if `inventory_stock` exists, show low/zero badge for simple products with `track_inventory`—**optional** in Phase 3; do not block checkout on stock in MVP unless product policy demands it (**MVP default:** warn only, no hard block).
- [ ] Server action: **createSale** in a single DB transaction (header + lines + **add-on rows**); validate all `product_id` belong to org, prices match, and each add-on is **active**, **org-scoped**, **linked to the product’s `category_id`**, and **currency-matches** the chosen **`product_price`**.

---

## Workstream C — UI/UX (POS-focused)

- [ ] Large touch targets, keyboard-friendly quantity entry where possible.
- [ ] Clear **active business and branch** indicator (org shell / header); POS cart is for the **current `location`** from the route.
- [ ] Post-checkout **success state** with actions: **Print receipt**, **New sale**.
- [ ] Error handling: inactive product, price missing, network failure with retry guidance.

---

## Workstream D — Branding integration

- [ ] Reuse Phase 1 branding fetch; map to receipt layout and POS accent buttons.
- [ ] Print: ensure **background graphics** optional (user print settings); provide high-contrast fallback.

---

## Workstream E — Quality and testing

- [ ] Manual script: 20-line cart, checkout, reload transaction list (if list view included—**minimum** is receipt from last id).
- [ ] **Concurrency:** two cashiers same org—no SKU collisions; DB handles parallel inserts.
- [ ] **Accessibility:** focus order, visible focus, ARIA on cart live region for additions.

---

## Dependencies for later phases

- Phase 4: same write path will enqueue to local DB + sync; keep **createSale** isolated behind a service function to swap implementation.
- Phase 5: transaction list UI, reporting, inventory movements reference `transaction_id` / line ids.
- Phase 6: extend checkout to evaluate promotions and write `transaction_promotions`.

---

## Risks and mitigations

- **Double submit:** use disabled button + idempotency key.
- **Wrong org sales:** prominent org/store badge + server-side **`organization_id`** from trusted session, not client override.
- **Receipt PII:** receipts show minimal cashier identifier per policy (name vs id).

---

## Definition of done (checklist)

- [ ] End-to-end demo: product → cart (with optional add-ons) → pay → persisted rows (**including `transaction_item_addon`**) → branded printable receipt (add-ons visible).
- [ ] Role matrix respected for POS access (cashier cannot open admin catalog edit routes, including **Catalog → Categories** / products / inventory).
