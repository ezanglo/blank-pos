import { redirect } from "next/navigation"

import { getPostLoginRedirect } from "@/lib/actions/nav"
import { LoginForm } from "@/components/login-form"
import { getLoginBranding } from "@/lib/queries/login-branding"
import { getServerSession } from "@/lib/server-auth"
import { GalleryVerticalEndIcon } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>
}) {
  const session = await getServerSession()
  if (session?.user?.id) {
    const next = await getPostLoginRedirect()
    if (next !== "/login") redirect(next)
  }

  const { org: orgFromQuery } = await searchParams
  const branding = await getLoginBranding(orgFromQuery ?? null)

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 self-center text-center">
          {branding?.logoImageUrl?.trim() ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- branding HTTPS URL */}
              <img
                src={branding.logoImageUrl.trim()}
                alt=""
                className="h-12 max-w-[200px] object-contain"
              />
              {branding.displayName ? (
                <span className="text-muted-foreground text-sm font-medium">{branding.displayName}</span>
              ) : null}
            </>
          ) : (
            <div className="flex items-center gap-2 font-medium">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              {branding?.displayName ? <span>{branding.displayName}</span> : null}
            </div>
          )}
        </div>
        <LoginForm branding={branding} className="relative w-full max-w-md" />
      </div>
    </div>
  )
}
