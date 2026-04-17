# Authorization (application layer)

Blank POS is deployed as **one install per business** today: a single Postgres database and app instance typically serve **one client**. **better-auth `organization`** models a **business** (team + org-level **`business_details`** + shared settings). **Branches** are **`location`** rows; branch context is selected by URL **`/{businessSlug}/l/{locationSlug}/…`** and verified on the server.

## How access is enforced

- The Next.js app uses **server actions**, **route handlers**, and **Drizzle** with a normal **database connection** (see `DATABASE_URL`). **Membership and roles** are checked in **TypeScript** before reads and writes (for example `member` rows, `getOrgForUser`, `getLocationForUserByBusinessAndLocationSlug`, `userCanEditBusinessDetailsForOrganization`, org- and location-scoped queries).
- **Org-level settings routes** (`/{businessSlug}/settings/…`) require a **`member`** row for that **`organization.slug`** (URL segment = **`businessSlug`**). **`/settings/locations`**, **`/settings/staff`** (sidebar: **Team**), and **`/settings/business`** additionally require **`owner`** or **`manager`** (see each route’s `notFound()` guard). **`/settings/branding`** redirects to **`/settings/business`**.
- **Branch routes** (`/{businessSlug}/l/{locationSlug}/…`) additionally require a **`location`** row whose **`slug`** matches and whose **`organization_id`** is that organization.
- There is **no reliance** on database Row Level Security (RLS) in v1. If you add RLS later, keep policies aligned with the same membership rules.
- **Catalog (Phase 2+):** product, category, inventory, and price **mutations** must use the same pattern—verify **`member`** for the active **`organization_id`** and allow writes only for **`owner`** / **`manager`**; **`cashier`** may have read-only access for POS-facing loaders. Do not trust client-supplied org or location IDs without server-side membership and branch checks.

## Uploads

- **`POST /api/upload`** requires an authenticated session. Object keys are generated **only on the server** (`media/{uuid}.{ext}`). See [docs/storage-uploads.md](../storage-uploads.md).

## Related

- [docs/schema-better-auth-alignment.md](../schema-better-auth-alignment.md) — data model and business / branch wording.
- [docs/storage-uploads.md](../storage-uploads.md) — image storage modes and env vars.
