"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import {
  SetupFirstLocationStep,
  SetupOwnerStep,
  SetupStoreBrandingStep,
  SetupStoreStep,
} from "./setup-steps"

type Step = "welcome" | "owner" | "store" | "location" | "branding"

export function SetupWizard() {
  const [step, setStep] = useState<Step>("welcome")
  const [ownerDisplayName, setOwnerDisplayName] = useState("")
  const [storeDisplayName, setStoreDisplayName] = useState("")
  const [storeSlug, setStoreSlug] = useState<string | null>(null)
  const [locationSlug, setLocationSlug] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your store</h1>
        <p className="text-muted-foreground text-sm">
          You will create the main login, then your store, then your first location (name, address,
          currency), then branding. Store and branch web links are suggested from the names you
          enter but stay editable, with an availability check after you pause typing. You can
          refine everything later in Settings.
        </p>
      </header>

      {step === "welcome" ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              First an <strong>owner</strong> login, then your <strong>store</strong> (name), then
              your <strong>first branch</strong> (name and address), then <strong>branding</strong>{" "}
              (logo and how this store looks in the app).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button type="button" onClick={() => setStep("owner")}>
              Start
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {step === "owner" ? (
        <SetupOwnerStep
          onBack={() => setStep("welcome")}
          onDone={(name) => {
            setOwnerDisplayName(name)
            setStep("store")
          }}
        />
      ) : null}

      {step === "store" ? (
        <SetupStoreStep
          resumeStoreSlug={storeSlug}
          resumeStoreName={storeDisplayName || null}
          onBack={() => (storeSlug ? setStep("location") : setStep("owner"))}
          onDone={({ storeSlug: s, storeName }) => {
            setStoreSlug(s)
            setStoreDisplayName(storeName)
            setLocationSlug(null)
            setStep("location")
          }}
        />
      ) : null}

      {step === "location" && storeSlug ? (
        <SetupFirstLocationStep
          storeSlug={storeSlug}
          onBack={() => setStep("store")}
          onDone={({ locationSlug: l }) => {
            setLocationSlug(l)
            setStep("branding")
          }}
        />
      ) : null}

      {step === "branding" && storeSlug && locationSlug ? (
        <SetupStoreBrandingStep
          storeSlug={storeSlug}
          locationSlug={locationSlug}
          defaultDisplayName={storeDisplayName || ownerDisplayName}
          onBack={() => setStep("location")}
          onDone={() => {}}
        />
      ) : null}
    </div>
  )
}
