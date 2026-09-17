ALTER TABLE "inventory_items" ADD COLUMN "pack_size" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD COLUMN "pack_label" text;--> statement-breakpoint
ALTER TABLE "inventory_purchases" ADD COLUMN "pack_size" numeric(14, 3);--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_pack_size_check" CHECK ("inventory_items"."pack_size" is null or "inventory_items"."pack_size" > 0);