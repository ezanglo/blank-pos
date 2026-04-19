import { redirect } from "next/navigation"

export default async function ReportsIndexPage({
  params,
}: {
  params: Promise<{ businessSlug: string; locationSlug: string }>
}) {
  const { businessSlug, locationSlug } = await params
  redirect(`/${businessSlug}/l/${locationSlug}/reports/daily`)
}
