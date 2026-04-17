import { ChooseLocationClient } from "@/components/choose-location-client"
import { listAccessibleBranchesForUser } from "@/lib/queries/location"
import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function ChooseLocationPage() {
  const session = await requireSession()
  const branches = await listAccessibleBranchesForUser(session.user.id)
  return <ChooseLocationClient branches={branches} />
}
