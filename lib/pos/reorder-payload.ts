/** Client-safe payload returned by `loadPosReorderPayload` (bigint amounts as strings). */
export type PosReorderLineSerialized = {
  productId: string
  productPriceId: string
  productName: string
  quantity: number
  currency: string
  addons: {
    addonId: string
    name: string
    unitPriceMinor: string
    quantity: number
  }[]
  instructions: {
    instructionId: string
    label: string
  }[]
}

export type PosReorderPayloadSerialized = {
  customerCallName: string | null
  lines: PosReorderLineSerialized[]
}
