import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LegacyBusinessLocationsRedirect({
  params,
  searchParams,
}: {
  params: Promise<{ businessSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { businessSlug } = await params
  const sp = await searchParams
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue
    if (Array.isArray(v)) v.forEach((item) => qs.append(k, item))
    else qs.set(k, v)
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : ""
  redirect(`/${businessSlug}/business/locations${suffix}`)
}
