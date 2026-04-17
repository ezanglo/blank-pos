"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { SetupFirstLocationStep, SetupStoreStep } from "@/components/setup/setup-steps"

type Step = "store" | "location"

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("store")
  const [storeDisplayName, setStoreDisplayName] = useState("")
  const [businessSlug, setBusinessSlug] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Blank POS</h1>
        <p className="text-muted-foreground text-sm">
          Create your business (name, link, and optional branding), add your first location, then open
          your dashboard.
        </p>
      </header>

      {step === "store" ? (
        <SetupStoreStep
          resumeBusinessSlug={businessSlug}
          resumeBusinessName={storeDisplayName || null}
          onBack={() => router.push("/")}
          onDone={({ businessSlug: s, storeName }) => {
            setBusinessSlug(s)
            setStoreDisplayName(storeName)
            setStep("location")
          }}
        />
      ) : null}

      {step === "location" && businessSlug ? (
        <SetupFirstLocationStep
          businessSlug={businessSlug}
          onBack={() => setStep("store")}
          onDone={({ locationSlug: l }) => {
            window.location.assign(`/${businessSlug}/l/${l}/dashboard`)
          }}
        />
      ) : null}
    </div>
  )
}
