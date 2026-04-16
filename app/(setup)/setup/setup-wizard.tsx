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

import { SetupBrandingStep, SetupOwnerStep, SetupStoreStep } from "./setup-steps"

type Step = "welcome" | "owner" | "store" | "branding"

export function SetupWizard() {
  const [step, setStep] = useState<Step>("welcome")
  const [orgSlug, setOrgSlug] = useState("")
  const [defaultDisplayName, setDefaultDisplayName] = useState("")

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Blank POS setup</h1>
        <p className="text-muted-foreground text-sm">
          Create the admin account, your store, and branding. No database scripts required after
          migrations.
        </p>
      </header>

      {step === "welcome" ? (
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
            <CardDescription>
              You will set an <strong>owner</strong> username and password, then your store name and
              URL slug, then colors for the POS shell.
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
        <SetupOwnerStep onBack={() => setStep("welcome")} onDone={() => setStep("store")} />
      ) : null}

      {step === "store" ? (
        <SetupStoreStep
          onBack={() => setStep("owner")}
          onDone={(slug, displayName) => {
            setOrgSlug(slug)
            setDefaultDisplayName(displayName)
            setStep("branding")
          }}
        />
      ) : null}

      {step === "branding" ? (
        <SetupBrandingStep
          orgSlug={orgSlug}
          defaultDisplayName={defaultDisplayName}
          onBack={() => setStep("store")}
        />
      ) : null}

    </div>
  )
}
