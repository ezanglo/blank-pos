import type { Metadata } from "next"

import { SetupWizard } from "@/components/setup/setup-wizard"

export const metadata: Metadata = {
  title: "Setup",
  description: "Create the owner account, your first store, and branding.",
}

export const dynamic = "force-dynamic"

export default function SetupPage() {
  return <SetupWizard />
}
