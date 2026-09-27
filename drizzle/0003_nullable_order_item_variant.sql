ALTER TABLE "order_items" DROP CONSTRAINT "order_items_variant_id_menu_item_variants_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "variant_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_menu_item_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."menu_item_variants"("id") ON DELETE set null ON UPDATE no action;