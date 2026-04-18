CREATE TABLE "product_addon" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_category_addon" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"addon_id" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_item_addon" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_item_id" text NOT NULL,
	"addon_id" text NOT NULL,
	"name" text NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"quantity" integer NOT NULL,
	"subtotal_minor" bigint NOT NULL
);
--> statement-breakpoint
ALTER TABLE "product_addon" ADD CONSTRAINT "product_addon_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category_addon" ADD CONSTRAINT "product_category_addon_category_id_product_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_category_addon" ADD CONSTRAINT "product_category_addon_addon_id_product_addon_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."product_addon"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_item_addon" ADD CONSTRAINT "txn_item_addon_transaction_item_id_fk" FOREIGN KEY ("transaction_item_id") REFERENCES "public"."transaction_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_item_addon" ADD CONSTRAINT "txn_item_addon_product_addon_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."product_addon"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_addon_organizationId_idx" ON "product_addon" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "product_category_addon_categoryId_idx" ON "product_category_addon" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "product_category_addon_addonId_idx" ON "product_category_addon" USING btree ("addon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_category_addon_category_addon_unique" ON "product_category_addon" USING btree ("category_id","addon_id");--> statement-breakpoint
CREATE INDEX "transaction_item_addon_transactionItemId_idx" ON "transaction_item_addon" USING btree ("transaction_item_id");
