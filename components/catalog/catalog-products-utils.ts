import type { ProductListRow } from "@/lib/queries/catalog"

export function formatLocationCell(r: ProductListRow): string {
  if (r.product.availabilityMode !== "selected_locations_only") return "All branches"
  if (r.locationNames.length === 0) return "No branches selected"
  return r.locationNames.join(", ")
}

export function productRowSearchText(r: ProductListRow): string {
  const prep = r.product.prepTimeSeconds != null ? String(r.product.prepTimeSeconds) : ""
  return `${r.product.name} ${r.product.sku ?? ""} ${r.product.qrCode ?? ""} ${r.product.imageUrl ?? ""} ${r.priceCount} ${r.categoryName} ${formatLocationCell(r)} ${r.firstIngredientPreview ?? ""} ${r.ingredientCount} ${prep}`
}

export function formatPrepCellSeconds(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "—"
  if (seconds >= 60) {
    const m = seconds / 60
    if (Number.isInteger(m)) return `${m} min`
    return `${(seconds / 60).toFixed(1)} min`
  }
  return `${seconds}s`
}

export function catalogProductsColumnMenuLabel(columnId: string): string {
  switch (columnId) {
    case "name":
      return "Product"
    case "category":
      return "Category"
    case "prices":
      return "Prices"
    case "location":
      return "Location"
    case "ingredients":
      return "Ingredients"
    case "prep":
      return "Prep"
    default:
      return columnId
  }
}
