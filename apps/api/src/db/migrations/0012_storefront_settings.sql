CREATE TABLE "storefront_settings" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"slug" text,
	"title" text,
	"tagline" text,
	"about" text,
	"whatsapp" text,
	"instagram" text,
	"accent_color" text DEFAULT '#7c3aed' NOT NULL,
	"hide_sold_out" boolean DEFAULT false NOT NULL,
	"notify_email" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "storefront_settings_single_row" CHECK ("storefront_settings"."id" = 1)
);
