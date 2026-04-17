CREATE TABLE "inventory_item" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"cost_per_unit_minor" bigint NOT NULL,
	"reorder_point" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_stock" (
	"id" text PRIMARY KEY NOT NULL,
	"inventory_item_id" text NOT NULL,
	"organization_id" text NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"category_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"sku" text,
	"barcode" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_composite" boolean DEFAULT false NOT NULL,
	"track_inventory" boolean DEFAULT false NOT NULL,
	"availability_mode" text DEFAULT 'all_locations' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_category" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"color" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_category_variant" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_ingredient" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"inventory_item_id" text NOT NULL,
	"quantity_milli" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_location" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"location_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_price" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"label" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"category_variant_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_details" ADD COLUMN "default_currency" text;--> statement-breakpoint
ALTER TABLE "inventory_item" ADD CONSTRAINT "inventory_item_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_inventory_item_id_inventory_item_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_stock" ADD CONSTRAINT "inventory_stock_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_category_id_product_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category" ADD CONSTRAINT "product_category_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category_variant" ADD CONSTRAINT "product_category_variant_category_id_product_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredient" ADD CONSTRAINT "product_ingredient_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_ingredient" ADD CONSTRAINT "product_ingredient_inventory_item_id_inventory_item_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_location" ADD CONSTRAINT "product_location_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_location" ADD CONSTRAINT "product_location_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_price" ADD CONSTRAINT "product_price_category_variant_id_product_category_variant_id_fk" FOREIGN KEY ("category_variant_id") REFERENCES "public"."product_category_variant"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_item_organizationId_idx" ON "inventory_item" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_stock_item_org_unique" ON "inventory_stock" USING btree ("inventory_item_id","organization_id");--> statement-breakpoint
CREATE INDEX "product_organizationId_idx" ON "product" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_categoryId_idx" ON "product" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_organization_sku_unique" ON "product" USING btree ("organization_id","sku");--> statement-breakpoint
CREATE INDEX "product_category_organizationId_idx" ON "product_category" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_category_variant_categoryId_idx" ON "product_category_variant" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_category_variant_category_label_unique" ON "product_category_variant" USING btree ("category_id","label");--> statement-breakpoint
CREATE INDEX "product_ingredient_productId_idx" ON "product_ingredient" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_ingredient_inventoryItemId_idx" ON "product_ingredient" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "product_location_productId_idx" ON "product_location" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_location_locationId_idx" ON "product_location" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_location_product_location_unique" ON "product_location" USING btree ("product_id","location_id");--> statement-breakpoint
CREATE INDEX "product_price_productId_idx" ON "product_price" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_price_categoryVariantId_idx" ON "product_price" USING btree ("category_variant_id");