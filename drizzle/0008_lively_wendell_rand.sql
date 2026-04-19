CREATE TABLE "inventory_movements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"inventory_item_id" text NOT NULL,
	"type" text NOT NULL,
	"quantity" integer NOT NULL,
	"reference_id" text,
	"note" text,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_inventory_item_id_inventory_item_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_item"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_movements_item_org_created_idx" ON "inventory_movements" USING btree ("inventory_item_id","organization_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_organizationId_createdAt_idx" ON "inventory_movements" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_movements_sale_line_item_unique" ON "inventory_movements" USING btree ("reference_id","inventory_item_id") WHERE "inventory_movements"."type" = 'out' and "inventory_movements"."reference_id" is not null;
