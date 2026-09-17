CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'staff' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"token_version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('admin', 'staff'))
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" integer PRIMARY KEY NOT NULL,
	"shop_name" text DEFAULT 'Fire Bun' NOT NULL,
	"phone" text,
	"phone2" text,
	"address" text,
	"default_delivery_charge" numeric(12, 2) DEFAULT 50 NOT NULL,
	"staff_max_discount_pct" integer DEFAULT 10 NOT NULL,
	"staff_can_add_expenses" boolean DEFAULT true NOT NULL,
	"staff_cancel_window_minutes" integer DEFAULT 10 NOT NULL,
	"business_day_cutoff_hour" integer DEFAULT 4 NOT NULL,
	"receipt_header_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"receipt_footer" text DEFAULT 'Thank you for choosing Fire Bun!' NOT NULL,
	"chars_per_line" integer DEFAULT 32 NOT NULL,
	"print_kitchen_copy" boolean DEFAULT false NOT NULL,
	"auto_print_on_place" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	CONSTRAINT "settings_singleton_check" CHECK ("settings"."id" = 1),
	CONSTRAINT "settings_cutoff_check" CHECK ("settings"."business_day_cutoff_hour" between 0 and 12),
	CONSTRAINT "settings_staff_discount_check" CHECK ("settings"."staff_max_discount_pct" between 0 and 100),
	CONSTRAINT "settings_chars_check" CHECK ("settings"."chars_per_line" in (32, 42, 48))
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"base_unit" text NOT NULL,
	"display_unit" text NOT NULL,
	"current_qty" numeric(14, 3) DEFAULT 0 NOT NULL,
	"low_stock_threshold" numeric(14, 3),
	"avg_cost" numeric(14, 6),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_items_base_unit_check" CHECK ("inventory_items"."base_unit" in ('g', 'ml', 'pcs')),
	CONSTRAINT "inventory_items_display_unit_check" CHECK ("inventory_items"."display_unit" in ('kg', 'g', 'L', 'ml', 'pcs')),
	CONSTRAINT "inventory_items_threshold_check" CHECK ("inventory_items"."low_stock_threshold" is null or "inventory_items"."low_stock_threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_purchases" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "inventory_purchases_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"inventory_item_id" integer NOT NULL,
	"entered_qty" numeric(14, 3) NOT NULL,
	"entered_unit" text NOT NULL,
	"quantity_base" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(14, 6) NOT NULL,
	"total_cost" numeric(12, 2) NOT NULL,
	"supplier" text,
	"note" text,
	"purchase_date" date NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"voided_by" integer,
	"void_reason" text,
	CONSTRAINT "inventory_purchases_qty_check" CHECK ("inventory_purchases"."quantity_base" > 0),
	CONSTRAINT "inventory_purchases_cost_check" CHECK ("inventory_purchases"."total_cost" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "stock_movements_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"inventory_item_id" integer NOT NULL,
	"type" text NOT NULL,
	"quantity_delta" numeric(14, 3) NOT NULL,
	"unit_cost" numeric(14, 6),
	"reference_type" text,
	"reference_id" integer,
	"note" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_delta_nonzero_check" CHECK ("stock_movements"."quantity_delta" <> 0),
	CONSTRAINT "stock_movements_sign_check" CHECK (("stock_movements"."type" in ('opening', 'purchase', 'sale_reversal') and "stock_movements"."quantity_delta" > 0)
        or ("stock_movements"."type" in ('sale', 'purchase_void', 'wastage') and "stock_movements"."quantity_delta" < 0)
        or ("stock_movements"."type" = 'adjustment'))
);
--> statement-breakpoint
CREATE TABLE "deal_slot_options" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "deal_slot_options_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slot_id" integer NOT NULL,
	"variant_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_slots" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "deal_slots_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"deal_variant_id" integer NOT NULL,
	"label" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "deal_slots_quantity_check" CHECK ("deal_slots"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "menu_categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_variants" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_item_variants_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"menu_item_id" integer NOT NULL,
	"name" text DEFAULT 'Regular' NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_item_variants_price_check" CHECK ("menu_item_variants"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "menu_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'single' NOT NULL,
	"slug" text,
	"description" text,
	"image_url" text,
	"is_available" boolean DEFAULT true NOT NULL,
	"show_on_public_menu" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "menu_items_kind_check" CHECK ("menu_items"."kind" in ('single', 'deal'))
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recipes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"variant_id" integer NOT NULL,
	"inventory_item_id" integer NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	CONSTRAINT "recipes_quantity_check" CHECK ("recipes"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "daily_counters" (
	"business_date" date PRIMARY KEY NOT NULL,
	"last_seq" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "order_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"order_id" integer NOT NULL,
	"parent_order_item_id" integer,
	"deal_slot_id" integer,
	"menu_item_id" integer NOT NULL,
	"variant_id" integer NOT NULL,
	"name_snapshot" text NOT NULL,
	"variant_name_snapshot" text NOT NULL,
	"unit_price_snapshot" numeric(12, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"line_total" numeric(12, 2) NOT NULL,
	"note" text,
	CONSTRAINT "order_items_quantity_check" CHECK ("order_items"."quantity" > 0),
	CONSTRAINT "order_items_line_total_check" CHECK ("order_items"."line_total" = "order_items"."unit_price_snapshot" * "order_items"."quantity"),
	CONSTRAINT "order_items_deal_child_price_check" CHECK ("order_items"."parent_order_item_id" is null or "order_items"."unit_price_snapshot" = 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "orders_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"client_id" uuid NOT NULL,
	"business_date" date NOT NULL,
	"daily_seq" integer NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"order_type" text DEFAULT 'takeaway' NOT NULL,
	"customer_name" text,
	"customer_phone" text,
	"delivery_address" text,
	"subtotal" numeric(12, 2) NOT NULL,
	"discount_amount" numeric(12, 2) DEFAULT 0 NOT NULL,
	"delivery_charge" numeric(12, 2) DEFAULT 0 NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"payment_method" text,
	"paid_at" timestamp with time zone,
	"note" text,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" integer,
	"cancel_reason" text,
	"restocked" boolean DEFAULT false NOT NULL,
	CONSTRAINT "orders_status_check" CHECK ("orders"."status" in ('pending', 'completed', 'cancelled')),
	CONSTRAINT "orders_type_check" CHECK ("orders"."order_type" in ('takeaway', 'dine_in', 'delivery')),
	CONSTRAINT "orders_payment_method_check" CHECK ("orders"."payment_method" is null or "orders"."payment_method" in ('cash', 'online')),
	CONSTRAINT "orders_subtotal_check" CHECK ("orders"."subtotal" >= 0),
	CONSTRAINT "orders_discount_check" CHECK ("orders"."discount_amount" >= 0 and "orders"."discount_amount" <= "orders"."subtotal"),
	CONSTRAINT "orders_delivery_check" CHECK ("orders"."delivery_charge" >= 0),
	CONSTRAINT "orders_total_check" CHECK ("orders"."total" = "orders"."subtotal" - "orders"."discount_amount" + "orders"."delivery_charge"),
	CONSTRAINT "orders_paid_consistency_check" CHECK (("orders"."status" = 'completed' and "orders"."paid_at" is not null and "orders"."payment_method" is not null)
        or ("orders"."status" = 'pending' and "orders"."paid_at" is null)
        or ("orders"."status" = 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "expenses_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"category" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"expense_date" date NOT NULL,
	"created_by" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" integer,
	"updated_at" timestamp with time zone,
	CONSTRAINT "expenses_amount_check" CHECK ("expenses"."amount" > 0)
);
--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_purchases" ADD CONSTRAINT "inventory_purchases_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_slot_options" ADD CONSTRAINT "deal_slot_options_slot_id_deal_slots_id_fk" FOREIGN KEY ("slot_id") REFERENCES "public"."deal_slots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_slot_options" ADD CONSTRAINT "deal_slot_options_variant_id_menu_item_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."menu_item_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_slots" ADD CONSTRAINT "deal_slots_deal_variant_id_menu_item_variants_id_fk" FOREIGN KEY ("deal_variant_id") REFERENCES "public"."menu_item_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_variants" ADD CONSTRAINT "menu_item_variants_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_items" ADD CONSTRAINT "menu_items_category_id_menu_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."menu_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_variant_id_menu_item_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."menu_item_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_parent_order_item_id_order_items_id_fk" FOREIGN KEY ("parent_order_item_id") REFERENCES "public"."order_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_deal_slot_id_deal_slots_id_fk" FOREIGN KEY ("deal_slot_id") REFERENCES "public"."deal_slots"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_menu_item_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."menu_item_variants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_idx" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "inventory_items_active_name_idx" ON "inventory_items" USING btree ("is_active","name");--> statement-breakpoint
CREATE INDEX "inventory_purchases_date_idx" ON "inventory_purchases" USING btree ("purchase_date");--> statement-breakpoint
CREATE INDEX "inventory_purchases_item_time_idx" ON "inventory_purchases" USING btree ("inventory_item_id","purchased_at");--> statement-breakpoint
CREATE INDEX "stock_movements_item_time_idx" ON "stock_movements" USING btree ("inventory_item_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_reference_idx" ON "stock_movements" USING btree ("reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "stock_movements_type_time_idx" ON "stock_movements" USING btree ("type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "deal_slot_options_slot_variant_idx" ON "deal_slot_options" USING btree ("slot_id","variant_id");--> statement-breakpoint
CREATE INDEX "deal_slots_deal_idx" ON "deal_slots" USING btree ("deal_variant_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_item_variants_item_name_idx" ON "menu_item_variants" USING btree ("menu_item_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "menu_items_slug_idx" ON "menu_items" USING btree ("slug") WHERE "menu_items"."slug" is not null;--> statement-breakpoint
CREATE INDEX "menu_items_category_sort_idx" ON "menu_items" USING btree ("category_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_variant_item_idx" ON "recipes" USING btree ("variant_id","inventory_item_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "order_items_variant_idx" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_client_id_idx" ON "orders" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_business_date_seq_idx" ON "orders" USING btree ("business_date","daily_seq");--> statement-breakpoint
CREATE INDEX "orders_business_date_status_idx" ON "orders" USING btree ("business_date","status");--> statement-breakpoint
CREATE INDEX "orders_created_by_time_idx" ON "orders" USING btree ("created_by","created_at");--> statement-breakpoint
CREATE INDEX "orders_pending_idx" ON "orders" USING btree ("created_at") WHERE "orders"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "expenses_date_idx" ON "expenses" USING btree ("expense_date");--> statement-breakpoint
CREATE INDEX "expenses_created_by_idx" ON "expenses" USING btree ("created_by","expense_date");