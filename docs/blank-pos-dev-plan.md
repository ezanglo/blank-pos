# Blank POS — Development Plan

> **Stack:** Next.js · PostgreSQL (`DATABASE_URL`) · Drizzle · better-auth · IndexedDB/SQLite (offline-first direction)
> **Philosophy:** Simple now. Scalable later.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture](#3-architecture)
4. [Database Schema](#4-database-schema) · [Auth schema alignment](schema-better-auth-alignment.md)
5. [Feature Roadmap](#5-feature-roadmap)
6. [Offline-First Strategy](#6-offline-first-strategy)
7. [Auth & Multi-Organization Setup](#7-auth--multi-organization-setup)
8. [Recommended Future Features](#8-recommended-future-features)
9. [Folder Structure](#9-folder-structure)
10. [Development Phases](#10-development-phases) · [First-run onboarding](onboarding-first-run.md)

---

## 1. Project Overview

**Blank POS** is a simple, extensible point-of-sale system. **v1:** one **better-auth organization** is one **business**; **branches** are **`location`** rows (many per `organization_id`, each with slug, address, default currency). A second legal entity is a second **`organization`**. It supports product management, categorization, variable pricing, inventory tracking, recipe/composite product creation, costing, and promotions/coupon codes — with offline-first direction and sync to the same app’s **Postgres** backend. See [schema-better-auth-alignment.md](schema-better-auth-alignment.md).

### Core Goals

- Sell products quickly and reliably, even without internet
- Manage inventory and compute product costs from raw materials
- Support multiple store branches under one organization
- Stay simple for v1, but built to extend

---

## 2. Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Frontend | Next.js (App Router) | File-based routing, server components, great ecosystem |
| Language | TypeScript | Type safety, better DX |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent UI |
| Auth | better-auth | Native organization/team support, flexible |
| Database (hosted) | PostgreSQL (Neon, RDS, Docker, etc.) | Standard `DATABASE_URL`; pooler URLs OK on serverless |
| Database (local / offline) | SQLite via `sql.js` or `PGlite` | Offline-first; syncs to the hosted API when online |
| Sync Layer | ElectricSQL or custom sync logic | Conflict resolution, local-first sync |
| State Management | Zustand or Jotai | Lightweight, works well with offline state |
| ORM | Drizzle ORM | Works with both SQLite and PostgreSQL |

---

## 3. Architecture

```
┌─────────────────────────────────────────────┐
│                   Client                    │
│                                             │
│  Next.js App (Browser / Electron optional)  │
│  ┌──────────────┐   ┌─────────────────────┐ │
│  │  UI Layer    │   │  Local DB (SQLite/  │ │
│  │  (shadcn/ui) │   │  PGlite)            │ │
│  └──────┬───────┘   └─────────┬───────────┘ │
│         │                     │             │
│         └────────┬────────────┘             │
│                  │ Sync Engine              │
└──────────────────┼──────────────────────────┘
                   │ (when online)
┌──────────────────▼──────────────────────────┐
│         Next.js API + PostgreSQL             │
│  Drizzle · better-auth · object storage      │
└─────────────────────────────────────────────┘
```

---

## 4. Database Schema

### Auth and tenancy (better-auth — do not duplicate)

Core **users, sessions, accounts**, and **organization plugin** tables are **owned by better-auth**. Generate and migrate them with the **Better Auth CLI** and the **Drizzle adapter** so the schema matches the library ([Organization plugin](https://www.better-auth.com/docs/plugins/organization), [Drizzle adapter](https://www.better-auth.com/docs/adapters/drizzle)).

**Use as-is (plugin defaults, singular table name `organization`):**

- **`organization`** — `id`, `name`, `slug`, optional `logo`, optional `metadata`, timestamps (exact set per generated schema).
- **`member`** — membership and **org role** string per user (`role`: `owner` | `manager` | `cashier` or your configured allowlist).
- **`invitation`** — may exist from plugin migrations; **v1 does not use invites** for team onboarding. Add users via **Admin `createUser`** + **`addMember`** ([schema-better-auth-alignment.md](schema-better-auth-alignment.md)).
- **`session`** — includes **`activeOrganizationId`** for the current org context.

**App-owned:**

```sql
location        -- many rows per organization_id (branch slug + name, is_default, default_currency, address_*, phone)
                -- PK id; unique (organization_id, slug); see lib/db/schema-app.ts

business_details  -- one row per organization (PK organization_id → organization.id): branding, legal, contact, optional onboarding fields (e.g. business_category); optional default_currency for catalog price defaults (see Phase 2 doc)
user_profile      -- one row per user (PK user_id → user.id): optional person-level fields (phone, locale, etc.)
```

**Tenancy:** **`organization`** = business (tenant); **`location`** = branch. URLs use **`/{businessSlug}/l/{locationSlug}/…`** for branch-scoped UI (`businessSlug` = `organization.slug`). Access is enforced in **application code** today; optional Postgres RLS later aligns with **`member`** and **`location`**.

POS-specific **default currency** and **site address** for receipts: read from the active **`location`** row (see [schema-better-auth-alignment.md](schema-better-auth-alignment.md)).

### Products & Categories

**Money:** Store monetary amounts as **integer minor units** (`bigint`), e.g. `amount_minor`, `cost_per_unit_minor`. Compute in **bigint** on the server; **do not** use floats for prices or costs. **UI** shows two decimal places. See [docs/phases/phase-02-product-engine.md](phases/phase-02-product-engine.md).

**Catalog vs branches:** `products` are **org-scoped**. **Availability** defaults to all branches; optional **`product_locations`** restricts which `location` rows may sell the product. Price tiers remain **org-wide** in Phase 2 (no `location_id` on `product_prices` yet).

```sql
categories
  id, organization_id  -- → organization.id
  name, color, icon, sort_order, created_at

products
  id, organization_id  -- → organization.id
  name, description, category_id,
  sku, barcode, image_url, is_active, is_composite,
  track_inventory,
  availability_mode,  -- e.g. all_locations | selected_locations_only
  created_at, updated_at

product_locations   -- optional rows when availability_mode = selected_locations_only
  id, product_id, location_id  -- location.organization_id must match product's org

product_category_variant   -- preset price labels per category (e.g. Small / Medium / Large)
  id, category_id, label, sort_order, created_at
  -- unique (category_id, label); sort_order drives ordering when linked from product_price

product_prices
  id, product_id, label, amount_minor, currency
  category_variant_id  -- nullable → product_category_variant.id; label snapshot at write time
  is_default, sort_order  -- sort_order often mirrors variant.sort_order when linked
  -- amount_minor: bigint, minor units (e.g. centavos)
  -- Phase 2: org-scoped tiers only (no per-location price rows; add location_id when multi-branch pricing ships)
```

### Inventory

```sql
inventory_items
  id, organization_id, name, unit, cost_per_unit_minor,  -- bigint minor units per inventory unit
  reorder_point, created_at, updated_at
  -- prefer inventory_stock for quantity; omit denormalized current_stock unless you add it deliberately

inventory_stock
  id, inventory_item_id, organization_id, quantity, updated_at

inventory_movements
  id, inventory_item_id, organization_id, type (in|out|adjustment),
  quantity, reference_id, note, created_at
```

### Composite Products (Product Creation from Inventory)

```sql
product_ingredients
  id, product_id, inventory_item_id, quantity_fixed_scale
  -- quantity_fixed_scale: integer at a documented scale (e.g. milli-units); avoid float
  -- Defines the recipe/BOM for a composite product; used for COGS and Phase 5 deduct
```

### Promotions & Coupons

```sql
promotions
  id, organization_id, name, description,
  type (percentage | fixed_amount | buy_x_get_y),
  value,                          -- discount amount or percentage
  applies_to (cart | product | category),
  target_id (nullable),           -- product_id or category_id if scoped
  trigger (automatic | coupon),   -- automatic = applied on conditions; coupon = requires code
  is_active, starts_at, ends_at,
  usage_limit (nullable),         -- null = unlimited
  usage_count,
  created_at, updated_at

-- promotion_locations: defer until multi-site; v1 promotions apply to the whole organization (one store)

coupon_codes
  id, promotion_id, code,         -- e.g. "SUMMER20"
  usage_limit (nullable),
  usage_count,
  is_active, expires_at, created_at
  -- One promotion can have many codes (e.g. single-use codes per customer)
```

**Promotion Logic Notes:**

- `trigger = automatic` → evaluated on every cart update for the active organization; no code needed
- `trigger = coupon` → cashier or customer enters a code at checkout; matched against `coupon_codes`
- `applies_to = cart` → discount applied to the total
- `applies_to = product | category` → discount applied only to matching items in the cart
- `buy_x_get_y` → store X and Y in a `promotion_rules` JSON field or a separate table when implementing

```sql
-- Track coupon usage per transaction for audit and limit enforcement
transaction_promotions
  id, transaction_id, promotion_id, coupon_code_id (nullable),
  discount_amount, applied_at
```

### Sales

```sql
transactions
  id, organization_id, user_id,
  status (open|completed|voided),
  subtotal_amount_minor, discount_amount_minor, tax_amount_minor, total_amount_minor,  -- bigint minor units
  payment_method, notes, created_at
  -- optional later: location_id for branch-scoped reporting

transaction_items
  id, transaction_id, product_id, product_price_id,
  quantity, unit_price_minor, discount_minor, subtotal_minor  -- bigint; integer-safe line math
```

---

## 5. Feature Roadmap

### v1 — Core POS (MVP)

- [x] **Signup + onboarding** (browser: **`/signup`**, **`/onboarding`**, org + branches + **`business_details`**) — [onboarding-first-run.md](onboarding-first-run.md)
- [x] User auth: **email + password**; roles **owner / manager / cashier**; **public sign-up** enabled; team members via owner/manager **createUser** + **addMember** (real email)
- [ ] Category management (CRUD, color/icon)
- [ ] Product management (CRUD, assign category)
- [ ] Multiple price tiers per product (org-scoped)
- [ ] Inventory items (raw materials/stock)
- [ ] Composite product builder (recipe from inventory items)
- [ ] Cost calculation (sum of ingredient costs)
- [ ] POS terminal screen (cart, price selection, checkout)
- [ ] Basic transaction recording
- [ ] Offline mode with local DB
- [ ] Background sync to the hosted API when online

### v1.1 — Inventory & Reporting

- [ ] Inventory adjustments and movement log
- [ ] Auto-deduct inventory on sale (for composite products)
- [ ] Low stock alerts
- [ ] Daily sales summary
- [ ] Product sales report

### v1.2 — Promotions & Coupons

- [ ] Promotion management UI (create, edit, activate/deactivate)
- [ ] (Future) Location scoping for promotions when multi-site exists
- [ ] Automatic promotions (applied silently on cart based on conditions)
- [ ] Coupon code entry at checkout (manual input or barcode scan)
- [ ] Coupon code management (generate, set limits, expiry)
- [ ] Promotion conflict rules (e.g. allow stacking or not)
- [ ] Discount display on receipt
- [ ] Usage tracking and reporting

### v1.3 — Operations

- [ ] Shift/cash drawer management
- [ ] Void and refund transactions
- [ ] Receipt printing (browser print / thermal)
- [ ] Barcode scanning support
- [ ] Product import via CSV

---

## 6. Offline-First Strategy

Blank POS is designed to work reliably without internet.

### Local Database

Use **PGlite** (PostgreSQL in the browser via WASM) or **SQLite via sql.js** as the local store. PGlite is preferred when you want the same SQL dialect as the server Postgres schema.

### Sync Strategy

```
Write → Local DB first → Queue sync operation → Push to server when online
Read  → Always from Local DB (fast, consistent)
```

### Conflict Resolution

- Transactions are **append-only** — no conflict possible
- Product/inventory updates use **last-write-wins** with `updated_at` timestamps
- Per-organization stock is scoped (v1: one org = one site)

### Sync Triggers

- App loads online → full pull from server
- App regains connection → push queued local changes
- Manual sync button available for managers

### Libraries to Consider

- **ElectricSQL** — syncs Postgres to local SQLite automatically
- **PowerSync** — similar, good Postgres sync support
- Custom sync queue using Zustand + WebSocket or polling as fallback

---

## 7. Auth & Multi-Organization Setup

### Why better-auth?

Yes — **better-auth is a good fit** for this project. It has built-in support for:

- Organizations (multi-tenant)
- Roles and permissions per organization
- Multiple auth providers (email, Google, etc.)
- Sessions and tokens

### Organization Model (v1)

```
Organization "Brew & Bean Main"  ← one physical store (address on org)
  └── Members (owner | manager | cashier) via better-auth member.role

-- A second store is a second Organization, e.g. "Brew & Bean Mall"
```

### Role Permissions Matrix

| Feature | Owner | Manager | Cashier |
|---|---|---|---|
| Manage organization | ✅ | ❌ | ❌ |
| Add additional store sites (multi-location) | Future | — | — |
| Manage products | ✅ | ✅ | ❌ |
| Manage inventory | ✅ | ✅ | ❌ |
| Manage promotions | ✅ | ✅ | ❌ |
| Apply coupon at checkout | ✅ | ✅ | ✅ |
| View reports | ✅ | ✅ | ❌ |
| Process sales | ✅ | ✅ | ✅ |
| Void transactions | ✅ | ✅ | ❌ |
| Manage users | ✅ | ❌ | ❌ |

### Optional Postgres RLS

Row-Level Security policies on Postgres can enforce that roles only read/write rows for their **organization** (v1: org equals store). **Today**, isolation is enforced in **application code** ([docs/security/authorization.md](security/authorization.md)); RLS is optional defense in depth.

---

## 8. Recommended Future Features

These are planned as future modules — keep them in mind when designing the schema.

| Feature | Notes |
|---|---|
| **Discounts & Promotions** | ✅ Now in plan — v1.2 |
| **Tax Configuration** | Per-location tax rates, tax-inclusive pricing |
| **Customer Management** | Customer profiles, purchase history, loyalty points |
| **Table / Order Management** | For F&B, tables, open orders, splitting bills |
| **Kitchen Display System (KDS)** | Send orders to kitchen screen |
| **Purchase Orders** | Restock inventory from suppliers |
| **Supplier Management** | Track suppliers, costs, lead times |
| **Employee Time Tracking** | Shift logs, hours worked |
| **Gift Cards & Vouchers** | Issue and redeem |
| **Multi-currency Support** | Useful for international orgs |
| **Mobile App** | Expo / React Native reusing business logic |
| **Webhook / API Access** | Allow 3rd-party integrations |
| **Audit Logs** | Track who changed what and when |

---

## 9. Folder Structure

```
blank-pos/
├── app/
│   ├── (auth)/               # login, signup (email/password)
│   ├── (protected)/          # Session required: onboarding, choose-location, org shell
│   │   └── (org)/            # Business + branch routes
│   │       └── [businessSlug]/  # Org gate; index redirects to default branch
│   │           ├── settings/ # Locations, team, business (org-wide); /settings/branding → /business
│   │           └── l/[locationSlug]/  # Branch shell: dashboard, settings/store, …
│   │   # (future under branch: pos/, products/, …)
├── components/
│   ├── pos/                  # Cart, numpad, product grid, coupon input
│   ├── products/
│   ├── inventory/
│   ├── promotions/           # Promotion builder, coupon manager
│   └── ui/                   # Shared shadcn components
├── lib/
│   ├── db/
│   │   ├── local.ts          # PGlite / SQLite setup
│   │   ├── upload-client.ts  # optional: shared upload helpers
│   │   └── sync.ts           # Sync engine
│   ├── auth.ts               # better-auth config
│   └── utils.ts
├── server/
│   ├── actions/              # Next.js Server Actions
│   └── api/                  # Route handlers if needed
├── store/                    # Zustand stores (cart, sync status)
├── hooks/
└── types/
```

---

## 10. Development Phases

### Phase 1 — Foundation (Weeks 1–2)

- Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
- Set up hosted Postgres (`DATABASE_URL`) and local PGlite database
- Configure better-auth with organization support
- Generate better-auth + organization plugin schema; add app tables **`location`**, **`business_details`**, **`user_profile`** ([schema-better-auth-alignment.md](schema-better-auth-alignment.md))
- **Signup + onboarding** in the browser: `/signup`, then `/onboarding` → organization + locations + `business_details` ([onboarding-first-run.md](onboarding-first-run.md)); README “First run” for clone → migrate → signup

### Phase 2 — Product Engine (Weeks 3–4)

- Category CRUD with color/icon picker
- Product CRUD (simple products)
- Multiple price tiers per product
- Inventory item management
- Composite product builder (ingredient list + cost calculator)

### Phase 3 — POS Terminal (Weeks 5–6)

- Product grid with category filter
- Cart with quantity, price tier selection
- Coupon code input field at checkout
- Automatic promotion evaluation on cart update
- Discount line items shown clearly in cart and receipt
- Checkout flow (cash, card placeholder)
- Transaction recording (local DB first)
- Receipt view

### Phase 4 — Offline & Sync (Weeks 7–8)

- Finalize local DB schema matching server Postgres
- Implement sync queue and push/pull logic
- Online/offline status indicator
- Conflict resolution handling
- Test offline-then-sync scenarios

### Phase 5 — Inventory & Reports (Weeks 9–10)

- Auto-deduct inventory on sale
- Inventory adjustment UI
- Low stock alerts
- Daily/weekly sales report
- Product performance view

### Phase 6 — Polish & QA (Week 11–12)

- Role-based UI (hide features by role)
- Optional Postgres RLS policy review
- Performance audit
- Error handling and loading states
- User acceptance testing

---

*Last updated: April 2026 · Version 0.2 (Promotions & Coupons added)*
