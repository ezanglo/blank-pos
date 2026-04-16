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
  SetupOrganizationLocationStep,
  SetupOwnerStep,
  SetupStoreBrandingStep,
} from "./setup-steps"

type Step = "welcome" | "owner" | "branding" | "store"

export function SetupWizard() {
  const [step, setStep] = useState<Step>("welcome")
  const [ownerDisplayName, setOwnerDisplayName] = useState("")

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Set up your store</h1>
        <p className="text-muted-foreground text-sm">
          You will create the main login, then your store’s branding (name and optional logo), then
          this shop’s details (name, web link, currency, and address). Branding and shop details are
          two different steps.
        </p>
      </header>

      {step === "welcome" ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              First an <strong>owner</strong> login, then <strong>branding</strong> (how your store shows up in the app,
              starting with name and optional logo), then <strong>location</strong> (shop name, web link, currency,
              and address). Branding and shop details do not have to match.
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
            setStep("branding")
          }}
        />
      ) : null}

      {step === "branding" ? (
        <SetupStoreBrandingStep
          defaultDisplayName={ownerDisplayName}
          onBack={() => setStep("owner")}
          onDone={() => setStep("store")}
        />
      ) : null}

      {step === "store" ? (
        <SetupOrganizationLocationStep onBack={() => setStep("branding")} />
      ) : null}
    </div>
  )
}
