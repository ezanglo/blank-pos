"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"

import { BanIcon, Loader2Icon } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button, buttonVariants } from "@/components/ui/button"
import { CopyTextButton } from "@/components/ui/copy-text-button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { voidTransaction } from "@/lib/actions/transactions"
import { copyToClipboard } from "@/lib/copy-to-clipboard"
import { cn } from "@/lib/utils"

type VoidTransactionButtonProps = {
  businessSlug: string
  locationSlug: string
  transactionId: string
  transactionStatus: string
  /** Exact order label the user must type (e.g. from `formatOrderNumberLabel`). */
  confirmOrderLabel: string
  onVoided?: () => void
  trigger?: "text" | "icon"
}

export function VoidTransactionButton({
  businessSlug,
  locationSlug,
  transactionId,
  transactionStatus,
  confirmOrderLabel,
  onVoided,
  trigger = "text",
}: VoidTransactionButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmInput, setConfirmInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)
  const fieldId = useId()
  const alreadyVoided = transactionStatus === "voided"

  const typedMatches = confirmInput.trim() === confirmOrderLabel

  useEffect(() => {
    if (!confirmOpen) return
    const t = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(t)
  }, [confirmOpen])

  const openConfirmation = () => {
    if (alreadyVoided || isPending) return
    setConfirmInput("")
    setConfirmOpen(true)
  }

  const copyOrderNumber = async (): Promise<boolean> => {
    try {
      await copyToClipboard(confirmOrderLabel)
      toast.success("Order number copied.")
      return true
    } catch {
      toast.error("Could not copy. Select the number and copy manually.")
      return false
    }
  }

  const performVoid = () => {
    if (alreadyVoided || isPending || !typedMatches) return

    startTransition(async () => {
      const result = await voidTransaction(
        businessSlug,
        locationSlug,
        transactionId
      )
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success("Transaction voided.")
      setConfirmOpen(false)
      setConfirmInput("")
      router.refresh()
      onVoided?.()
    })
  }

  const triggerButton =
    trigger === "icon" ? (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn(
          "size-8",
          !alreadyVoided &&
            "border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        )}
        disabled={isPending || alreadyVoided}
        aria-label={
          alreadyVoided
            ? "Voided"
            : isPending
              ? "Voiding transaction"
              : "Void transaction"
        }
        onClick={openConfirmation}
      >
        {isPending ? <Loader2Icon className="animate-spin" /> : <BanIcon />}
      </Button>
    ) : (
      <button
        type="button"
        disabled={isPending || alreadyVoided}
        className={cn(
          buttonVariants({ variant: "link", size: "sm" }),
          "h-auto p-0",
          !alreadyVoided && "text-destructive hover:text-destructive"
        )}
        onClick={openConfirmation}
      >
        {alreadyVoided ? "Voided" : isPending ? "Voiding..." : "Void"}
      </button>
    )

  return (
    <>
      {triggerButton}
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open)
          if (!open) setConfirmInput("")
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton>
          <DialogHeader>
            <DialogTitle>Void this transaction?</DialogTitle>
            <DialogDescription>
              This keeps the record but removes it from completed sales. Paste
              or type the order number so it matches exactly — including
              letters, digits, and hyphens.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
              <Label htmlFor={fieldId} className="shrink-0">
                Confirm order number
              </Label>
              <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-initial sm:justify-end">
                <code className="max-w-full rounded-xl border border-border/80 bg-muted/80 px-2 py-1 font-mono text-xs leading-normal break-all tabular-nums select-all sm:text-sm">
                  {confirmOrderLabel}
                </code>
                <CopyTextButton
                  variant="outline"
                  size="icon-sm"
                  className="shrink-0"
                  clearCopied={!confirmOpen}
                  ariaLabelIdle="Copy order number"
                  ariaLabelCopied="Order number copied"
                  titleIdle="Copy"
                  titleCopied="Copied"
                  onCopy={copyOrderNumber}
                />
              </div>
            </div>
            <Input
              ref={inputRef}
              id={fieldId}
              name="void-order-confirm"
              autoComplete="off"
              spellCheck={false}
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="font-mono tabular-nums"
              onKeyDown={(e) => {
                if (e.key === "Enter" && typedMatches && !isPending) {
                  e.preventDefault()
                  performVoid()
                }
              }}
            />
          </div>
          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>
              Cancel
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={!typedMatches || isPending}
              onClick={performVoid}
            >
              {isPending ? (
                <>
                  <Loader2Icon className="animate-spin" />
                  Voiding…
                </>
              ) : (
                "Void transaction"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
