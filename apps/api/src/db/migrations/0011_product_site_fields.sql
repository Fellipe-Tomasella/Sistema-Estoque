ALTER TABLE "products" ADD COLUMN "show_on_site" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "site_price_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "hide_site_price" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "site_description" text;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_site_price_check" CHECK ("products"."site_price_cents" >= 0);