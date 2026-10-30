CREATE TYPE "public"."adjustment_reason" AS ENUM('count', 'loss', 'damage', 'error', 'other');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('initial', 'purchase_entry', 'sale', 'sale_cancel_return', 'return_in', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."stock_ref_type" AS ENUM('stock_entry', 'sale', 'return_item', 'import', 'manual');--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"reference" text,
	"category" text,
	"description" text,
	"base_price_cents" integer NOT NULL,
	"cost_cents" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_base_price_check" CHECK ("products"."base_price_cents" >= 0),
	CONSTRAINT "products_cost_check" CHECK ("products"."cost_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "variants" (
	"id" uuid PRIMARY KEY NOT NULL,
	"product_id" uuid NOT NULL,
	"color" text NOT NULL,
	"size" text NOT NULL,
	"size_sort" integer NOT NULL,
	"price_cents" integer,
	"cost_cents" integer,
	"sku" text,
	"stock_qty" integer DEFAULT 0 NOT NULL,
	"min_stock" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "variants_stock_qty_check" CHECK ("variants"."stock_qty" >= 0),
	CONSTRAINT "variants_price_check" CHECK ("variants"."price_cents" >= 0),
	CONSTRAINT "variants_cost_check" CHECK ("variants"."cost_cents" >= 0),
	CONSTRAINT "variants_min_stock_check" CHECK ("variants"."min_stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY NOT NULL,
	"variant_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"quantity_delta" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"adjustment_reason" "adjustment_reason",
	"counted_qty" integer,
	"note" text,
	"ref_type" "stock_ref_type",
	"ref_id" uuid,
	"business_date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_delta_check" CHECK ("stock_movements"."quantity_delta" <> 0),
	CONSTRAINT "stock_movements_balance_check" CHECK ("stock_movements"."balance_after" >= 0)
);
--> statement-breakpoint
ALTER TABLE "variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "products_name_search_idx" ON "products" USING gin (immutable_unaccent(lower("name")) gin_trgm_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "variants_product_color_size_uq" ON "variants" USING btree ("product_id",lower("color"),lower("size"));--> statement-breakpoint
CREATE INDEX "stock_movements_variant_id_created_at_index" ON "stock_movements" USING btree ("variant_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_movements_ref_uq" ON "stock_movements" USING btree ("ref_type","ref_id","variant_id","type") WHERE "stock_movements"."ref_type" in ('sale', 'return_item', 'import');