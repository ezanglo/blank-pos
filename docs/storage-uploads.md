# Image uploads and object storage

Blank POS stores **image URLs as text** in Postgres (for example `store_branding.logo_image_url`). **Binary files are never stored in the database.**

## API

- **`POST /api/upload`** (authenticated): `multipart/form-data` with a single field **`file`** (JPEG, PNG, WebP, or GIF). Maximum size **4 MiB**.
- Response: **`{ "url": "<public-or-same-origin-url>" }`** — persist this string on the row that needs the image (branding, future product catalog, etc.).
- Object keys are **install-scoped** and server-generated: `media/{uuid}.{ext}` under the configured backend.

## Storage modes (`STORAGE_MODE`)

| Mode | When to use | Behavior |
|------|-------------|----------|
| **`local`** | Development / single-node installs with a disk | Files written under **`public/uploads/`**, served as **`/uploads/...`**. Set in `.env` as `STORAGE_MODE=local`. |
| **`cloud`** | Production on Vercel or any host without a durable app disk | **S3-compatible** `PutObject` (AWS S3, Cloudflare R2, MinIO, etc.). **No local filesystem writes.** |

**Vercel:** `STORAGE_MODE=local` is **rejected** when `VERCEL=1`. Use **`cloud`** and the variables below.

If `STORAGE_MODE` is omitted and **`STORAGE_BUCKET`** is unset, the server defaults to **`local`** off Vercel (easier local dev). On Vercel, omitting mode uses **cloud** and requires full cloud configuration.

## Cloud environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STORAGE_ENDPOINT` | Yes | HTTPS API endpoint for the S3-compatible service. |
| `STORAGE_BUCKET` | Yes | Bucket name. |
| `STORAGE_ACCESS_KEY` | Yes | Access key id. |
| `STORAGE_SECRET_KEY` | Yes | Secret access key. |
| `STORAGE_PUBLIC_URL_BASE` | Yes | Public base URL for objects (no trailing slash). Returned URLs are `{base}/{objectKey}`. |
| `STORAGE_REGION` | No | Default `auto` if unset. |
| `STORAGE_FORCE_PATH_STYLE` | No | Set to `1` or `true` for MinIO and many compatible APIs. |

## Offline POS (client)

When the browser is offline, the client may queue image **blobs** in **IndexedDB** and show a **`blob:`** preview. After reconnect, pending items are uploaded with the same **`POST /api/upload`** and the returned **`url`** is written to the form before save. **`local://` placeholders are not persisted** to the server.

## Related

- [`.env.example`](../.env.example) — copy for local configuration.
- [docs/security/authorization.md](./security/authorization.md) — who may change branding and other data (application layer).
