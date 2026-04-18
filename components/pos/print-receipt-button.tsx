"use client"

import { Button } from "@/components/ui/button"

export function PrintReceiptButton() {
  return (
    <Button type="button" variant="outline" onClick={() => window.print()}>
      Print
    </Button>
  )
}
