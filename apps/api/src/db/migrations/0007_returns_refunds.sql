CREATE TYPE "public"."item_condition" AS ENUM('sellable', 'damaged');--> statement-breakpoint
CREATE TYPE "public"."receivable_adjustment_reason" AS ENUM('sale_cancelled', 'items_returned');--> statement-breakpoint
CREATE TYPE "public"."refund_source" AS ENUM('cancellation', 'return');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('pending', 'done', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."return_item_status" AS ENUM('awaiting', 'received');--> statement-breakpoint
CREATE TYPE "public"."return_status" AS ENUM('awaiting_items', 'completed');--> statement-breakpoint
CREATE TYPE "public"."return_type" AS ENUM('cancellation', 'partial_return', 'exchange');--> statement-breakpoint
CREATE TABLE "receivable_adjustments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"receivable_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"reason" "receivable_adjustment_reason" NOT NULL,
	"ref_type" text NOT NULL,
	"ref_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receivable_adjustments_amount_check" CHECK ("receivable_adjustments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sale_id" uuid NOT NULL,
	"source" "refund_source" NOT NULL,
	"source_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "refund_status" DEFAULT 'pending' NOT NULL,
	"method" text,
	"done_at" timestamp with time zone,
	"business_date" date,
	"notes" text,
	"cancel_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_amount_check" CHECK ("refunds"."amount_cents" > 0),
	CONSTRAINT "refunds_method_check" CHECK ("refunds"."method" is null or "refunds"."method" in ('cash', 'pix', 'card'))
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"return_id" uuid NOT NULL,
	"sale_item_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" "return_item_status" NOT NULL,
	"condition" "item_condition",
	"received_at" timestamp with time zone,
	CONSTRAINT "return_items_quantity_check" CHECK ("return_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sale_id" uuid NOT NULL,
	"type" "return_type" NOT NULL,
	"status" "return_status" NOT NULL,
	"reason" text,
	"items_value_cents" integer NOT NULL,
	"applied_to_receivable_cents" integer DEFAULT 0 NOT NULL,
	"refund_cents" integer DEFAULT 0 NOT NULL,
	"exchange_credit_cents" integer DEFAULT 0 NOT NULL,
	"exchange_sale_id" uuid,
	"business_date" date NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receivable_adjustments" ADD CONSTRAINT "receivable_adjustments_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."receivables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_sale_item_id_sale_items_id_fk" FOREIGN KEY ("sale_item_id") REFERENCES "public"."sale_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_exchange_sale_id_sales_id_fk" FOREIGN KEY ("exchange_sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receivable_adjustments_receivable_id_index" ON "receivable_adjustments" USING btree ("receivable_id");--> statement-breakpoint
CREATE INDEX "refunds_status_index" ON "refunds" USING btree ("status");--> statement-breakpoint
CREATE INDEX "refunds_business_date_index" ON "refunds" USING btree ("business_date");--> statement-breakpoint
CREATE INDEX "return_items_return_id_index" ON "return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "returns_sale_id_index" ON "returns" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "returns_status_index" ON "returns" USING btree ("status");