# Phase 3 — POS terminal (MVP sales)

**Goal:** Cashiers complete **checkout** for the **active organization** (v1: org = store): browse products, build a **cart**, pick **price tier**, record **payment method** (no processor), persist **transactions** and **line items**, view and **browser-print** a **branded receipt**. **No discounts, coupons, or tax configuration** in this phase.

**Prerequisites:** Phase 1 (branding, org = store, `session.activeOrganizationId`), Phase 2 (products, prices, active catalog).

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (transactions, transaction_items), §5 v1 POS bullets.

---

## Outcomes (exit criteria)

- [ ] **Organization context** is explicit for every POS session via **`session.activeOrganizationId`** (and slug route); **no** separate location dimension in v1.
- [ ] **POS grid** of active products with category filter and search (name/SKU/barcode partial match).
- [ ] **Cart** supports add/remove, quantity stepper, empty cart; shows line subtotals and **grand subtotal** (no tax line).
- [ ] **Price tier selection** per line or per cart policy—**pick one UX** and document it (recommended: per line default to org-wide default tier; allow change per line before checkout).
- [ ] **Checkout** captures `payment_method` enum (`cash`, `card_placeholder`, …); persists `transactions` with `status=completed` (or `open` then complete—**MVP: single-step completed**).
- [ ] **transaction_items** store `product_id`, `product_price_id`, `quantity`, `unit_price`, `discount` column **always zero**, `subtotal` consistent with `quantity × unit_price`.
- [ ] **Receipt page:** org branding (signed logo URL, colors, header/footer copy), line items, totals, transaction id, **store/org name** (and address from org fields), timestamp, cashier display name.
- [ ] **Print stylesheet:** `@media print` hides chrome, fits paper, stable layout for browser print dialog.
- [ ] **Zustand** store for cart (ephemeral) with reset after successful sale; optional persistence across refresh is **out of scope** unless trivial.

---

## Frozen decisions (apply in this phase)

- **No promotions:** `discount_amount` on transaction remains **0**; no `promotions` tables.
- **Tax:** `tax_amount` = 0; UI does not imply tax configuration.
- **Payments:** no Stripe; enum only.

---

## Workstream A — Schema and persistence

- [ ] Implement `transactions` and `transaction_items` in Drizzle + migrations (if not created earlier as stubs).
- [ ] **Idempotency:** optional client `checkoutId` UUID to prevent double-submit—recommended for flaky networks even before Phase 4.
- [ ] **RLS:** insert/select policies for transactions scoped by **`organization_id`** and **`member.organizationId`** (same org).

---

## Workstream B — POS application logic

- [ ] Resolve **sellable price** for product: use **`product_prices`** for this org only (fallback rule from Phase 2: `is_default` or sort); **no** location branch in v1.
- [ ] **Stock display (read-only optional):** if `inventory_stock` exists, show low/zero badge for simple products with `track_inventory`—**optional** in Phase 3; do not block checkout on stock in MVP unless product policy demands it (**MVP default:** warn only, no hard block).
- [ ] Server action: **createSale** in a single DB transaction (header + lines); validate all `product_id` belong to org and prices match.

---

## Workstream C — UI/UX (POS-focused)

- [ ] Large touch targets, keyboard-friendly quantity entry where possible.
- [ ] Clear **active store (organization)** indicator; **no** branch switcher in v1.
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

- [ ] End-to-end demo: product → cart → pay → persisted rows → branded printable receipt.
- [ ] Role matrix respected for POS access (cashier cannot open admin catalog edit routes).
