# Authorization (application layer)

Blank POS is deployed as **one install per business** today: a single Postgres database and app instance typically serve **one client**. **better-auth `organization`** models a **store** (team + branding + shared settings). **Branches** are **`location`** rows; branch context is selected by URL **`/{storeSlug}/l/{locationSlug}/…`** and verified on the server.

## How access is enforced

- The Next.js app uses **server actions**, **route handlers**, and **Drizzle** with a normal **database connection** (see `DATABASE_URL`). **Membership and roles** are checked in **TypeScript** before reads and writes (for example `member` rows, `getOrgForUser`, `getLocationForUserByStoreAndLocationSlug`, `userCanEditStoreBrandingForOrganization`, org- and location-scoped queries).
- **Store routes** (`/{storeSlug}/settings/…`) require a **`member`** row for that **`organization.slug`**.
- **Branch routes** (`/{storeSlug}/l/{locationSlug}/…`) additionally require a **`location`** row whose **`slug`** matches and whose **`organization_id`** is that store.
- There is **no reliance** on database Row Level Security (RLS) or vendor-specific JWT helpers in Postgres. If you add RLS later for defense in depth, keep policies aligned with the same membership rules and test them explicitly.

## Uploads

- **`POST /api/upload`** requires an authenticated session. Object keys are generated **only on the server** (`media/{uuid}.{ext}`). See [docs/storage-uploads.md](../storage-uploads.md).

## Related

- [docs/schema-better-auth-alignment.md](../schema-better-auth-alignment.md) — data model and store / branch wording.
- [docs/storage-uploads.md](../storage-uploads.md) — image storage modes and env vars.
