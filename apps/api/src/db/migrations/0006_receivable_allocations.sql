CREATE TABLE "receivable_allocations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"payment_id" uuid NOT NULL,
	"receivable_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	CONSTRAINT "receivable_allocations_amount_check" CHECK ("receivable_allocations"."amount_cents" > 0)
);
--> statement-breakpoint
ALTER TABLE "receivable_allocations" ADD CONSTRAINT "receivable_allocations_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivable_allocations" ADD CONSTRAINT "receivable_allocations_receivable_id_receivables_id_fk" FOREIGN KEY ("receivable_id") REFERENCES "public"."receivables"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "receivable_allocations_payment_receivable_uq" ON "receivable_allocations" USING btree ("payment_id","receivable_id");--> statement-breakpoint
CREATE INDEX "receivable_allocations_receivable_id_index" ON "receivable_allocations" USING btree ("receivable_id");