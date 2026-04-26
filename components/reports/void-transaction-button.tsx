"use client"

import { useTransition } from "react"

import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { voidTransaction } from "@/lib/actions/transactions"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

type VoidTransactionButtonProps = {
  businessSlug: string
  locationSlug: string
  transactionId: string
  transactionStatus: string
  onVoided?: () => void
}

export function VoidTransactionButton({
  businessSlug,
  locationSlug,
  transactionId,
  transactionStatus,
  onVoided,
}: VoidTransactionButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const alreadyVoided = transactionStatus === "voided"

  return (
    <button
      type="button"
      disabled={isPending || alreadyVoided}
      className={cn(
        buttonVariants({ variant: "link", size: "sm" }),
        "h-auto p-0",
        !alreadyVoided && "text-destructive hover:text-destructive",
      )}
      onClick={() => {
        if (alreadyVoided || isPending) return
        const ok = window.confirm("Void this transaction? This keeps the record but removes it from completed sales.")
        if (!ok) return

        startTransition(async () => {
          const result = await voidTransaction(businessSlug, locationSlug, transactionId)
          if (!result.ok) {
            toast.error(result.message)
            return
          }
          toast.success("Transaction voided.")
          router.refresh()
          onVoided?.()
        })
      }}
    >
      {alreadyVoided ? "Voided" : isPending ? "Voiding..." : "Void"}
    </button>
  )
}
