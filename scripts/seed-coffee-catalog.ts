/**
 * Philippines-oriented coffee shop catalog seed (dev / QA).
 *
 * Usage:
 *   pnpm db:seed:coffee -- --org-slug <organization.slug>
 *   pnpm db:seed:coffee -- --org-slug <slug> --wipe-catalog
 *   pnpm db:seed:coffee -- --org-slug <slug> --full-reset   (dev: delete ALL sales, then catalog, then seed)
 *
 * Requires DATABASE_URL in `.env` and/or `.env.local` (same as Next.js; local overrides).
 */
import { randomUUID } from "node:crypto"
import { resolve } from "node:path"

import { config as loadEnv } from "dotenv"

const envRoot = process.cwd()
loadEnv({ path: resolve(envRoot, ".env") })
loadEnv({ path: resolve(envRoot, ".env.local"), override: true })

import { asc, count, desc, eq, inArray } from "drizzle-orm"

import { createDb } from "@/lib/db"
import { organization } from "@/lib/db/auth-schema"
import { businessDetails, businessLocation } from "@/lib/db/schema-app"
import {
  inventoryItem,
  inventoryStock,
  product,
  productAddon,
  productCategory,
  productCategoryAddon,
  productCategoryInstruction,
  productCategoryVariant,
  productIngredient,
  productLocation,
  productPrice,
} from "@/lib/db/schema-catalog"
import { posTransactions } from "@/lib/db/schema-transactions"
import { parseDecimal2ToMinor, parseDecimal3ToMilli } from "@/lib/money"

function parseArgs(argv: string[]) {
  let orgSlug: string | undefined
  let wipeCatalog = false
  let fullReset = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--org-slug" && argv[i + 1]) {
      orgSlug = argv[++i]!
      continue
    }
    if (a === "--wipe-catalog") {
      wipeCatalog = true
      continue
    }
    if (a === "--full-reset") {
      fullReset = true
      continue
    }
    if (a.startsWith("--org-slug=")) {
      orgSlug = a.slice("--org-slug=".length)
    }
  }
  return { orgSlug, wipeCatalog, fullReset }
}

/**
 * Deletes all POS transactions for the org. Cascades remove line items, add-ons, and instructions.
 * Dev / QA only — irreversible.
 */
async function wipeOrgSales(db: ReturnType<typeof createDb>, organizationId: string) {
  await db.delete(posTransactions).where(eq(posTransactions.organizationId, organizationId))
}

async function resolveCurrency(
  db: ReturnType<typeof createDb>,
  organizationId: string,
): Promise<string> {
  const [bd] = await db
    .select({ c: businessDetails.defaultCurrency })
    .from(businessDetails)
    .where(eq(businessDetails.organizationId, organizationId))
    .limit(1)
  const fromOrg = bd?.c?.trim()
  if (fromOrg) return fromOrg.toUpperCase()

  const locs = await db
    .select({ defaultCurrency: businessLocation.defaultCurrency, isDefault: businessLocation.isDefault })
    .from(businessLocation)
    .where(eq(businessLocation.organizationId, organizationId))
    .orderBy(desc(businessLocation.isDefault), asc(businessLocation.createdAt))

  const def = locs[0]
  const fromLoc = def?.defaultCurrency?.trim()
  return fromLoc ? fromLoc.toUpperCase() : "PHP"
}

