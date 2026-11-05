CREATE TABLE "hidden_options" (
	"id" uuid PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "hidden_options_kind_ck" CHECK ("hidden_options"."kind" in ('color', 'size', 'category'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX "hidden_options_kind_value_uq" ON "hidden_options" USING btree ("kind",lower("value"));