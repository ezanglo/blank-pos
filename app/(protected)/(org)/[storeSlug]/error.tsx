"use client"

import { useEffect } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"

import { Button, buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function StoreSlugError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams()
  const storeSlug = typeof params?.storeSlug === "string" ? params.storeSlug : ""

  useEffect(() => {
    console.error("[store-error]", error.message, error.digest ?? "")
  }, [error])

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <h2 className="text-lg font-semibold tracking-tight">Something went wrong</h2>
      <p className="text-muted-foreground max-w-md text-sm">{error.message}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        {storeSlug ? (
          <Link
            href={`/${storeSlug}`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Back to dashboard
          </Link>
        ) : null}
      </div>
    </div>
  )
}
