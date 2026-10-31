ALTER TYPE "public"."source" ADD VALUE 'clickup';--> statement-breakpoint
ALTER TABLE "page" ADD COLUMN "importId" bigint;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page" ADD CONSTRAINT "page_importId_import_id_fk" FOREIGN KEY ("importId") REFERENCES "public"."import"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
