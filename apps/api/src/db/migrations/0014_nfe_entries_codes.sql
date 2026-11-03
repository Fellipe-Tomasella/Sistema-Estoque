CREATE TABLE "supplier_item_links" (
	"id" uuid PRIMARY KEY NOT NULL,
	"supplier_document" text NOT NULL,
	"supplier_code" text NOT NULL,
	"variant_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "barcode" text;--> statement-breakpoint
ALTER TABLE "stock_entries" ADD COLUMN "nfe_access_key" text;--> statement-breakpoint
ALTER TABLE "supplier_item_links" ADD CONSTRAINT "supplier_item_links_variant_id_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_item_links_uq" ON "supplier_item_links" USING btree ("supplier_document","supplier_code");--> statement-breakpoint
CREATE UNIQUE INDEX "variants_barcode_uq" ON "variants" USING btree ("barcode");--> statement-breakpoint
ALTER TABLE "stock_entries" ADD CONSTRAINT "stock_entries_nfeAccessKey_unique" UNIQUE("nfe_access_key");--> statement-breakpoint
-- Código padrão do produto (RN-PRO-15): sequência P00001, P00002… e preenchimento dos que estão sem referência.
CREATE SEQUENCE IF NOT EXISTS "product_code_seq";--> statement-breakpoint
UPDATE "products" p SET "reference" = 'P' || lpad(nextval('product_code_seq')::text, 5, '0')
  FROM (SELECT "id" FROM "products" WHERE "reference" IS NULL ORDER BY "created_at", "id") o
  WHERE p."id" = o."id";
