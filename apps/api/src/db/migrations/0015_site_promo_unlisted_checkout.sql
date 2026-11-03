ALTER TABLE "products" ADD COLUMN "site_compare_at_cents" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "site_unlisted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "storefront_settings" ADD COLUMN "checkout_notice" text;--> statement-breakpoint
ALTER TABLE "storefront_settings" ADD COLUMN "notes_label" text;--> statement-breakpoint
ALTER TABLE "storefront_settings" ADD COLUMN "notes_required" boolean DEFAULT false NOT NULL;