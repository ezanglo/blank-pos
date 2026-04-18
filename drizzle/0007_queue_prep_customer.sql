ALTER TABLE "product" ADD COLUMN "prep_time_seconds" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "queue_number" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "customer_call_name" text;--> statement-breakpoint
CREATE TABLE "location_queue_counter" (
	"location_id" text NOT NULL,
	"queue_date" text NOT NULL,
	"last_number" integer NOT NULL,
	CONSTRAINT "location_queue_counter_location_id_queue_date_pk" PRIMARY KEY("location_id","queue_date")
);
--> statement-breakpoint
ALTER TABLE "location_queue_counter" ADD CONSTRAINT "location_queue_counter_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE cascade ON UPDATE no action;
