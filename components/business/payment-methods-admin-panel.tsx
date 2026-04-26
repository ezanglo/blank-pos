"use client"

import { ChevronDownIcon, ChevronUpIcon, PencilIcon, PlusIcon } from "lucide-react"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

import {
  addOrganizationPaymentMethod,
  moveOrganizationPaymentMethod,
  setOrganizationPaymentMethodActive,
  updateOrganizationPaymentMethodLabel,
} from "@/lib/actions/payment-methods"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type PaymentMethodAdminRow = {
  id: string
  key: string
  label: string
  isActive: boolean
}

export function PaymentMethodsAdminPanel({
  businessSlug,
  methods,
}: {
  businessSlug: string
  methods: PaymentMethodAdminRow[]
}) {
  const router = useRouter()
  const [addOpen, setAddOpen] = React.useState(false)
  const [addLabel, setAddLabel] = React.useState("")
  const [addBusy, setAddBusy] = React.useState(false)
  const [editRow, setEditRow] = React.useState<PaymentMethodAdminRow | null>(null)
  const [editLabel, setEditLabel] = React.useState("")
  const [editBusy, setEditBusy] = React.useState(false)
  const [moveBusyId, setMoveBusyId] = React.useState<string | null>(null)
  const [toggleBusyId, setToggleBusyId] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (editRow) setEditLabel(editRow.label)
  }, [editRow])

  async function onAdd() {
    setAddBusy(true)
    try {
      const res = await addOrganizationPaymentMethod(businessSlug, addLabel)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success("Payment method added.")
      setAddOpen(false)
      setAddLabel("")
      router.refresh()
    } finally {
      setAddBusy(false)
    }
  }

  async function onSaveEdit() {
    if (!editRow) return
    setEditBusy(true)
    try {
      const res = await updateOrganizationPaymentMethodLabel(businessSlug, editRow.id, editLabel)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success("Saved.")
      setEditRow(null)
      router.refresh()
    } finally {
      setEditBusy(false)
    }
  }

  async function onToggleActive(row: PaymentMethodAdminRow, next: boolean) {
    setToggleBusyId(row.id)
    try {
      const res = await setOrganizationPaymentMethodActive(businessSlug, row.id, next)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      router.refresh()
    } finally {
      setToggleBusyId(null)
    }
  }

  async function onMove(row: PaymentMethodAdminRow, direction: "up" | "down") {
    setMoveBusyId(row.id)
    try {
      const res = await moveOrganizationPaymentMethod(businessSlug, row.id, direction)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      router.refresh()
    } finally {
      setMoveBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground text-sm">
          Names appear on the register and on printed receipts. The internal code stays fixed after creation so past
          sales stay consistent.
        </p>
        <Button type="button" size="sm" className="rounded-xl" onClick={() => setAddOpen(true)}>
          <PlusIcon data-icon="inline-start" className="size-4" />
          Add method
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border">
        <ul className="divide-y">
          {methods.length === 0 ? (
            <li className="text-muted-foreground p-6 text-center text-sm">No payment methods yet.</li>
          ) : (
            methods.map((row, index) => (
              <li key={row.id} className="flex flex-wrap items-center gap-3 p-4 sm:flex-nowrap">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-medium">{row.label}</span>
                  <span className="text-muted-foreground font-mono text-xs">{row.key}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`pm-active-${row.id}`}
                      checked={row.isActive}
                      disabled={toggleBusyId === row.id}
                      onCheckedChange={(v) => {
                        void onToggleActive(row, v === true)
                      }}
                    />
                    <Label htmlFor={`pm-active-${row.id}`} className="text-muted-foreground text-sm font-normal">
                      Active
                    </Label>
                  </div>
                  <div className="flex gap-0.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0"
                      aria-label="Move up"
                      disabled={index === 0 || moveBusyId === row.id}
                      onClick={() => void onMove(row, "up")}
                    >
                      <ChevronUpIcon className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-9 shrink-0"
                      aria-label="Move down"
                      disabled={index >= methods.length - 1 || moveBusyId === row.id}
                      onClick={() => void onMove(row, "down")}
                    >
                      <ChevronDownIcon className="size-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                    onClick={() => setEditRow(row)}
                  >
                    <PencilIcon data-icon="inline-start" className="size-4" />
                    Rename
                  </Button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add payment method</DialogTitle>
            <DialogDescription>
              A short code is generated from the name. You can rename the label anytime.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pm-add-label">Name</Label>
            <Input
              id="pm-add-label"
              value={addLabel}
              onChange={(e) => setAddLabel(e.target.value)}
              placeholder="e.g. GCash, House account"
              className="rounded-xl"
              maxLength={80}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={addBusy || addLabel.trim().length === 0}
              onClick={() => void onAdd()}
            >
              {addBusy ? "Adding…" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRow} onOpenChange={(o) => !o && setEditRow(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename payment method</DialogTitle>
            <DialogDescription>
              Code <span className="font-mono text-foreground">{editRow?.key}</span> is unchanged on past receipts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="pm-edit-label">Name</Label>
            <Input
              id="pm-edit-label"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              className="rounded-xl"
              maxLength={80}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => setEditRow(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={editBusy || editLabel.trim().length === 0}
              onClick={() => void onSaveEdit()}
            >
              {editBusy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
