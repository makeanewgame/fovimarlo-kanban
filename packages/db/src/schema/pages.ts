import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  bigint,
  bigserial,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { imports } from "./imports";
import { users } from "./users";
import { workspaces } from "./workspaces";

export const pages = pgTable(
  "page",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    publicId: varchar("publicId", { length: 12 }).notNull().unique(),
    title: varchar("title", { length: 255 }).notNull().default(""),
    content: text("content"),
    // Bumped on every save so a stale editor can't overwrite newer work.
    revision: integer("revision").notNull().default(0),
    parentId: bigint("parentId", { mode: "number" }).references(
      (): AnyPgColumn => pages.id,
      { onDelete: "set null" },
    ),
    workspaceId: bigint("workspaceId", { mode: "number" })
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdBy: uuid("createdBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedBy: uuid("updatedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updatedAt"),
    deletedAt: timestamp("deletedAt"),
    deletedBy: uuid("deletedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    importId: bigint("importId", { mode: "number" }).references(
      () => imports.id,
    ),
  },
  (table) => [
    index("page_workspace_idx").on(table.workspaceId),
    index("page_parent_idx").on(table.parentId),
  ],
).enableRLS();

export const pagesRelations = relations(pages, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [pages.workspaceId],
    references: [workspaces.id],
    relationName: "pageWorkspace",
  }),
  createdBy: one(users, {
    fields: [pages.createdBy],
    references: [users.id],
    relationName: "pageCreatedByUser",
  }),
  updatedBy: one(users, {
    fields: [pages.updatedBy],
    references: [users.id],
    relationName: "pageUpdatedByUser",
  }),
  deletedBy: one(users, {
    fields: [pages.deletedBy],
    references: [users.id],
    relationName: "pageDeletedByUser",
  }),
}));