/** Catalog + inventory only; caller must ensure no transaction rows reference catalog FKs (or sales already wiped). */
async function wipeOrgCatalogData(db: ReturnType<typeof createDb>, organizationId: string) {
  const cats = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(eq(productCategory.organizationId, organizationId))
  const catIds = cats.map((c) => c.id)

  if (catIds.length > 0) {
    await db.delete(productCategoryAddon).where(inArray(productCategoryAddon.categoryId, catIds))
    await db.delete(productCategoryInstruction).where(inArray(productCategoryInstruction.categoryId, catIds))
  }

  const prods = await db
    .select({ id: product.id })
    .from(product)
    .where(eq(product.organizationId, organizationId))
  const pids = prods.map((p) => p.id)

  if (pids.length > 0) {
    await db.delete(productPrice).where(inArray(productPrice.productId, pids))
    await db.delete(productLocation).where(inArray(productLocation.productId, pids))
    await db.delete(product).where(inArray(product.id, pids))
  }

  if (catIds.length > 0) {
    await db.delete(productCategoryVariant).where(inArray(productCategoryVariant.categoryId, catIds))
    await db.delete(productCategory).where(inArray(productCategory.id, catIds))
  }

  await db.delete(productAddon).where(eq(productAddon.organizationId, organizationId))
  await db.delete(inventoryStock).where(eq(inventoryStock.organizationId, organizationId))
  await db.delete(inventoryItem).where(eq(inventoryItem.organizationId, organizationId))
}

async function wipeOrgCatalog(db: ReturnType<typeof createDb>, organizationId: string) {
  const [txnRow] = await db
    .select({ n: count() })
    .from(posTransactions)
    .where(eq(posTransactions.organizationId, organizationId))
  const txnCount = Number(txnRow?.n ?? 0)
  if (txnCount > 0) {
    throw new Error(
      `Refusing to wipe catalog: organization has ${txnCount} sale(s). Use --full-reset to delete sales and catalog, or clear transactions in the DB.`,
    )
  }
  await wipeOrgCatalogData(db, organizationId)
}

type InvDef = { key: string; name: string; unit: string; costAmount: string; stock: number }

const INVENTORY_DEFS: InvDef[] = [
  { key: "beans_house", name: "Arabica house blend (roasted)", unit: "g", costAmount: "0.45", stock: 50_000 },
  { key: "beans_barako", name: "Barako blend (roasted)", unit: "g", costAmount: "0.40", stock: 30_000 },
  { key: "milk_fresh", name: "Fresh milk", unit: "ml", costAmount: "0.02", stock: 200_000 },
  { key: "milk_oat", name: "Oat milk", unit: "ml", costAmount: "0.04", stock: 80_000 },
  { key: "milk_almond", name: "Almond milk", unit: "ml", costAmount: "0.04", stock: 60_000 },
  { key: "condensed_milk", name: "Condensed milk", unit: "ml", costAmount: "0.03", stock: 40_000 },
  { key: "ube_syrup", name: "Ube syrup", unit: "ml", costAmount: "0.08", stock: 50_000 },
  { key: "vanilla_syrup", name: "Vanilla syrup", unit: "ml", costAmount: "0.06", stock: 60_000 },
  { key: "caramel_syrup", name: "Caramel syrup", unit: "ml", costAmount: "0.06", stock: 60_000 },
  { key: "wintermelon_syrup", name: "Wintermelon syrup", unit: "ml", costAmount: "0.07", stock: 45_000 },
  { key: "strawberry_syrup", name: "Strawberry syrup", unit: "ml", costAmount: "0.07", stock: 40_000 },
  { key: "cocoa_powder", name: "Cocoa powder", unit: "g", costAmount: "0.35", stock: 20_000 },
  { key: "matcha", name: "Matcha powder", unit: "g", costAmount: "1.20", stock: 5_000 },
  { key: "tea_bag", name: "Black tea bag", unit: "pc", costAmount: "6.00", stock: 5_000 },
  { key: "cold_brew_conc", name: "Cold brew concentrate", unit: "ml", costAmount: "0.05", stock: 100_000 },
  { key: "frappe_powder", name: "Frappe / ice blend base", unit: "g", costAmount: "0.40", stock: 25_000 },
  { key: "hot_water", name: "Hot water (allocated)", unit: "ml", costAmount: "0.00", stock: 999_999 },
  { key: "ice_water", name: "Filtered water / ice melt", unit: "ml", costAmount: "0.00", stock: 500_000 },
  { key: "flour", name: "Bread flour", unit: "g", costAmount: "0.02", stock: 100_000 },
  { key: "butter", name: "Butter", unit: "g", costAmount: "0.12", stock: 30_000 },
  { key: "cheese", name: "Cheddar cheese (grated)", unit: "g", costAmount: "0.35", stock: 25_000 },
  { key: "ube_halaya", name: "Ube halaya", unit: "g", costAmount: "0.50", stock: 15_000 },
  { key: "sugar", name: "Sugar", unit: "g", costAmount: "0.02", stock: 50_000 },
  { key: "egg", name: "Egg (whole)", unit: "pc", costAmount: "8.00", stock: 2_000 },
  { key: "banana", name: "Banana (saba / ripe)", unit: "g", costAmount: "0.05", stock: 20_000 },
  { key: "coconut", name: "Desiccated coconut", unit: "g", costAmount: "0.15", stock: 15_000 },
  { key: "yeast", name: "Instant yeast", unit: "g", costAmount: "0.80", stock: 3_000 },
  { key: "retail_bag_250g", name: "Retail bag — house blend 250g", unit: "bag", costAmount: "120.00", stock: 200 },
  { key: "retail_bag_1kg", name: "Retail bag — Barako 1kg", unit: "bag", costAmount: "420.00", stock: 80 },
  { key: "tumbler_sku", name: "Branded tumbler (inventory)", unit: "pc", costAmount: "180.00", stock: 120 },
  { key: "cup_sku", name: "Reusable cup (inventory)", unit: "pc", costAmount: "95.00", stock: 200 },
  { key: "gift_bundle_sku", name: "Gift bundle box (inventory)", unit: "set", costAmount: "250.00", stock: 60 },
]

