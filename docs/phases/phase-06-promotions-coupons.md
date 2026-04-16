# Phase 6 — Promotions and coupons (v1.2)

**Goal:** Owners/managers configure **promotions** (automatic or coupon-triggered; **v1: org-wide only**, no `promotion_locations`) with **stacking rules**; cashiers **apply coupon codes** (typed or scanned); POS **evaluates automatic promos** on cart changes; checkout persists **discounts** on transactions and **audit rows** in `transaction_promotions`. Receipts show **discount breakdown**.

**Prerequisites:** Phase 3 checkout and Phase 5 reporting baseline; clear transaction totals fields in use.

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §4 (promotions, coupon_codes, transaction_promotions), promotion logic notes; `promotion_locations` deferred until multi-site.

---

## Outcomes (exit criteria)

- [ ] Schema: `promotions`, `coupon_codes`, `transaction_promotions`; **`promotion_locations` deferred** until multi-site ([schema-better-auth-alignment.md](../schema-better-auth-alignment.md)). Add `promotion_rules` JSON for `buy_x_get_y` if needed (or defer with feature flag—**document** which `type` values ship in v1.2).
- [ ] **Admin UI:** create/edit promotion; set `trigger` (`automatic` | `coupon`), `applies_to` (`cart` | `product` | `category`), `type` (`percentage` | `fixed_amount` | optional `buy_x_get_y`), schedule (`starts_at`, `ends_at`), `is_active`, usage limits.
- [ ] **Scope:** v1 promotions always apply to the **whole organization** (one store).
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

- [ ] **Eligibility:** schedule, active flag, cart contents match `applies_to` and `target_id` (no location dimension in v1).
- [ ] **Automatic:** select best single promo or multi per stacking rules; deterministic tie-break (highest value or explicit priority field—**add `priority int` to promotions** if needed).
- [ ] **Coupon:** user enters code → validate → attach to cart until cleared or checkout.
- [ ] **Conflicts:** if product matches multiple promos, document resolution order (`priority` desc).

---

## Workstream C — POS UI

- [ ] Coupon input component; optional **barcode** prefix mapping to coupon code (full barcode support in Phase 7).
- [ ] Cart lines show discounts per line when scoped; show **total savings** summary.
- [ ] Clear errors: expired, not applicable to this org/store, usage exhausted.

---

## Workstream D — Reporting hooks

- [ ] Extend daily summary: **discount total** and top promotions by usage.
- [ ] Ensure Phase 5 SQL still valid or update aggregates to account for `discount_amount`.

---

## Workstream E — Quality

- [ ] **Unit tests** for evaluator: percentage vs fixed, category-scoped, cart-scoped, date boundaries.
- [ ] **Concurrency tests** for usage limits under parallel checkout attempts.

---

## Dependencies for later phases

- Phase 7 void/refund: reverse or annotate promotion usage counts consistently.

---

## Risks and mitigations

- **Discount double-apply on retry:** bind promotion application to transaction id idempotency from Phase 3–4.
- **Complex `buy_x_get_y`:** ship behind flag or phase 6.1 if scope explodes.

---

## Definition of done (checklist)

- [ ] Automatic and coupon paths both demonstrated in UAT script.
- [ ] Usage limits enforced under parallel requests.
- [ ] Receipt matches transaction_promotions totals.
