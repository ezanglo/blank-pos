import type { ProductListRow } from "@/lib/queries/catalog"

export function formatLocationCell(r: ProductListRow): string {
  if (r.product.availabilityMode !== "selected_locations_only") return "All branches"
  if (r.locationNames.length === 0) return "No branches selected"
  return r.locationNames.join(", ")
}

export function productRowSearchText(r: ProductListRow): string {
  return `${r.product.name} ${r.product.sku ?? ""} ${r.product.imageUrl ?? ""} ${r.priceCount} ${r.categoryName} ${formatLocationCell(r)} ${r.firstIngredientPreview ?? ""} ${r.ingredientCount} ${r.product.trackInventory ? "track" : ""}`
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
    case "trackInventory":
      return "Track inventory"
    default:
      return columnId
  }
}
