import { requireSession } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return children
}
