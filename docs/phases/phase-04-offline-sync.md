# Phase 4 — Offline-first and sync

**Goal:** The POS remains usable **offline**: reads and writes go to **PGlite** in the browser; a **custom sync engine** pushes/pulls changes to **Supabase** when online. **Conflict rules** match the master plan: append-only sales; **last-write-wins** on mutable catalog/inventory with `updated_at`; stock scoped by **organization** (v1: org = one site). **Branding** and org settings sync so UI stays correct offline.

**Prerequisites:** Phase 3 checkout path working **online** against Supabase (or at least transactions persisted server-side). Refactor if needed so domain writes go through a **single “data port”** layer.

**References:** [blank-pos-dev-plan.md](../blank-pos-dev-plan.md) §6 (offline strategy).

---

## Outcomes (exit criteria)

- [ ] **PGlite** boots in browser (WASM), with schema **matching** Postgres tables used by POS + catalog reads (subset is acceptable if admin screens remain online-only—**document** which routes require network).
- [ ] **Online mode:** app writes to PGlite and syncs to Supabase successfully (or writes through queue that flushes immediately).
- [ ] **Offline mode:** user can complete **at least one sale** offline; sale appears in local `transactions` immediately.
- [ ] **Reconnect:** queued operations **push** to Supabase without duplicate transactions (idempotency keys from Phase 3 reused).
- [ ] **Pull on load / reconnect:** server changes (e.g. price updates) merge per **LWW** rules; never overwrite completed local sale with server “empty” state.
- [ ] **Manual sync** control (manager): trigger pull+push; show last sync time and error summary.
- [ ] **Indicator:** global online/offline badge; debounced connectivity detection (`navigator.onLine` + heartbeat fetch).
- [ ] **Branding + org metadata** cached locally for receipt and shell.

---

## Frozen decisions (apply in this phase)

- **No ElectricSQL / PowerSync** in v1 unless you explicitly replan.
- **PGlite** only (not sql.js).

---

## Workstream A — Schema parity and migrations (local)

- [ ] Export or duplicate Drizzle schema definitions for PGlite-compatible DDL (same table names/columns where possible).
- [ ] **Migration runner** in client for PGlite version bumps (local version table).
- [ ] **Outbox table** (e.g. `sync_outbox`): `id`, `payload`, `entity_type`, `op`, `created_at`, `status`, `error`, retry count.

---

## Workstream B — Sync engine

- [ ] Define **sync operations** minimal set: `upsertTransaction`, `upsertProduct`, … map 1:1 to server RPC or REST batch endpoints you control.
- [ ] **Push loop:** exponential backoff; max retries; dead-letter surface for managers.
- [ ] **Pull loop:** cursor by `updated_at` per table or server-provided sync token; handle pagination.
- [ ] **Ordering:** transactions pushed before dependent entities if any (usually none); catalog pulls can run independently.
- [ ] **Conflict resolution implementation:**
  - [ ] **Transactions:** append-only; server accepts client-generated UUIDs; reject duplicate ids.
  - [ ] **Catalog/inventory:** compare `updated_at`; winner writes; loser surfaces **soft conflict** log optional in MVP.
  - [ ] **Stock:** **organization-scoped**; LWW on `inventory_stock.updated_at` with caution—document that concurrent stock edits are rare in MVP.

---

## Workstream C — App integration

- [ ] **Zustand** (or small module) for `connectivity`, `syncStatus`, `lastSyncedAt`, `outboxCount`.
- [ ] Wrap **createSale** (Phase 3) to write PGlite + enqueue outbox instead of only server action (or: server action becomes “local write” in offline-first architecture—**pick one**: pure client PGlite + background sync vs optimistic server—**recommended:** local authoritative when offline, sync pushes to Supabase).
- [ ] **Read path:** POS product grid reads from PGlite; initial hydrate from pull when online.

---

## Workstream D — Security and secrets

- [ ] Supabase **publishable** key only in client; RLS must protect all sync paths; no service role in browser.
- [ ] **Auth token refresh** while offline: document session TTL limits; graceful re-auth when back online if session expired.

---

## Workstream E — Testing

- [ ] **Chrome DevTools** offline preset: full sale flow.
- [ ] **Two-device scenario** (stretch): catalog edit online while device offline; verify LWW behavior matches spec.
- [ ] **Soak test:** queue 200 ops, reconnect, verify ordering and completion.

---

## Dependencies for later phases

- Phase 5 reports: read from Supabase online; optionally local summaries—clarify single source of truth (**recommended:** Supabase for reports; local for POS continuity).

---

## Risks and mitigations

- **Schema drift:** automate check that Drizzle Postgres schema and PGlite DDL stay in sync (codegen or shared definitions).
- **Large pulls:** incremental cursors; avoid full table scan each load.
- **Session expiry mid-offline:** clear UX; queue holds until re-auth.

---

## Definition of done (checklist)

- [ ] Documented **offline-capable routes** vs online-only admin.
- [ ] Video or written demo: offline sale → online → row visible in Supabase dashboard.
- [ ] No duplicate transactions under double reconnect.