type AddonDef = { key: string; name: string; amount: string; sortOrder: number }

const ADDON_DEFS: AddonDef[] = [
  { key: "pearl", name: "Pearl / sago", amount: "20.00", sortOrder: 0 },
  { key: "oat", name: "Oat milk upgrade", amount: "25.00", sortOrder: 1 },
  { key: "almond", name: "Almond milk upgrade", amount: "25.00", sortOrder: 2 },
  { key: "extra_shot", name: "Extra espresso shot", amount: "35.00", sortOrder: 3 },
  { key: "vanilla", name: "Vanilla syrup pump", amount: "15.00", sortOrder: 4 },
  { key: "caramel", name: "Caramel syrup pump", amount: "15.00", sortOrder: 5 },
  { key: "ube", name: "Ube syrup pump", amount: "20.00", sortOrder: 6 },
  { key: "foam", name: "Cream cheese foam", amount: "40.00", sortOrder: 7 },
  { key: "whip", name: "Whipped cream", amount: "15.00", sortOrder: 8 },
  { key: "yakult", name: "Yakult-style add-on", amount: "25.00", sortOrder: 9 },
]

type CatKey = "hot" | "iced" | "tea" | "bakery" | "retail"

const CATEGORY_DEFS: {
  key: CatKey
  name: string
  color: string | null
  icon: string | null
  sortOrder: number
  variantLabels: [string, string, string]
  instructions: string[]
  addonKeys: string[]
}[] = [
  {
    key: "hot",
    name: "Hot espresso & classics",
    color: "#6F4E37",
    icon: "coffee",
    sortOrder: 0,
    variantLabels: ["Tall", "Grande", "Venti"],
    instructions: [
      "Walang yelo / no ice",
      "Less ice",
      "Extra hot",
      "Less sweet",
      "No dairy",
      "Decaf",
    ],
    addonKeys: ["pearl", "oat", "almond", "extra_shot", "vanilla", "caramel", "ube", "foam", "whip", "yakult"],
  },
  {
    key: "iced",
    name: "Iced & frappe-style",
    color: "#3B82F6",
    icon: "cup-soda",
    sortOrder: 1,
    variantLabels: ["Tall", "Grande", "Venti"],
    instructions: ["Walang yelo", "Less ice", "Less sweet", "No dairy", "Extra shot on the side"],
    addonKeys: ["pearl", "oat", "almond", "extra_shot", "vanilla", "caramel", "ube", "foam", "whip", "yakult"],
  },
  {
    key: "tea",
    name: "Tea, matcha & signatures",
    color: "#22C55E",
    icon: "leaf",
    sortOrder: 2,
    variantLabels: ["Tall", "Grande", "Venti"],
    instructions: ["Less sweet", "No dairy", "Extra pearls", "Less ice"],
    addonKeys: ["pearl", "oat", "almond", "vanilla", "caramel", "ube", "foam", "whip", "yakult"],
  },
  {
    key: "bakery",
    name: "Filipino bakery & pastries",
    color: "#F59E0B",
    icon: "croissant",
    sortOrder: 3,
    variantLabels: ["1 pc", "2 pc", "Box (6)"],
    instructions: ["Iinit / warm", "Slice in half", "No extra sugar on top"],
    addonKeys: [],
  },
  {
    key: "retail",
    name: "Beans & merch",
    color: "#8B5CF6",
    icon: "shopping-bag",
    sortOrder: 4,
    variantLabels: ["Solo", "Sharing", "Party"],
    instructions: [],
    addonKeys: [],
  },
]

