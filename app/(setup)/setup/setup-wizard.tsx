"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { bootstrapCreateOwner } from "@/app/actions/setup"
import { updateBranding } from "@/app/actions/branding"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import { type OrgMetadata } from "@/lib/org-metadata"

type Step = "welcome" | "owner" | "store" | "branding" | "done"

export function SetupWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("welcome")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [ownerName, setOwnerName] = useState("")

  const [storeName, setStoreName] = useState("")
  const [slug, setSlug] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [address, setAddress] = useState("")
  const [phone, setPhone] = useState("")

  const [primary, setPrimary] = useState("#171717")
  const [accent, setAccent] = useState("#404040")
  const [displayName, setDisplayName] = useState("")
  const [tagline, setTagline] = useState("")

  async function onCreateOwner(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await bootstrapCreateOwner({ username, password, name: ownerName })
      const signIn = await authClient.signIn.username({ username, password })
      if (signIn.error) {
        setError(signIn.error.message ?? "Sign-in failed")
        setBusy(false)
        return
      }
      setStep("store")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function onCreateStore(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const meta: OrgMetadata = {
        defaultCurrency: currency,
        addressLine1: address,
        phone,
      }
      const res = await authClient.organization.create({
        name: storeName,
        slug: slug.trim().toLowerCase(),
        metadata: meta as Record<string, unknown>,
        keepCurrentActiveOrganization: true,
      })
      if (res.error) {
        setError(res.error.message ?? "Could not create organization")
        setBusy(false)
        return
      }
      setDisplayName(storeName)
      setStep("branding")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  async function onSaveBranding(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await updateBranding(slug.trim().toLowerCase(), {
        displayName: displayName || null,
        tagline: tagline || null,
        primaryColor: primary,
        accentColor: accent,
      })
      setStep("done")
      router.replace(`/${slug.trim().toLowerCase()}/dashboard`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Blank POS setup</h1>
        <p className="text-muted-foreground text-sm">
          Create the admin account, your store, and branding. No database scripts required after
          migrations.
        </p>
      </header>

      {error ? (
        <p className="border-destructive/50 bg-destructive/10 text-destructive rounded-xl border px-3 py-2 text-sm">
          {error}
        </p>
      ) : null}

      {step === "welcome" ? (
        <div className="space-y-4">
          <p className="text-sm">
            You will set an <strong>owner</strong> username and password, then your store name and URL
            slug, then colors for the POS shell.
          </p>
          <Button type="button" onClick={() => setStep("owner")}>
            Start
          </Button>
        </div>
      ) : null}

      {step === "owner" ? (
        <form className="space-y-4" onSubmit={onCreateOwner}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="ownerName">
              Display name
            </label>
            <input
              id="ownerName"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("welcome")}>
              Back
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Working…" : "Create owner & sign in"}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "store" ? (
        <form className="space-y-4" onSubmit={onCreateStore}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="storeName">
              Store name
            </label>
            <input
              id="storeName"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="slug">
              URL slug
            </label>
            <input
              id="slug"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              placeholder="e.g. main-street-cafe"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
            />
            <p className="text-muted-foreground text-xs">Your POS will live at /{slug || "slug"}/…</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="currency">
              Default currency
            </label>
            <select
              id="currency"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="PHP">PHP</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="address">
              Street address
            </label>
            <input
              id="address"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="phone">
              Phone
            </label>
            <input
              id="phone"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("owner")}>
              Back
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Working…" : "Create store"}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "branding" ? (
        <form className="space-y-4" onSubmit={onSaveBranding}>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="displayName">
              Receipt display name
            </label>
            <input
              id="displayName"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="tagline">
              Tagline (optional)
            </label>
            <input
              id="tagline"
              className="border-input bg-background w-full rounded-xl border px-3 py-2 text-sm"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="primary">
                Primary
              </label>
              <input
                id="primary"
                type="color"
                className="border-input h-10 w-full rounded-xl border"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="accent">
                Accent
              </label>
              <input
                id="accent"
                type="color"
                className="border-input h-10 w-full rounded-xl border"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
              />
            </div>
          </div>
          <div
            className="rounded-xl border p-4 text-sm"
            style={
              {
                borderColor: accent,
                background: `linear-gradient(135deg, ${primary}22, transparent)`,
              } as React.CSSProperties
            }
          >
            Preview: buttons and chrome will use these colors.
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("store")}>
              Back
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Finish & go to dashboard"}
            </Button>
          </div>
        </form>
      ) : null}

      {step === "done" ? <p className="text-sm">Redirecting…</p> : null}
    </div>
  )
}
