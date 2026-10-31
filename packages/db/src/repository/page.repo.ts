import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";

import type { dbClient } from "@kan/db/client";
import { pages } from "@kan/db/schema";
import { generateUID } from "@kan/shared/utils";

export const getAllByWorkspaceId = async (
  db: dbClient,
  workspaceId: number,
) => {
  const rows = await db
    .select({
      id: pages.id,
      publicId: pages.publicId,
      title: pages.title,
      parentId: pages.parentId,
    })
    .from(pages)
    .where(and(eq(pages.workspaceId, workspaceId), isNull(pages.deletedAt)))
    .orderBy(asc(pages.createdAt), asc(pages.id));

  const publicIdById = new Map(rows.map((row) => [row.id, row.publicId]));

  return rows.map((row) => ({
    publicId: row.publicId,
    title: row.title,
    parentPublicId: row.parentId
      ? (publicIdById.get(row.parentId) ?? null)
      : null,
  }));
};

export const getWorkspaceAndPageIdByPagePublicId = (
  db: dbClient,
  pagePublicId: string,
) => {
  return db.query.pages.findFirst({
    columns: {
      id: true,
      workspaceId: true,
    },
    where: and(eq(pages.publicId, pagePublicId), isNull(pages.deletedAt)),
  });
};

export const getByPublicId = (db: dbClient, pagePublicId: string) => {
  return db.query.pages.findFirst({
    columns: {
      publicId: true,
      title: true,
      content: true,
      revision: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      createdBy: {
        columns: {
          name: true,
          email: true,
        },
      },
      updatedBy: {
        columns: {
          name: true,
          email: true,
        },
      },
    },
    where: and(eq(pages.publicId, pagePublicId), isNull(pages.deletedAt)),
  });
};

export const create = async (
  db: dbClient,
  pageInput: {
    title: string;
    workspaceId: number;
    parentId?: number;
    createdBy: string;
  },
) => {
  const [result] = await db
    .insert(pages)
    .values({
      publicId: generateUID(),
      title: pageInput.title,
      workspaceId: pageInput.workspaceId,
      parentId: pageInput.parentId,
      createdBy: pageInput.createdBy,
    })
    .returning({
      publicId: pages.publicId,
      title: pages.title,
    });

  return result;
};

/** Returns undefined when `expectedRevision` is stale. */
export const update = async (
  db: dbClient,
  pageInput: {
    pageId: number;
    title?: string;
    content?: string;
    updatedBy: string;
    expectedRevision: number;
  },
) => {
  const [result] = await db
    .update(pages)
    .set({
      title: pageInput.title,
      content: pageInput.content,
      updatedBy: pageInput.updatedBy,
      updatedAt: new Date(),
      revision: sql`${pages.revision} + 1`,
    })
    .where(
      and(
        eq(pages.id, pageInput.pageId),
        eq(pages.revision, pageInput.expectedRevision),
        isNull(pages.deletedAt),
      ),
    )
    .returning({
      publicId: pages.publicId,
      revision: pages.revision,
      updatedAt: pages.updatedAt,
    });

  return result;
};

export const softDeleteWithDescendants = async (
  db: dbClient,
  args: {
    pageId: number;
    workspaceId: number;
    deletedAt: Date;
    deletedBy: string;
  },
) => {
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ id: pages.id, parentId: pages.parentId })
      .from(pages)
      .where(
        and(eq(pages.workspaceId, args.workspaceId), isNull(pages.deletedAt)),
      );

    // A Set iterates over values added during the loop, so this walks the tree.
    const pageIds = new Set([args.pageId]);
    for (const pageId of pageIds) {
      for (const row of rows) {
        if (row.parentId === pageId) pageIds.add(row.id);
      }
    }

    await tx
      .update(pages)
      .set({ deletedAt: args.deletedAt, deletedBy: args.deletedBy })
      .where(inArray(pages.id, [...pageIds]));

    return pageIds.size;
  });
};
