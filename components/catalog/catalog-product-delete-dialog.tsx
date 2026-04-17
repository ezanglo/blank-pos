"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { CatalogProductsRootError } from "./catalog-products-root-error"

export function CatalogProductDeleteDialog({
  productId,
  busy,
  errorMessage,
  onClose,
  onConfirm,
}: {
  productId: string | null
  busy: boolean
  errorMessage: string | null
  onClose: () => void
  onConfirm: () => void | Promise<void>
}) {
  return (
    <Dialog open={!!productId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete product</DialogTitle>
          <DialogDescription>This removes the product and its prices from the catalog.</DialogDescription>
        </DialogHeader>
        <CatalogProductsRootError message={errorMessage ?? undefined} />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={() => void onConfirm()}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
