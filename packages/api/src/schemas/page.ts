import { z } from "zod";

const pageAuthorSchema = z.object({
  name: z.string().nullable(),
  email: z.string(),
});

// ─── page.all ────────────────────────────────────────────────
export const pageListItemSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  parentPublicId: z.string().nullable(),
});

// ─── page.byPublicId ─────────────────────────────────────────
export const pageDetailSchema = z.object({
  publicId: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  revision: z.number(),
  updatedAt: z.date(),
  updatedBy: pageAuthorSchema.nullable(),
});

// ─── page.create ─────────────────────────────────────────────
export const pageCreateResponseSchema = z.object({
  publicId: z.string(),
  title: z.string(),
});

// ─── page.update ─────────────────────────────────────────────
export const pageUpdateResponseSchema = z.object({
  publicId: z.string(),
  revision: z.number(),
  updatedAt: z.date(),
  updatedBy: pageAuthorSchema,
});
