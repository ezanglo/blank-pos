import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LegacyCatalogInventoryRedirect({
  params,
}: {
  params: Promise<{ businessSlug: string }>
}) {
  const { businessSlug } = await params
  redirect(`/${businessSlug}/catalog/inventory`)
}
