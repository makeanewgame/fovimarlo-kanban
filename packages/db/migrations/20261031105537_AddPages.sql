CREATE TABLE IF NOT EXISTS "page" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"publicId" varchar(12) NOT NULL,
	"title" varchar(255) DEFAULT '' NOT NULL,
	"content" text,
	"revision" integer DEFAULT 0 NOT NULL,
	"parentId" bigint,
	"workspaceId" bigint NOT NULL,
	"createdBy" uuid,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedBy" uuid,
	"updatedAt" timestamp,
	"deletedAt" timestamp,
	"deletedBy" uuid,
	CONSTRAINT "page_publicId_unique" UNIQUE("publicId")
);
--> statement-breakpoint
ALTER TABLE "page" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page" ADD CONSTRAINT "page_parentId_page_id_fk" FOREIGN KEY ("parentId") REFERENCES "public"."page"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page" ADD CONSTRAINT "page_workspaceId_workspace_id_fk" FOREIGN KEY ("workspaceId") REFERENCES "public"."workspace"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page" ADD CONSTRAINT "page_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page" ADD CONSTRAINT "page_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "page" ADD CONSTRAINT "page_deletedBy_user_id_fk" FOREIGN KEY ("deletedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_workspace_idx" ON "page" USING btree ("workspaceId");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "page_parent_idx" ON "page" USING btree ("parentId");--> statement-breakpoint

-- Existing workspaces already have their roles, so grant them the new permissions
INSERT INTO "workspace_role_permissions" ("workspaceRoleId", "permission", "granted", "createdAt")
SELECT wr.id, p.permission, true, NOW()
FROM "workspace_roles" wr
CROSS JOIN (
  VALUES
    ('page:view'), ('page:create'), ('page:edit'), ('page:delete')
) AS p(permission)
WHERE wr."name" IN ('admin', 'member') AND wr."isSystem" = true
AND NOT EXISTS (
  SELECT 1 FROM "workspace_role_permissions" wrp
  WHERE wrp."workspaceRoleId" = wr.id AND wrp."permission" = p.permission
);
--> statement-breakpoint

INSERT INTO "workspace_role_permissions" ("workspaceRoleId", "permission", "granted", "createdAt")
SELECT wr.id, 'page:view', true, NOW()
FROM "workspace_roles" wr
WHERE wr."name" = 'guest' AND wr."isSystem" = true
AND NOT EXISTS (
  SELECT 1 FROM "workspace_role_permissions" wrp
  WHERE wrp."workspaceRoleId" = wr.id AND wrp."permission" = 'page:view'
);
