/** Default rows per page on `/{businessSlug}/catalog/products`. */
export const CATALOG_PRODUCTS_PAGE_DEFAULT_SIZE = 25
export const CATALOG_PRODUCTS_PAGE_MAX_SIZE = 100
/** Hard cap so `offset` stays reasonable even with forged URLs. */
export const CATALOG_PRODUCTS_MAX_PAGE = 5000

export type CatalogProductsUrlState = {
  page: number
  pageSize: number
  search: string
  categoryId: string
}

function pickParam(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key]
  return typeof v === "string" ? v : Array.isArray(v) ? (v[0] ?? "") : ""
}

/** Parse `page`, `per`, `q`, and `category` from the catalog products route search string. */
export function parseCatalogProductsUrlState(
  sp: Record<string, string | string[] | undefined>,
): CatalogProductsUrlState {
  const pageRaw = pickParam(sp, "page")
  const page = Math.max(1, Math.min(CATALOG_PRODUCTS_MAX_PAGE, parseInt(pageRaw || "1", 10) || 1))

  let pageSize = parseInt(pickParam(sp, "per") || String(CATALOG_PRODUCTS_PAGE_DEFAULT_SIZE), 10) || CATALOG_PRODUCTS_PAGE_DEFAULT_SIZE
  pageSize = Math.max(1, Math.min(CATALOG_PRODUCTS_PAGE_MAX_SIZE, pageSize))

  return {
    page,
    pageSize,
    search: pickParam(sp, "q").trim(),
    categoryId: pickParam(sp, "category").trim(),
  }
}

/** Merge URL state with a patch; changing search or category resets page to 1 unless `page` is set explicitly. */
export function mergeCatalogProductsUrlState(
  cur: CatalogProductsUrlState,
  patch: Partial<CatalogProductsUrlState>,
): CatalogProductsUrlState {
  const next: CatalogProductsUrlState = { ...cur, ...patch }
  if (
    (patch.search !== undefined && patch.search !== cur.search) ||
    (patch.categoryId !== undefined && patch.categoryId !== cur.categoryId)
  ) {
    if (patch.page === undefined) next.page = 1
  }
  return next
}

export function serializeCatalogProductsUrlState(state: CatalogProductsUrlState): string {
  const n = new URLSearchParams()
  if (state.page > 1) n.set("page", String(state.page))
  if (state.pageSize !== CATALOG_PRODUCTS_PAGE_DEFAULT_SIZE) n.set("per", String(state.pageSize))
  if (state.search.length > 0) n.set("q", state.search)
  if (state.categoryId.length > 0) n.set("category", state.categoryId)
  return n.toString()
}
