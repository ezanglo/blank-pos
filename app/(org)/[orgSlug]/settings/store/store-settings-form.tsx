"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { updateOrganizationStore } from "@/app/actions/organization"
import { Button } from "@/components/ui/button"
import type { OrgMetadata } from "@/lib/org-metadata"

export function StoreSettingsForm({
  orgSlug,
  initialName,
  initialMeta,
}: {
  orgSlug: string
  initialName: string
  initialMeta: OrgMetadata
}) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [defaultCurrency, setDefaultCurrency] = useState(initialMeta.defaultCurrency ?? "USD")
  const [addressLine1, setAddressLine1] = useState(initialMeta.addressLine1 ?? "")
  const [phone, setPhone] = useState(initialMeta.phone ?? "")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const metadata: OrgMetadata = {
        defaultCurrency,
        addressLine1: addressLine1 || undefined,
        phone: phone || undefined,
      }
      await updateOrganizationStore(orgSlug, { name, metadata })
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
        <label className="text-sm font-medium" htmlFor="store-name">
          Store name
        </label>
        <input
          id="store-name"
          className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="store-currency">
          Default currency
        </label>
        <select
          id="store-currency"
          className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
          value={defaultCurrency}
          onChange={(e) => setDefaultCurrency(e.target.value)}
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
          <option value="PHP">PHP</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="store-address">
          Street address
        </label>
        <input
          id="store-address"
          className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="store-phone">
          Phone
        </label>
        <input
          id="store-phone"
          className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
    </form>
  )
}
