CREATE TYPE "public"."buyer_type" AS ENUM('consumer_pf', 'company_pj');--> statement-breakpoint
CREATE TYPE "public"."card_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."discount_kind" AS ENUM('none', 'amount', 'percent');--> statement-breakpoint
CREATE TYPE "public"."fiscal_requirement" AS ENUM('not_required', 'required', 'review');--> statement-breakpoint
CREATE TYPE "public"."payment_kind" AS ENUM('sale_checkout', 'receivable_receipt', 'exchange_credit');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('cash', 'pix', 'card', 'exchange_credit');--> statement-breakpoint
CREATE TYPE "public"."receivable_origin" AS ENUM('sale', 'previous_balance');--> statement-breakpoint
CREATE TYPE "public"."receivable_status" AS ENUM('open', 'settled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('valid', 'voided');--> statement-breakpoint
CREATE TYPE "public"."sale_payment_status" AS ENUM('paid', 'partially_paid', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."sale_status" AS ENUM('draft', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."shipping_status" AS ENUM('none', 'pending', 'shipped', 'delivered');--> statement-breakpoint
CREATE SEQUENCE "public"."sale_number_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" "payment_kind" NOT NULL,
	"method" "payment_method" NOT NULL,
	"card_type" "card_type",
	"card_installments" integer,
	"amount_cents" integer NOT NULL,
	"sale_id" uuid,
	"customer_id" uuid,
	"business_date" date NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "record_status" DEFAULT 'valid' NOT NULL,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"voided_by" uuid,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payments_amount_check" CHECK ("payments"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "receivables" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"sale_id" uuid,
	"origin" "receivable_origin" NOT NULL,
	"description" text NOT NULL,
	"original_cents" integer NOT NULL,
	"paid_cents" integer DEFAULT 0 NOT NULL,
	"adjusted_cents" integer DEFAULT 0 NOT NULL,
	"balance_cents" integer GENERATED ALWAYS AS (original_cents - paid_cents - adjusted_cents) STORED NOT NULL,
	"due_date" date,
	"status" "receivable_status" DEFAULT 'open' NOT NULL,
	"business_date" date NOT NULL,
	"settled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "receivables_original_check" CHECK ("receivables"."original_cents" > 0),
	CONSTRAINT "receivables_balance_check" CHECK ("receivables"."original_cents" - "receivables"."paid_cents" - "receivables"."adjusted_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "sale_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sale_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"product_name" text NOT NULL,
	"variant_label" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"quantity" integer NOT NULL,
	"line_subtotal_cents" integer NOT NULL,
	"discount_allocated_cents" integer DEFAULT 0 NOT NULL,
	"line_total_cents" integer NOT NULL,
	"returned_qty" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "sale_items_quantity_check" CHECK ("sale_items"."quantity" > 0),
	CONSTRAINT "sale_items_returned_check" CHECK ("sale_items"."returned_qty" >= 0 and "sale_items"."returned_qty" <= "sale_items"."quantity")
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY NOT NULL,
	"number" integer,
	"status" "sale_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"customer_id" uuid,
	"customer_snapshot" jsonb,
	"buyer_type" "buyer_type",
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"discount_kind" "discount_kind" DEFAULT 'none' NOT NULL,
	"discount_value" integer DEFAULT 0 NOT NULL,
	"discount_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"draft_payments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"draft_fiado" boolean DEFAULT false NOT NULL,
	"draft_fiado_due_date" date,
	"payment_status" "sale_payment_status",
	"shipping_status" "shipping_status" DEFAULT 'none' NOT NULL,
	"shipping_address" jsonb,
	"shipping_uf" text,
	"tracking_code" text,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"fiscal_requirement" "fiscal_requirement",
	"fiscal_note" text,
	"fiscal_requested" boolean DEFAULT false NOT NULL,
	"channel" text,
	"notes" text,
	"origin_return_id" uuid,
	"confirmed_at" timestamp with time zone,
	"business_date" date,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"cancelled_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sales_number_unique" UNIQUE("number"),
	CONSTRAINT "sales_discount_check" CHECK ("sales"."discount_cents" >= 0 and "sales"."discount_cents" <= "sales"."subtotal_cents"),
	CONSTRAINT "sales_total_check" CHECK ("sales"."total_cents" = "sales"."subtotal_cents" - "sales"."discount_cents")
);
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivables" ADD CONSTRAINT "receivables_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payments_sale_id_index" ON "payments" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "payments_business_date_index" ON "payments" USING btree ("business_date");--> statement-breakpoint
CREATE UNIQUE INDEX "receivables_sale_uq" ON "receivables" USING btree ("sale_id") WHERE "receivables"."sale_id" is not null;--> statement-breakpoint
CREATE INDEX "receivables_customer_id_status_index" ON "receivables" USING btree ("customer_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_items_sale_variant_uq" ON "sale_items" USING btree ("sale_id","variant_id");--> statement-breakpoint
CREATE INDEX "sales_status_business_date_index" ON "sales" USING btree ("status","business_date");--> statement-breakpoint
CREATE INDEX "sales_customer_id_index" ON "sales" USING btree ("customer_id");