CREATE TYPE "public"."fiscal_doc_status" AS ENUM('registered', 'cancel_pending', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."fiscal_doc_type" AS ENUM('nfe', 'nfce', 'nfa_e', 'other');--> statement-breakpoint
CREATE TABLE "fiscal_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"sale_id" uuid NOT NULL,
	"doc_type" "fiscal_doc_type" NOT NULL,
	"number" text NOT NULL,
	"series" text,
	"access_key" text,
	"issued_at" date NOT NULL,
	"status" "fiscal_doc_status" DEFAULT 'registered' NOT NULL,
	"cancelled_at" date,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiscal_documents" ADD CONSTRAINT "fiscal_documents_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fiscal_documents_sale_id_index" ON "fiscal_documents" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "fiscal_documents_status_index" ON "fiscal_documents" USING btree ("status");