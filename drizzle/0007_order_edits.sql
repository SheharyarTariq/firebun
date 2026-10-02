ALTER TABLE "orders" ADD COLUMN "edited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "edited_by" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_edited_by_users_id_fk" FOREIGN KEY ("edited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;