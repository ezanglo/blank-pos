"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type CopyTextButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "children" | "onClick" | "aria-label" | "title"
> & {
  /** Return `true` so the UI shows success (green check briefly). */
  onCopy: () => Promise<boolean>
  /** While true, clears success state — e.g. `lines.length === 0` or `!dialogOpen`. */
  clearCopied?: boolean
  successDurationMs?: number
  ariaLabelIdle: string
  ariaLabelCopied: string
  titleIdle?: string
  titleCopied?: string
  iconClassName?: string
  checkIconClassName?: string
}

export function CopyTextButton({
  onCopy,
  clearCopied = false,
  successDurationMs = 2000,
  ariaLabelIdle,
  ariaLabelCopied,
  titleIdle,
  titleCopied = "Copied",
  iconClassName = "size-4",
  checkIconClassName = "text-emerald-600 dark:text-emerald-500",
  className,
  disabled,
  ...buttonProps
}: CopyTextButtonProps) {
  const [copied, setCopied] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const cancelTimerAndReset = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setCopied(false)
  }, [])

  React.useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    },
    [],
  )

  React.useEffect(() => {
    if (!clearCopied) return
    cancelTimerAndReset()
  }, [clearCopied, cancelTimerAndReset])

  const handleClick = async () => {
    const ok = await onCopy()
    if (!ok) return
    if (timerRef.current) clearTimeout(timerRef.current)
    setCopied(true)
    timerRef.current = setTimeout(() => {
      setCopied(false)
      timerRef.current = null
    }, successDurationMs)
  }

  return (
    <Button
      type="button"
      {...buttonProps}
      disabled={disabled}
      className={className}
      aria-label={copied ? ariaLabelCopied : ariaLabelIdle}
      title={copied ? titleCopied : titleIdle}
      onClick={() => void handleClick()}
    >
      {copied ? (
        <CheckIcon className={cn(iconClassName, checkIconClassName)} aria-hidden />
      ) : (
        <CopyIcon className={cn(iconClassName)} aria-hidden />
      )}
    </Button>
  )
}
