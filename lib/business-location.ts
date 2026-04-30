import type { BusinessLocation } from "@/lib/db/schema-app"
import type { StoreSettingsFormValues } from "@/lib/schemas/app-forms"

export function businessLocationToStoreSettingsFields(
  row: BusinessLocation | null,
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
  | "locationSlug"
> {
  return {
    locationName: row?.name ?? "",
    locationSlug: row?.slug ?? "",
    defaultCurrency: (row?.defaultCurrency ?? "PHP") as StoreSettingsFormValues["defaultCurrency"],
    addressLine1: row?.addressLine1 ?? "",
    addressLine2: row?.addressLine2 ?? "",
    city: row?.city ?? "",
    region: row?.region ?? "",
    postalCode: row?.postalCode ?? "",
    phone: row?.phone ?? "",
  }
}
