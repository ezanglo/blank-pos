"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { updateBranding } from "@/app/actions/branding"
import { Button } from "@/components/ui/button"

export function BrandingSettingsForm({
  orgSlug,
  initial,
}: {
  orgSlug: string
  initial: {
    displayName: string
    tagline: string
    primaryColor: string
    accentColor: string
    receiptHeaderText: string
    receiptFooterText: string
  }
}) {
  const router = useRouter()
  const [displayName, setDisplayName] = useState(initial.displayName)
  const [tagline, setTagline] = useState(initial.tagline)
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor)
  const [accentColor, setAccentColor] = useState(initial.accentColor)
  const [receiptHeaderText, setReceiptHeaderText] = useState(initial.receiptHeaderText)
  const [receiptFooterText, setReceiptFooterText] = useState(initial.receiptFooterText)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await updateBranding(orgSlug, {
        displayName: displayName || null,
        tagline: tagline || null,
        primaryColor,
        accentColor,
        receiptHeaderText: receiptHeaderText || null,
        receiptFooterText: receiptFooterText || null,
      })
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      {error ? (
        <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="brand-display">
          Receipt display name
        </label>
        <input
          id="brand-display"
          className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="brand-tagline">
          Tagline
        </label>
        <input
          id="brand-tagline"
          className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="brand-primary">
            Primary
          </label>
          <input
            id="brand-primary"
            type="color"
            className="border-input h-10 w-full rounded-xl border"
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="brand-accent">
            Accent
          </label>
          <input
            id="brand-accent"
            type="color"
            className="border-input h-10 w-full rounded-xl border"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="brand-rh">
          Receipt header
        </label>
        <textarea
          id="brand-rh"
          className="border-input bg-background min-h-[72px] w-full rounded-xl border px-3 py-2 text-sm"
          value={receiptHeaderText}
          onChange={(e) => setReceiptHeaderText(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="brand-rf">
          Receipt footer
        </label>
        <textarea
          id="brand-rf"
          className="border-input bg-background min-h-[72px] w-full rounded-xl border px-3 py-2 text-sm"
          value={receiptFooterText}
          onChange={(e) => setReceiptFooterText(e.target.value)}
        />
      </div>
      <div
        className="rounded-xl border p-4 text-sm"
        style={
          {
            borderColor: accentColor,
            background: `linear-gradient(135deg, ${primaryColor}22, transparent)`,
          } as React.CSSProperties
        }
      >
        Preview: shell uses these colors after refresh.
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}
