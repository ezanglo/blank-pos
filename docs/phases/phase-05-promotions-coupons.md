# Phase 5 — Promotions and coupons (v1.2)

**Goal:** Owners/managers configure **promotions** (automatic or coupon-triggered; **v1.2: store-wide default**, optional **`promotion_locations`** when promos should vary by branch) with **stacking rules**; cashiers **apply coupon codes** (typed or scanned); POS **evaluates automatic promos** on cart changes; checkout persists **discounts** on transactions and **audit rows** in `transaction_promotions`. Receipts show **discount breakdown**.

**Prerequisites:** Phase 3 checkout and Phase 4 reporting baseline; clear transaction totals fields in use.

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (promotions, coupon_codes, transaction_promotions), promotion logic notes; **`promotion_locations`** optional once catalog/promos need per-**`location`** rules.

---

## Outcomes (exit criteria)

- [ ] Schema: `promotions`, `coupon_codes`, `transaction_promotions`; optional **`promotion_locations`** when promos are branch-specific ([schema-better-auth-alignment.md](../schema-better-auth-alignment.md)). Add `promotion_rules` JSON for `buy_x_get_y` if needed (or defer with feature flag—**document** which `type` values ship in v1.2).
- [ ] **Admin UI:** create/edit promotion; set `trigger` (`automatic` | `coupon`), `applies_to` (`cart` | `product` | `category`), `type` (`percentage` | `fixed_amount` | optional `buy_x_get_y`), schedule (`starts_at`, `ends_at`), `is_active`, usage limits.
- [ ] **Scope:** default promotions apply to the **whole store** (`organization_id`); narrow to branches via **`promotion_locations`** when implemented.
- [ ] **Coupon codes:** CRUD, limits, expiry, `is_active`, case-insensitive match policy documented.
- [ ] **POS evaluation engine:** pure function `evaluatePromotions(cart, context)` returning applied promos + amounts; unit-tested.
- [ ] **Stacking rules:** e.g. “max one automatic cart promo” + “coupon stack allowed or not”—implement explicit config on promotion or org-level setting; **document default** (recommend: **no stacking** except explicit allowlist).
- [ ] **Checkout persistence:** set `transactions.discount_amount`; keep line-level `transaction_items.discount` consistent if you distribute per line; write `transaction_promotions` rows with optional `coupon_code_id`.
- [ ] **Limits:** enforce `usage_limit` / `usage_count` and per-code counts atomically (DB transaction with row lock on promotion/code rows).
- [ ] **Receipts:** show each applied promotion name and amount; Phase 3 print styles extended.

---

## Frozen decisions (suggested defaults)

- **Tax:** still zero; discounts apply to subtotal before tax when tax exists later.
- **Automatic promos:** evaluate on every cart mutation **debounced** (e.g. 100–200ms) to avoid UI thrash.

---

## Workstream A — Schema and RLS

- [ ] Migrations for all promotion tables; indexes on `(organization_id, is_active)`, `(code)` unique per promotion or globally unique—**pick and enforce**.
- [ ] RLS: promotions readable/writable by manager+; cashiers read-only for active promos used in evaluation endpoint.

---

## Workstream B — Evaluation rules (engineering spec)

- [ ] **Eligibility:** schedule, active flag, cart contents match `applies_to` and `target_id`; optional **`location_id`** filter when `promotion_locations` exists.
- [ ] **Automatic:** select best single promo or multi per stacking rules; deterministic tie-break (highest value or explicit priority field—**add `priority int` to promotions** if needed).
- [ ] **Coupon:** user enters code → validate → attach to cart until cleared or checkout.
- [ ] **Conflicts:** if product matches multiple promos, document resolution order (`priority` desc).

---

## Workstream C — POS UI

- [ ] Coupon input component; optional **barcode** prefix mapping to coupon code (full barcode support in Phase 6).
- [ ] Cart lines show discounts per line when scoped; show **total savings** summary.
- [ ] Clear errors: expired, not applicable to this org/store, usage exhausted.

---

## Workstream D — Reporting hooks

- [ ] Extend daily summary: **discount total** and top promotions by usage.
- [ ] Ensure Phase 4 reporting SQL still valid or update aggregates to account for `discount_amount`.

**Baseline (Phase 4 shipped):** branch **Reports** and the **manager/owner dashboard** already read sales aggregates from [`lib/queries/reports.ts`](../../lib/queries/reports.ts) (`getDailySalesSummary`, `getDailySalesSeries`, product/transaction queries). Phase 5 extends those queries (and receipts) once **`discount_amount`** / **`transaction_promotions`** exist—no need to duplicate dashboard KPI logic elsewhere.

---

## Workstream E — Quality

- [ ] **Unit tests** for evaluator: percentage vs fixed, category-scoped, cart-scoped, date boundaries.
- [ ] **Concurrency tests** for usage limits under parallel checkout attempts.

---

## Bundle / set promotions (planned scope)

**Goal:** Christmas sets, family meals, “buy these together” discounts without ad-hoc manual coupons.

- **Preferred (Phase 5):** add a promotion **type** or rule shape **bundle** in `evaluatePromotions`: when the cart satisfies a defined set of products/categories and quantities, apply a **percentage** or **fixed** discount (automatic or coupon-triggered), reusing schedules, `transaction_promotions`, and stacking rules.
- **Optional later (catalog + POS):** a **`bundle` product** that **explodes** into normal line items at add-to-cart (Phase 2 surface + Phase 3 cart) so the menu shows one tile; discount can still be a Phase 5 bundle promo.
- **Defer:** “promotion product” that only auto-adds lines + hidden coupon—harder to audit; use bundle rules + optional bundle SKU instead.

---

## Dependencies for later phases

- Phase 6 void/refund: reverse or annotate promotion usage counts consistently.

---

## Risks and mitigations

- **Discount double-apply on retry:** bind promotion application to transaction id idempotency from Phase 3 (`checkoutId`); if offline sync ships, see [recommended-future-offline-sync.md](recommended-future-offline-sync.md).
- **Complex `buy_x_get_y`:** ship behind flag or phase 5.1 if scope explodes.

---

## Definition of done (checklist)

- [ ] Automatic and coupon paths both demonstrated in UAT script.
- [ ] Usage limits enforced under parallel requests.
- [ ] Receipt matches transaction_promotions totals.