type ProductSeed = {
  sku: string
  name: string
  description: string | null
  categoryKey: CatKey
  isComposite: boolean
  trackInventory: boolean
  /** Three tier prices (matches category variant order), decimal strings */
  prices: [string, string, string]
  ingredients?: { invKey: string; qty: string }[]
}

const PRODUCTS: ProductSeed[] = [
  {
    sku: "PH-HOT-AME-01",
    name: "Americano",
    description: "Double shot + hot water.",
    categoryKey: "hot",
    isComposite: true,
    trackInventory: false,
    prices: ["95.00", "110.00", "125.00"],
    ingredients: [
      { invKey: "beans_house", qty: "18" },
      { invKey: "beans_house", qty: "18" },
      { invKey: "hot_water", qty: "240" },
    ],
  },
  {
    sku: "PH-HOT-LAT-01",
    name: "Café Latte",
    description: "Espresso with steamed fresh milk.",
    categoryKey: "hot",
    isComposite: true,
    trackInventory: false,
    prices: ["120.00", "135.00", "150.00"],
    ingredients: [
      { invKey: "beans_house", qty: "18" },
      { invKey: "milk_fresh", qty: "220" },
    ],
  },
  {
    sku: "PH-HOT-CAP-01",
    name: "Cappuccino",
    description: "Espresso, milk, more foam.",
    categoryKey: "hot",
    isComposite: true,
    trackInventory: false,
    prices: ["125.00", "140.00", "155.00"],
    ingredients: [
      { invKey: "beans_house", qty: "18" },
      { invKey: "milk_fresh", qty: "180" },
    ],
  },
  {
    sku: "PH-HOT-SPA-01",
    name: "Spanish Latte",
    description: "Condensed milk + espresso + fresh milk.",
    categoryKey: "hot",
    isComposite: true,
    trackInventory: false,
    prices: ["130.00", "150.00", "170.00"],
    ingredients: [
      { invKey: "beans_house", qty: "18" },
      { invKey: "condensed_milk", qty: "40" },
      { invKey: "milk_fresh", qty: "180" },
    ],
  },
  {
    sku: "PH-HOT-MOC-01",
    name: "Café Mocha",
    description: "Chocolate + espresso + milk.",
    categoryKey: "hot",
    isComposite: true,
    trackInventory: false,
    prices: ["135.00", "155.00", "175.00"],
    ingredients: [
      { invKey: "beans_house", qty: "18" },
      { invKey: "cocoa_powder", qty: "12" },
      { invKey: "milk_fresh", qty: "200" },
    ],
  },
  {
    sku: "PH-ICE-LAT-01",
    name: "Iced Latte",
    description: "Iced espresso + cold milk.",
    categoryKey: "iced",
    isComposite: true,
    trackInventory: false,
    prices: ["125.00", "140.00", "160.00"],
    ingredients: [
      { invKey: "beans_house", qty: "18" },
      { invKey: "milk_fresh", qty: "200" },
      { invKey: "ice_water", qty: "120" },
    ],
  },
  {
    sku: "PH-ICE-AME-01",
    name: "Iced Americano",
    description: "Espresso over ice + cold water.",
    categoryKey: "iced",
    isComposite: true,
    trackInventory: false,
    prices: ["105.00", "120.00", "135.00"],
    ingredients: [
      { invKey: "beans_house", qty: "18" },
      { invKey: "beans_house", qty: "18" },
      { invKey: "ice_water", qty: "280" },
    ],
  },
  {
    sku: "PH-ICE-FRA-01",
    name: "Mocha Frappe",
    description: "Blended ice mocha.",
    categoryKey: "iced",
    isComposite: true,
    trackInventory: false,
    prices: ["145.00", "165.00", "185.00"],
    ingredients: [
      { invKey: "beans_house", qty: "18" },
      { invKey: "milk_fresh", qty: "150" },
      { invKey: "cocoa_powder", qty: "15" },
      { invKey: "frappe_powder", qty: "40" },
      { invKey: "ice_water", qty: "100" },
    ],
  },
  {
    sku: "PH-ICE-CB-01",
    name: "Cold Brew",
    description: "Slow-steeped concentrate over ice.",
    categoryKey: "iced",
    isComposite: true,
    trackInventory: false,
    prices: ["115.00", "130.00", "145.00"],
    ingredients: [
      { invKey: "cold_brew_conc", qty: "120" },
      { invKey: "ice_water", qty: "200" },
    ],
  },
  {
    sku: "PH-ICE-SPA-01",
    name: "Iced Spanish Latte",
    description: "Condensed milk, espresso, milk, ice.",
    categoryKey: "iced",
    isComposite: true,
    trackInventory: false,
    prices: ["135.00", "155.00", "175.00"],
    ingredients: [
      { invKey: "beans_house", qty: "18" },
      { invKey: "condensed_milk", qty: "45" },
      { invKey: "milk_fresh", qty: "160" },
      { invKey: "ice_water", qty: "100" },
    ],
  },
  {
    sku: "PH-TEA-MAT-01",
    name: "Matcha Latte",
    description: "Ceremonial-style matcha with milk.",
    categoryKey: "tea",
    isComposite: true,
    trackInventory: false,
    prices: ["140.00", "160.00", "180.00"],
    ingredients: [
      { invKey: "matcha", qty: "3" },
      { invKey: "milk_fresh", qty: "240" },
    ],
  },
  {
    sku: "PH-TEA-WIN-01",
    name: "Wintermelon Milk Tea",
    description: "Black tea, milk, wintermelon.",
    categoryKey: "tea",
    isComposite: true,
    trackInventory: false,
    prices: ["110.00", "125.00", "140.00"],
    ingredients: [
      { invKey: "tea_bag", qty: "1" },
      { invKey: "milk_fresh", qty: "200" },
      { invKey: "wintermelon_syrup", qty: "35" },
    ],
  },
  {
    sku: "PH-TEA-OKI-01",
    name: "Okinawa Milk Tea",
    description: "Roasted / brown sugar style with milk.",
    categoryKey: "tea",
    isComposite: true,
    trackInventory: false,
    prices: ["115.00", "130.00", "145.00"],
    ingredients: [
      { invKey: "tea_bag", qty: "1" },
      { invKey: "milk_fresh", qty: "200" },
      { invKey: "caramel_syrup", qty: "25" },
    ],
  },
  {
    sku: "PH-TEA-LEM-01",
    name: "Lemon Black Tea",
    description: "Iced black tea, citrus finish (simulated).",
    categoryKey: "tea",
    isComposite: true,
    trackInventory: false,
    prices: ["95.00", "108.00", "120.00"],
    ingredients: [
      { invKey: "tea_bag", qty: "1" },
      { invKey: "ice_water", qty: "350" },
      { invKey: "sugar", qty: "15" },
    ],
  },
  {
    sku: "PH-TEA-STR-01",
    name: "Strawberry Matcha",
    description: "Matcha layered with strawberry.",
    categoryKey: "tea",
    isComposite: true,
    trackInventory: false,
    prices: ["150.00", "170.00", "190.00"],
    ingredients: [
      { invKey: "matcha", qty: "2.5" },
      { invKey: "milk_fresh", qty: "200" },
      { invKey: "strawberry_syrup", qty: "30" },
    ],
  },
  {
    sku: "PH-BAK-ENS-01",
    name: "Ensaymada (classic)",
    description: "Buttery brioche with cheese topping.",
    categoryKey: "bakery",
    isComposite: true,
    trackInventory: false,
    prices: ["55.00", "105.00", "300.00"],
    ingredients: [
      { invKey: "flour", qty: "85" },
      { invKey: "butter", qty: "35" },
      { invKey: "cheese", qty: "20" },
      { invKey: "sugar", qty: "25" },
      { invKey: "egg", qty: "0.5" },
    ],
  },
  {
    sku: "PH-BAK-PDC-01",
    name: "Pan de coco",
    description: "Soft bun with sweet coconut filling.",
    categoryKey: "bakery",
    isComposite: false,
    trackInventory: false,
    prices: ["28.00", "52.00", "150.00"],
  },
  {
    sku: "PH-BAK-CHR-01",
    name: "Cheese roll",
    description: "Flaky roll with cheese.",
    categoryKey: "bakery",
    isComposite: true,
    trackInventory: false,
    prices: ["35.00", "65.00", "190.00"],
    ingredients: [
      { invKey: "flour", qty: "70" },
      { invKey: "cheese", qty: "25" },
      { invKey: "butter", qty: "25" },
      { invKey: "sugar", qty: "15" },
    ],
  },
  {
    sku: "PH-BAK-UBE-01",
    name: "Ube cheese pandesal",
    description: "Ube halaya + cheese in pandesal dough.",
    categoryKey: "bakery",
    isComposite: true,
    trackInventory: false,
    prices: ["42.00", "80.00", "230.00"],
    ingredients: [
      { invKey: "flour", qty: "80" },
      { invKey: "ube_halaya", qty: "30" },
      { invKey: "cheese", qty: "15" },
      { invKey: "butter", qty: "20" },
      { invKey: "yeast", qty: "2" },
    ],
  },
  {
    sku: "PH-BAK-BAN-01",
    name: "Banana loaf (slice)",
    description: "Moist loaf — priced per slice / half / whole.",
    categoryKey: "bakery",
    isComposite: true,
    trackInventory: false,
    prices: ["45.00", "85.00", "240.00"],
    ingredients: [
      { invKey: "flour", qty: "60" },
      { invKey: "banana", qty: "80" },
      { invKey: "butter", qty: "30" },
      { invKey: "sugar", qty: "35" },
      { invKey: "egg", qty: "1" },
    ],
  },
  {
    sku: "PH-RET-250-01",
    name: "House blend beans — 250g",
    description: "Retail bag, whole bean.",
    categoryKey: "retail",
    isComposite: true,
    trackInventory: true,
    prices: ["320.00", "600.00", "1100.00"],
    ingredients: [{ invKey: "retail_bag_250g", qty: "1" }],
  },
  {
    sku: "PH-RET-1KG-01",
    name: "Barako beans — 1kg",
    description: "Bold Barako, retail bag.",
    categoryKey: "retail",
    isComposite: true,
    trackInventory: true,
    prices: ["980.00", "1880.00", "3500.00"],
    ingredients: [{ invKey: "retail_bag_1kg", qty: "1" }],
  },
  {
    sku: "PH-RET-TUM-01",
    name: "Branded tumbler",
    description: "20oz insulated tumbler.",
    categoryKey: "retail",
    isComposite: true,
    trackInventory: true,
    prices: ["450.00", "850.00", "1200.00"],
    ingredients: [{ invKey: "tumbler_sku", qty: "1" }],
  },
  {
    sku: "PH-RET-CUP-01",
    name: "Reusable cup",
    description: "Takeaway-friendly cup.",
    categoryKey: "retail",
    isComposite: true,
    trackInventory: true,
    prices: ["180.00", "340.00", "600.00"],
    ingredients: [{ invKey: "cup_sku", qty: "1" }],
  },
  {
    sku: "PH-RET-GIF-01",
    name: "Gift bundle",
    description: "Cup + 250g beans + sticker pack.",
    categoryKey: "retail",
    isComposite: true,
    trackInventory: true,
    prices: ["520.00", "980.00", "1600.00"],
    ingredients: [{ invKey: "gift_bundle_sku", qty: "1" }],
  },
]

