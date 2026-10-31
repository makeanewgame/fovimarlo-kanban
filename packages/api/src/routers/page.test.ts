import { beforeEach, describe, expect, it, vi } from "vitest";

import * as pageRepo from "@kan/db/repository/page.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";

import { assertPermission } from "../utils/permissions";
import { pageRouter } from "./page";

vi.mock("@kan/db/repository/page.repo", () => ({
  create: vi.fn(),
  getAllByWorkspaceId: vi.fn(),
  getByPublicId: vi.fn(),
  getWorkspaceAndPageIdByPagePublicId: vi.fn(),
  softDeleteWithDescendants: vi.fn(),
  update: vi.fn(),
}));
vi.mock("@kan/db/repository/workspace.repo", () => ({
  getByPublicId: vi.fn(),
}));
vi.mock("../utils/permissions", () => ({
  assertPermission: vi.fn(),
}));

const workspacePublicId = "workspace-123";
const pagePublicId = "page-12345678";
const parentPublicId = "page-87654321";

const caller = pageRouter.createCaller({
  user: { id: "user-123", name: "Test User", email: "test@example.com" },
  db: {},
} as never);

const mockWorkspace = (id: number) =>
  vi.mocked(workspaceRepo.getByPublicId).mockResolvedValue({
    id,
    publicId: workspacePublicId,
    name: "Workspace",
    plan: "free",
    slug: "workspace",
    deletedAt: null,
    createdBy: "user-123",
  });

describe("page router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertPermission).mockResolvedValue(undefined);
    vi.mocked(pageRepo.getWorkspaceAndPageIdByPagePublicId).mockResolvedValue({
      id: 7,
      workspaceId: 1,
    });
  });

  it("requires page:view to list pages", async () => {
    mockWorkspace(1);
    vi.mocked(assertPermission).mockRejectedValue(new Error("forbidden"));

    await expect(caller.all({ workspacePublicId })).rejects.toThrow();

    expect(assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      1,
      "page:view",
    );
    expect(pageRepo.getAllByWorkspaceId).not.toHaveBeenCalled();
  });

  it("nests a new page under a parent from the same workspace", async () => {
    mockWorkspace(1);
    vi.mocked(pageRepo.create).mockResolvedValue({
      publicId: pagePublicId,
      title: "",
    });

    await caller.create({ workspacePublicId, parentPublicId });

    expect(pageRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ parentId: 7, workspaceId: 1, title: "" }),
    );
  });

  it("rejects a parent page from another workspace", async () => {
    mockWorkspace(2);

    await expect(
      caller.create({ workspacePublicId, parentPublicId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(pageRepo.create).not.toHaveBeenCalled();
  });

  it("rejects a parent page that doesn't exist", async () => {
    mockWorkspace(1);
    vi.mocked(pageRepo.getWorkspaceAndPageIdByPagePublicId).mockResolvedValue(
      undefined,
    );

    await expect(
      caller.create({ workspacePublicId, parentPublicId }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("checks page:edit against the page's own workspace", async () => {
    vi.mocked(assertPermission).mockRejectedValue(new Error("forbidden"));

    await expect(
      caller.update({ pagePublicId, content: "<p>x</p>", expectedRevision: 0 }),
    ).rejects.toThrow();

    expect(assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      1,
      "page:edit",
    );
    expect(pageRepo.update).not.toHaveBeenCalled();
  });

  it("reports a conflict when the revision is stale", async () => {
    vi.mocked(pageRepo.update).mockResolvedValue(undefined);

    await expect(
      caller.update({ pagePublicId, content: "<p>x</p>", expectedRevision: 3 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("returns the new revision after saving", async () => {
    const updatedAt = new Date();
    vi.mocked(pageRepo.update).mockResolvedValue({
      publicId: pagePublicId,
      revision: 4,
      updatedAt,
    });

    await expect(
      caller.update({ pagePublicId, title: "Logo", expectedRevision: 3 }),
    ).resolves.toEqual({
      publicId: pagePublicId,
      revision: 4,
      updatedAt,
      updatedBy: { name: "Test User", email: "test@example.com" },
    });

    expect(pageRepo.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        pageId: 7,
        title: "Logo",
        content: undefined,
        expectedRevision: 3,
      }),
    );
  });

  it("falls back to the creator for a page nobody has edited", async () => {
    const createdAt = new Date();
    vi.mocked(pageRepo.getByPublicId).mockResolvedValue({
      publicId: pagePublicId,
      title: "Logo",
      content: null,
      revision: 0,
      createdAt,
      updatedAt: null,
      createdBy: { name: "Creator", email: "creator@example.com" },
      updatedBy: null,
    });

    await expect(caller.byPublicId({ pagePublicId })).resolves.toMatchObject({
      updatedAt: createdAt,
      updatedBy: { name: "Creator" },
    });
  });

  it("requires page:delete to delete a page", async () => {
    vi.mocked(assertPermission).mockRejectedValue(new Error("forbidden"));

    await expect(caller.delete({ pagePublicId })).rejects.toThrow();

    expect(assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      1,
      "page:delete",
    );
    expect(pageRepo.softDeleteWithDescendants).not.toHaveBeenCalled();
  });
});
