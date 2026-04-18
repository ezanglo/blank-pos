CREATE TABLE "product_category_instruction" (
	"id" text PRIMARY KEY NOT NULL,
	"category_id" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_item_instruction" (
	"id" text PRIMARY KEY NOT NULL,
	"transaction_item_id" text NOT NULL,
	"instruction_id" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transaction_item_addon" DROP CONSTRAINT "txn_item_addon_transaction_item_id_fk";
--> statement-breakpoint
ALTER TABLE "transaction_item_addon" DROP CONSTRAINT "txn_item_addon_product_addon_id_fk";
--> statement-breakpoint
ALTER TABLE "product_category_instruction" ADD CONSTRAINT "product_category_instruction_category_id_product_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_item_instruction" ADD CONSTRAINT "transaction_item_instruction_transaction_item_id_transaction_items_id_fk" FOREIGN KEY ("transaction_item_id") REFERENCES "public"."transaction_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_item_instruction" ADD CONSTRAINT "transaction_item_instruction_instruction_id_product_category_instruction_id_fk" FOREIGN KEY ("instruction_id") REFERENCES "public"."product_category_instruction"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_category_instruction_categoryId_idx" ON "product_category_instruction" USING btree ("category_id");--> statement-breakpoint
CREATE UNIQUE INDEX "product_category_instruction_category_label_unique" ON "product_category_instruction" USING btree ("category_id","label");--> statement-breakpoint
CREATE INDEX "transaction_item_instruction_transactionItemId_idx" ON "transaction_item_instruction" USING btree ("transaction_item_id");--> statement-breakpoint
ALTER TABLE "transaction_item_addon" ADD CONSTRAINT "transaction_item_addon_transaction_item_id_transaction_items_id_fk" FOREIGN KEY ("transaction_item_id") REFERENCES "public"."transaction_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transaction_item_addon" ADD CONSTRAINT "transaction_item_addon_addon_id_product_addon_id_fk" FOREIGN KEY ("addon_id") REFERENCES "public"."product_addon"("id") ON DELETE restrict ON UPDATE no action;