"use client"

import { useRouter } from "next/navigation"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { AccessibleBranch } from "@/lib/queries/location"

export function ChooseLocationClient({ branches }: { branches: AccessibleBranch[] }) {
  const router = useRouter()

  async function pick(branch: AccessibleBranch) {
    await authClient.organization.setActive({
      organizationId: branch.organizationId,
    })
    router.replace(`/${branch.businessSlug}/l/${branch.locationSlug}/dashboard`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Choose a location</h1>
        <p className="text-muted-foreground text-sm">
          You have access to more than one branch. Pick where you want to work; you can switch again
          from the header later.
        </p>
      </header>
      <div className="grid gap-3">
        {branches.map((b) => (
          <Card key={`${b.organizationId}-${b.locationSlug}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{b.locationName}</CardTitle>
              <CardDescription>
                {b.businessName}
                <span className="text-muted-foreground">
                  {" "}
                  · /{b.businessSlug}/l/{b.locationSlug}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button type="button" className="w-full sm:w-auto" onClick={() => void pick(b)}>
                Open this location
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
