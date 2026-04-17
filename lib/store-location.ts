import type { StoreLocation } from "@/lib/db/schema-app"
import type { StoreSettingsFormValues } from "@/lib/schemas/app-forms"

export function storeLocationToStoreSettingsFields(
  row: StoreLocation | null,
): Pick<
  StoreSettingsFormValues,
  | "defaultCurrency"
  | "addressLine1"
  | "addressLine2"
  | "city"
  | "region"
  | "postalCode"
  | "phone"
  | "locationName"
> {
  return {
    locationName: row?.name ?? "",
    defaultCurrency: (row?.defaultCurrency ?? "USD") as StoreSettingsFormValues["defaultCurrency"],
    addressLine1: row?.addressLine1 ?? "",
    addressLine2: row?.addressLine2 ?? "",
    city: row?.city ?? "",
    region: row?.region ?? "",
    postalCode: row?.postalCode ?? "",
    phone: row?.phone ?? "",
  }
}
