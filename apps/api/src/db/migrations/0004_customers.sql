CREATE TYPE "public"."document_type" AS ENUM('cpf', 'cnpj');--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"email" text,
	"notes" text,
	"document_type" "document_type",
	"document" text,
	"address" jsonb,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "customers_document_uq" ON "customers" USING btree ("document") WHERE "customers"."document" is not null;--> statement-breakpoint
CREATE INDEX "customers_name_search_idx" ON "customers" USING gin (immutable_unaccent(lower("name")) gin_trgm_ops);