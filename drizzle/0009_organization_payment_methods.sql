CREATE TABLE "organization_payment_method" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_payment_method" ADD CONSTRAINT "organization_payment_method_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "organization_payment_method_organizationId_idx" ON "organization_payment_method" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "organization_payment_method_org_key_unique" ON "organization_payment_method" USING btree ("organization_id","key");