ALTER TABLE "order_items" DROP CONSTRAINT "order_items_deal_slot_id_deal_slots_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" DROP CONSTRAINT "order_items_menu_item_id_menu_items_id_fk";
--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "menu_item_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_deal_slot_id_deal_slots_id_fk" FOREIGN KEY ("deal_slot_id") REFERENCES "public"."deal_slots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE set null ON UPDATE no action;