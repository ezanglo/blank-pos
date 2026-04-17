# Authorization (application layer)

Blank POS is deployed as **one install per business**: a single Postgres database and app instance serve **one client**. **better-auth `organization`** in v1 models a **store location** (site / shop), not a separate multi-tenant “customer” in a shared SaaS database.

## How access is enforced

- The Next.js app uses **server actions**, **route handlers**, and **Drizzle** with a normal **database connection** (see `DATABASE_URL`). **Membership and roles** are checked in **TypeScript** before reads and writes (for example `member` rows, `userCanEditStoreBranding`, org-scoped queries).
- There is **no reliance** on database Row Level Security (RLS) or vendor-specific JWT helpers in Postgres. If you add RLS later for defense in depth, keep policies aligned with the same membership rules and test them explicitly.

## Uploads

- **`POST /api/upload`** requires an authenticated session. Object keys are generated **only on the server** (`media/{uuid}.{ext}`). See [docs/storage-uploads.md](../storage-uploads.md).

## Related

- [docs/schema-better-auth-alignment.md](../schema-better-auth-alignment.md) — data model and org / location wording.
- [docs/storage-uploads.md](../storage-uploads.md) — image storage modes and env vars.
