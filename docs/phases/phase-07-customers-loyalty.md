# Phase 7 — Customers and loyalty (planned)

**Goal:** Org-scoped **customer** identity (phone, profile, marketing consent), attach customers to **transactions**, support **habit-based promotions** (with Phase 5), **points earn/redeem**, and optional **consumer-facing** signup + **QR** for scan at checkout (barcode path in Phase 6).

**Prerequisites:** Phase 5 promotions (for segment/campaign logic); Phase 6 void/refund + scanning for clean loyalty reversals and QR lookup.

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md); roadmap notes in `.cursor/plans/` (customers & bundles).

---

## Milestones

| Milestone | Scope |
|-----------|--------|
| **7a — Identity** | `customers` (org-scoped), normalized phone, optional name; nullable `customer_id` on `transactions`; POS lookup by phone or scan. |
| **7b — Loyalty ledger** | Points tables; idempotent earn per sale; reversal aligned with void/refund. |
| **7c — Optional portal** | Public or lightweight routes: profile, balance, **show my QR**; not required for in-store-only MVP. |

---

## Notes

- **Privacy:** document purpose, retention, and opt-in for phone/marketing.
- **QR vs phone:** internal stable token or signed payload; Phase 6 scanner resolves to `customer_id` at checkout.

---

## Definition of done (future)

- [ ] Customer can be attached at checkout without blocking sales if unknown.
- [ ] Points earn matches completed transactions; void/refund adjusts ledger consistently.
- [ ] Optional portal generates a scannable loyalty QR tied to the same org customer record.
