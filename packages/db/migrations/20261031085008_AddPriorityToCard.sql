CREATE TYPE "public"."card_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.priority.added' BEFORE 'card.archived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.priority.updated' BEFORE 'card.archived';--> statement-breakpoint
ALTER TYPE "public"."card_activity_type" ADD VALUE 'card.updated.priority.removed' BEFORE 'card.archived';--> statement-breakpoint
ALTER TABLE "card_activity" ADD COLUMN "fromPriority" "card_priority";--> statement-breakpoint
ALTER TABLE "card_activity" ADD COLUMN "toPriority" "card_priority";--> statement-breakpoint
ALTER TABLE "card" ADD COLUMN "priority" "card_priority";