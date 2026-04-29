"use client"

import * as React from "react"

import { Button } from "@/components/ui/button"
import type { DashboardDatePreset } from "@/lib/queries/reports"
import { cn } from "@/lib/utils"

const PRESETS: { id: DashboardDatePreset; label: string }[] = [
  { id: "daily", label: "Daily" },
  { id: "weekly", label: "Weekly" },
  { id: "monthly", label: "Monthly" },
  { id: "custom", label: "Custom" },
]

export function DashboardDateRangeFilter({
  actionPath,
  preset: initialPreset,
  anchorDefault,
  customFrom,
  customTo,
}: {
  actionPath: string
  preset: DashboardDatePreset
  anchorDefault: string
  customFrom: string
  customTo: string
}) {
  const [preset, setPreset] = React.useState<DashboardDatePreset>(initialPreset)
  const [anchor, setAnchor] = React.useState(anchorDefault)
  const [from, setFrom] = React.useState(customFrom)
  const [to, setTo] = React.useState(customTo)

  React.useEffect(() => {
    setPreset(initialPreset)
    setAnchor(anchorDefault)
    setFrom(customFrom)
    setTo(customTo)
  }, [initialPreset, anchorDefault, customFrom, customTo])

  return (
    <form
      method="get"
      action={actionPath}
      className="flex flex-col gap-4 rounded-lg border bg-card p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground text-sm font-medium">Range</span>
        <div className="inline-flex flex-wrap gap-1.5">
          {PRESETS.map(({ id, label }) => (
            <Button
              key={id}
              type="button"
              size="sm"
              variant={preset === id ? "default" : "outline"}
              className={cn("rounded-full")}
              onClick={() => setPreset(id)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <input type="hidden" name="preset" value={preset} />

      <div className="flex flex-wrap items-end gap-3">
        {preset === "custom" ? (
          <>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">From</span>
              <input
                type="date"
                name="from"
                required
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-muted-foreground">To</span>
              <input
                type="date"
                name="to"
                required
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="border-input bg-background h-9 rounded-md border px-2 text-sm"
              />
            </label>
          </>
        ) : (
          <label className="grid gap-1 text-sm">
            <span className="text-muted-foreground">
              {preset === "daily" ? "Day" : preset === "weekly" ? "Week of" : "Month of"}
            </span>
            <input
              type="date"
              name="anchor"
              required
              value={anchor}
              onChange={(e) => setAnchor(e.target.value)}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
            />
          </label>
        )}
        <Button type="submit" size="sm" className="rounded-full">
          Apply
        </Button>
      </div>
      <p className="text-muted-foreground text-xs">
        All bounds use UTC calendar days (00:00:00–23:59:59.999), same as Reports.
      </p>
    </form>
  )
}
