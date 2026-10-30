CREATE TABLE "daily_closings" (
	"business_date" date PRIMARY KEY NOT NULL,
	"expected_cash_cents" integer NOT NULL,
	"counted_cash_cents" integer NOT NULL,
	"difference_cents" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"notes" text,
	"closed_at" timestamp with time zone NOT NULL,
	"closed_by" uuid
);
--> statement-breakpoint
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;