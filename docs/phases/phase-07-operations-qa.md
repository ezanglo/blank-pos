# Phase 7 — Operations, hardening, and QA (v1.3 + release readiness)

**Goal:** Day-two retail operations: **shifts / cash drawer**, **void and refund** flows with inventory reversal, **barcode** scanning for products and coupons, **CSV import** for products, optional **thermal** receipt improvements, **role-based UI** completion, **RLS audit**, performance pass, and **UAT** sign-off.

**Prerequisites:** Phases 1–6 complete or explicitly descoped with tickets.

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §5 v1.3, §7 role matrix.

---

## Outcomes (exit criteria)

- [ ] **Shifts / cash drawer:** open shift, close shift with expected vs actual cash entry, variance note; persist shift records tied to **`organization_id`** and `user_id` (schema may be new—design `shifts` table: `opened_at`, `closed_at`, `opening_float`, `closing_counted`, `status`).
- [ ] **Void transaction:** manager permission; marks `transactions.status=voided`; **no deletion**; inventory **reversal** movements if Phase 5 deductions applied; promotion usage counts rolled back if applicable.
- [ ] **Refund:** define policy (full refund only in MVP vs partial)—implement minimal **full refund** path creating compensating records or linked refund transaction; document accounting limitations.
- [ ] **Barcode scanning:** integrate hardware or `BarcodeDetector` where available; map scan to **SKU/barcode** product lookup and coupon code path.
- [ ] **CSV import:** upload, preview, validate rows, commit in batch with error report; dry-run mode.
- [ ] **Receipt hardening:** optional **thermal** width CSS (80mm), font sizing; escape hatch remains browser print.
- [ ] **RBAC UI:** hide routes and actions per [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §7 matrix; server remains source of truth.
- [ ] **Authorization review:** second pass on server actions and org scoping; attempt privilege escalation tests; document in [docs/security/authorization.md](../security/authorization.md) if you add optional Postgres RLS.
- [ ] **Performance:** Lighthouse or simple RUM on POS; optimize N+1 queries; image optimization for product grid.
- [ ] **UAT checklist** signed by stakeholder (even self-signoff) with known limitations list.

---

## Frozen decisions (apply in this phase)

- **Payment processor:** still optional; if added later, keep shift variance separate from card batch settlement.
- **Partial refunds:** ship only if explicitly scheduled; otherwise document as future.

---

## Workstream A — Operations schema

- [ ] `shifts` (or `cash_drawer_sessions`) table + RLS.
- [ ] Link `transactions` to `shift_id` nullable for historical data before feature—migration strategy documented.

---

## Workstream B — Void/refund + inventory integrity

- [ ] **Void:** server action checks role; writes audit fields (`voided_at`, `voided_by`, reason).
- [ ] **Inventory reversal:** mirror deduction logic with `type=in` movements referencing original transaction.
- [ ] **Promotion rollback:** decrement `usage_count` safely with constraints.

---

## Workstream C — Barcode and import

- [ ] **Product scan:** resolves to single product; ambiguity UI if collision.
- [ ] **Coupon scan:** routes to promotion engine.
- [ ] **CSV mapping:** columns documented; template file downloadable.

---

## Workstream D — Hardening

- [ ] **Error budget:** user-friendly errors for common failures (session expired, sync backlog).
- [ ] **Observability:** basic client error reporting hook (optional Sentry) behind env flag.
- [ ] **Backups:** Postgres backup strategy verified for production (provider-native snapshots or `pg_dump` schedule).

---

## Workstream E — QA program

- [ ] **Test matrix** by role: owner, manager, cashier—each row of matrix exercised, including **who may open Settings → Team** and **`createUser`** (align with Phase 1 rules: e.g. only owner creates managers).
- [ ] **Offline + void** interaction documented (if void requires online, state clearly).
- [ ] **Load test light:** e.g. 50 concurrent checkouts simulation if feasible.

---

## Risks and mitigations

- **Refunds vs accounting:** avoid claiming full accounting compliance; keep audit trail emphasis.
- **CSV bad data:** strong validation + transactional import chunks.

---

## Definition of done (checklist)

- [ ] Security review notes committed.
- [ ] Known issues list triaged into post-launch backlog.
- [ ] Production deploy runbook: env vars, migrations, Storage buckets, RLS enable order.
