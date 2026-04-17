import type { Metadata } from "next"
import Link from "next/link"

import { buildAuthLayoutMetadata } from "@/lib/seo"
import { CircleDashedIcon } from "lucide-react"

export const metadata: Metadata = buildAuthLayoutMetadata()

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted text-foreground flex min-h-dvh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CircleDashedIcon className="size-4" strokeWidth={2.25} aria-hidden />
          </span>
          Blank POS
        </Link>
        {children}
      </div>
    </div>
  )
}