async function seedCoffeeCatalog(db: ReturnType<typeof createDb>, organizationId: string, currency: string) {
  const now = new Date()
  const invIds = new Map<string, string>()
  for (const def of INVENTORY_DEFS) {
    const id = randomUUID()
    invIds.set(def.key, id)
  }

  const addonIds = new Map<string, string>()
  for (const def of ADDON_DEFS) {
    addonIds.set(def.key, randomUUID())
  }

  const catIds = new Map<CatKey, string>()
  for (const c of CATEGORY_DEFS) {
    catIds.set(c.key, randomUUID())
  }

  const variantIds = new Map<CatKey, [string, string, string]>()
  for (const c of CATEGORY_DEFS) {
    variantIds.set(c.key, [randomUUID(), randomUUID(), randomUUID()])
  }

  await db.transaction(async (tx) => {
    for (const def of INVENTORY_DEFS) {
      const id = invIds.get(def.key)!
      await tx.insert(inventoryItem).values({
        id,
        organizationId,
        name: def.name,
        unit: def.unit,
        costPerUnitMinor: parseDecimal2ToMinor(def.costAmount),
        reorderPoint: Math.max(10, Math.floor(def.stock * 0.05)),
        createdAt: now,
        updatedAt: now,
      })
      await tx.insert(inventoryStock).values({
        id: randomUUID(),
        inventoryItemId: id,
        organizationId,
        quantity: def.stock,
        updatedAt: now,
      })
    }

    for (const def of ADDON_DEFS) {
      await tx.insert(productAddon).values({
        id: addonIds.get(def.key)!,
        organizationId,
        name: def.name,
        amountMinor: parseDecimal2ToMinor(def.amount),
        currency,
        isActive: true,
        sortOrder: def.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
    }

    for (const c of CATEGORY_DEFS) {
      const cid = catIds.get(c.key)!
      await tx.insert(productCategory).values({
        id: cid,
        organizationId,
        name: c.name,
        color: c.color,
        icon: c.icon,
        sortOrder: c.sortOrder,
        createdAt: now,
      })

      const [v0, v1, v2] = variantIds.get(c.key)!
      const labels = c.variantLabels
      await tx.insert(productCategoryVariant).values([
        { id: v0, categoryId: cid, label: labels[0], sortOrder: 0, createdAt: now },
        { id: v1, categoryId: cid, label: labels[1], sortOrder: 1, createdAt: now },
        { id: v2, categoryId: cid, label: labels[2], sortOrder: 2, createdAt: now },
      ])

      let instrOrder = 0
      for (const label of c.instructions) {
        await tx.insert(productCategoryInstruction).values({
          id: randomUUID(),
          categoryId: cid,
          label,
          sortOrder: instrOrder++,
          createdAt: now,
        })
      }

      let linkOrder = 0
      for (const ak of c.addonKeys) {
        const aid = addonIds.get(ak)
        if (!aid) continue
        await tx.insert(productCategoryAddon).values({
          id: randomUUID(),
          categoryId: cid,
          addonId: aid,
          sortOrder: linkOrder++,
        })
      }
    }

    for (const p of PRODUCTS) {
      const pid = randomUUID()
      const cid = catIds.get(p.categoryKey)!
      const [vid0, vid1, vid2] = variantIds.get(p.categoryKey)!

      await tx.insert(product).values({
        id: pid,
        organizationId,
        categoryId: cid,
        name: p.name,
        description: p.description,
        sku: p.sku,
        qrCode: null,
        imageUrl: null,
        isActive: true,
        isComposite: p.isComposite,
        trackInventory: p.trackInventory,
        availabilityMode: "all_locations",
        createdAt: now,
        updatedAt: now,
      })

      const catDef = CATEGORY_DEFS.find((c) => c.key === p.categoryKey)!
      const tierPrices: { vid: string; label: string; amount: string; isDefault: boolean; sort: number }[] = [
        { vid: vid0, label: catDef.variantLabels[0], amount: p.prices[0], isDefault: true, sort: 0 },
        { vid: vid1, label: catDef.variantLabels[1], amount: p.prices[1], isDefault: false, sort: 1 },
        { vid: vid2, label: catDef.variantLabels[2], amount: p.prices[2], isDefault: false, sort: 2 },
      ]

      for (const t of tierPrices) {
        await tx.insert(productPrice).values({
          id: randomUUID(),
          productId: pid,
          label: t.label,
          amountMinor: parseDecimal2ToMinor(t.amount),
          currency,
          isDefault: t.isDefault,
          sortOrder: t.sort,
          categoryVariantId: t.vid,
          createdAt: now,
        })
      }

      if (p.isComposite && p.ingredients?.length) {
        for (const line of p.ingredients) {
          const iid = invIds.get(line.invKey)
          if (!iid) throw new Error(`Unknown inventory key: ${line.invKey}`)
          await tx.insert(productIngredient).values({
            id: randomUUID(),
            productId: pid,
            inventoryItemId: iid,
            quantityMilli: parseDecimal3ToMilli(line.qty),
          })
        }
      }
    }
  })
}

async function main() {
  const { orgSlug, wipeCatalog, fullReset } = parseArgs(process.argv.slice(2))
  if (!orgSlug?.trim()) {
    console.error(
      "Usage: pnpm db:seed:coffee -- --org-slug <organization.slug> [--wipe-catalog | --full-reset]",
    )
    process.exit(1)
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl?.trim()) {
    console.error("DATABASE_URL is required.")
    process.exit(1)
  }

  const db = createDb(databaseUrl)

  const [org] = await db
    .select({ id: organization.id, slug: organization.slug })
    .from(organization)
    .where(eq(organization.slug, orgSlug.trim()))
    .limit(1)

  if (!org) {
    console.error(`No organization found with slug: ${orgSlug}`)
    process.exit(1)
  }

  const [existingCat] = await db
    .select({ id: productCategory.id })
    .from(productCategory)
    .where(eq(productCategory.organizationId, org.id))
    .limit(1)

  if (fullReset) {
    await wipeOrgSales(db, org.id)
    await wipeOrgCatalogData(db, org.id)
    console.warn(
      `[dev] Full reset: deleted all POS transactions and catalog/inventory for org "${org.slug}", then seeding.`,
    )
  } else if (wipeCatalog) {
    await wipeOrgCatalog(db, org.id)
    console.log("Wiped catalog and inventory for org:", org.slug)
  } else if (existingCat) {
    console.error(
      `Organization "${org.slug}" already has catalog categories. Use --wipe-catalog (no sales) or --full-reset (delete sales + catalog) then re-run.`,
    )
    process.exit(1)
  }

  const currency = await resolveCurrency(db, org.id)
  await seedCoffeeCatalog(db, org.id, currency)

  console.log(`Seeded Philippines coffee catalog for "${org.slug}" (${currency}).`)
  console.log(`Categories: ${CATEGORY_DEFS.length}, products: ${PRODUCTS.length}, inventory lines: ${INVENTORY_DEFS.length}.`)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
