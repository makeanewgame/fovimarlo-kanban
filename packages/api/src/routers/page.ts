import { TRPCError } from "@trpc/server";
import { z } from "zod";

import * as pageRepo from "@kan/db/repository/page.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import {
  pageCreateResponseSchema,
  pageDetailSchema,
  pageListItemSchema,
  pageUpdateResponseSchema,
} from "../schemas";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { assertPermission } from "../utils/permissions";

const MAX_TITLE_LENGTH = 255;
const MAX_CONTENT_LENGTH = 500000;

export const pageRouter = createTRPCRouter({
  all: protectedProcedure
    .meta({
      openapi: {
        summary: "Get all pages",
        method: "GET",
        path: "/workspaces/{workspacePublicId}/pages",
        description: "Retrieves all pages in a workspace",
        tags: ["Pages"],
        protect: true,
      },
    })
    .input(z.object({ workspacePublicId: z.string().min(12) }))
    .output(z.array(pageListItemSchema))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with public ID ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, workspace.id, "page:view");

      return pageRepo.getAllByWorkspaceId(ctx.db, workspace.id);
    }),
  byPublicId: protectedProcedure
    .meta({
      openapi: {
        summary: "Get a page by public ID",
        method: "GET",
        path: "/pages/{pagePublicId}",
        description: "Retrieves a page and its content by its public ID",
        tags: ["Pages"],
        protect: true,
      },
    })
    .input(z.object({ pagePublicId: z.string().min(12) }))
    .output(pageDetailSchema)
    .query(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const page = await pageRepo.getWorkspaceAndPageIdByPagePublicId(
        ctx.db,
        input.pagePublicId,
      );

      if (!page)
        throw new TRPCError({
          message: `Page with public ID ${input.pagePublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, page.workspaceId, "page:view");

      const result = await pageRepo.getByPublicId(ctx.db, input.pagePublicId);

      if (!result)
        throw new TRPCError({
          message: `Page with public ID ${input.pagePublicId} not found`,
          code: "NOT_FOUND",
        });

      return {
        publicId: result.publicId,
        title: result.title,
        content: result.content,
        revision: result.revision,
        updatedAt: result.updatedAt ?? result.createdAt,
        updatedBy: result.updatedBy ?? result.createdBy,
      };
    }),
  create: protectedProcedure
    .meta({
      openapi: {
        summary: "Create a page",
        method: "POST",
        path: "/pages",
        description: "Creates a new page, optionally nested under another page",
        tags: ["Pages"],
        protect: true,
      },
    })
    .input(
      z.object({
        workspacePublicId: z.string().min(12),
        parentPublicId: z.string().min(12).optional(),
        title: z.string().max(MAX_TITLE_LENGTH).optional(),
      }),
    )
    .output(pageCreateResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const workspace = await workspaceRepo.getByPublicId(
        ctx.db,
        input.workspacePublicId,
      );

      if (!workspace)
        throw new TRPCError({
          message: `Workspace with public ID ${input.workspacePublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, workspace.id, "page:create");

      const parent = input.parentPublicId
        ? await pageRepo.getWorkspaceAndPageIdByPagePublicId(
            ctx.db,
            input.parentPublicId,
          )
        : undefined;

      if (input.parentPublicId && parent?.workspaceId !== workspace.id)
        throw new TRPCError({
          message: `Page with public ID ${input.parentPublicId} not found`,
          code: "NOT_FOUND",
        });

      const result = await pageRepo.create(ctx.db, {
        title: input.title ?? "",
        workspaceId: workspace.id,
        parentId: parent?.id,
        createdBy: userId,
      });

      if (!result)
        throw new TRPCError({
          message: `Failed to create page`,
          code: "INTERNAL_SERVER_ERROR",
        });

      return result;
    }),
  update: protectedProcedure
    .meta({
      openapi: {
        summary: "Update a page",
        method: "PUT",
        path: "/pages/{pagePublicId}",
        description:
          "Updates a page's title or content. Fails with a conflict if the page changed after expectedRevision was read.",
        tags: ["Pages"],
        protect: true,
      },
    })
    .input(
      z.object({
        pagePublicId: z.string().min(12),
        title: z.string().max(MAX_TITLE_LENGTH).optional(),
        content: z.string().max(MAX_CONTENT_LENGTH).optional(),
        expectedRevision: z.number().int().min(0),
      }),
    )
    .output(pageUpdateResponseSchema)
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const page = await pageRepo.getWorkspaceAndPageIdByPagePublicId(
        ctx.db,
        input.pagePublicId,
      );

      if (!page)
        throw new TRPCError({
          message: `Page with public ID ${input.pagePublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, page.workspaceId, "page:edit");

      const result = await pageRepo.update(ctx.db, {
        pageId: page.id,
        title: input.title,
        content: input.content,
        updatedBy: userId,
        expectedRevision: input.expectedRevision,
      });

      if (!result?.updatedAt)
        throw new TRPCError({
          message: `This page was changed by someone else`,
          code: "CONFLICT",
        });

      return {
        publicId: result.publicId,
        revision: result.revision,
        updatedAt: result.updatedAt,
        updatedBy: {
          name: ctx.user?.name ?? null,
          email: ctx.user?.email ?? "",
        },
      };
    }),
  delete: protectedProcedure
    .meta({
      openapi: {
        summary: "Delete a page",
        method: "DELETE",
        path: "/pages/{pagePublicId}",
        description: "Deletes a page and all of its sub-pages",
        tags: ["Pages"],
        protect: true,
      },
    })
    .input(z.object({ pagePublicId: z.string().min(12) }))
    .output(z.object({ success: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id;

      if (!userId)
        throw new TRPCError({
          message: `User not authenticated`,
          code: "UNAUTHORIZED",
        });

      const page = await pageRepo.getWorkspaceAndPageIdByPagePublicId(
        ctx.db,
        input.pagePublicId,
      );

      if (!page)
        throw new TRPCError({
          message: `Page with public ID ${input.pagePublicId} not found`,
          code: "NOT_FOUND",
        });
      await assertPermission(ctx.db, userId, page.workspaceId, "page:delete");

      await pageRepo.softDeleteWithDescendants(ctx.db, {
        pageId: page.id,
        workspaceId: page.workspaceId,
        deletedAt: new Date(),
        deletedBy: userId,
      });

      return { success: true };
    }),
});
