CREATE TYPE "public"."web_order_status" AS ENUM('new', 'contacted', 'converted', 'declined');--> statement-breakpoint
CREATE TABLE "web_order_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"order_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"variant_label" text NOT NULL,
	"unit_price_cents" integer,
	"quantity" integer NOT NULL,
	CONSTRAINT "web_order_items_quantity_check" CHECK ("web_order_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "web_orders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"number" serial NOT NULL,
	"status" "web_order_status" DEFAULT 'new' NOT NULL,
	"customer_name" text NOT NULL,
	"whatsapp" text NOT NULL,
	"email" text,
	"city" text,
	"notes" text,
	"total_cents" integer NOT NULL,
	"has_hidden_prices" boolean DEFAULT false NOT NULL,
	"sale_id" uuid,
	"decline_reason" text,
	"contacted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "web_orders_number_unique" UNIQUE("number"),
	CONSTRAINT "web_orders_total_check" CHECK ("web_orders"."total_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "web_order_items" ADD CONSTRAINT "web_order_items_order_id_web_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."web_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_order_items" ADD CONSTRAINT "web_order_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_orders" ADD CONSTRAINT "web_orders_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "web_order_items_order_idx" ON "web_order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "web_orders_status_idx" ON "web_orders" USING btree ("status","created_at");