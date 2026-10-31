import { beforeEach, describe, expect, it, vi } from "vitest";

import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";

import { assertCanDelete, assertPermission } from "../utils/permissions";
import { sendWebhooksForWorkspace } from "../utils/webhook";
import { cardRouter } from "./card";

vi.mock("@kan/db/repository/card.repo", () => ({
  getArchivedByBoardId: vi.fn(),
  getBoardForArchivedCards: vi.fn(),
  getByPublicId: vi.fn(),
  getWorkspaceAndCardIdByArchivedCardPublicId: vi.fn(),
  unarchive: vi.fn(),
}));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({
  create: vi.fn(),
}));
vi.mock("../utils/notifications", () => ({
  sendMentionEmails: vi.fn(),
}));
vi.mock("../utils/permissions", () => ({
  assertCanDelete: vi.fn(),
  assertCanEdit: vi.fn(),
  assertPermission: vi.fn(),
}));
vi.mock("../utils/webhook", () => ({
  createCardWebhookPayload: vi.fn((event: string) => ({ event })),
  sendWebhooksForWorkspace: vi.fn(() => Promise.resolve()),
}));

const cardPublicId = "card-12345678";
const boardPublicId = "board-1234567";

const caller = cardRouter.createCaller({
  user: { id: "user-123", name: "Test User", email: "test@example.com" },
  db: {},
} as never);

const planned = { id: 3, publicId: "list-planned1", name: "Planned" };

describe("archived cards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertCanDelete).mockResolvedValue(undefined);
    vi.mocked(assertPermission).mockResolvedValue(undefined);
    vi.mocked(
      cardRepo.getWorkspaceAndCardIdByArchivedCardPublicId,
    ).mockResolvedValue({
      id: 1,
      createdBy: "user-456",
      boardId: 2,
      boardPublicId,
      boardName: "Board",
      workspaceId: 9,
    });
    vi.mocked(cardRepo.getByPublicId).mockResolvedValue({
      id: 1,
      publicId: cardPublicId,
      title: "Card",
      description: null,
      dueDate: null,
      priority: null,
    } as never);
  });

  it("requires card:view to list a board's archived cards", async () => {
    vi.mocked(cardRepo.getBoardForArchivedCards).mockResolvedValue({
      id: 2,
      workspaceId: 9,
    });
    vi.mocked(assertPermission).mockRejectedValue(new Error("forbidden"));

    await expect(caller.archived({ boardPublicId })).rejects.toThrow();

    expect(assertPermission).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      9,
      "card:view",
    );
    expect(cardRepo.getArchivedByBoardId).not.toHaveBeenCalled();
  });

  it("flags cards whose list was deleted", async () => {
    vi.mocked(cardRepo.getBoardForArchivedCards).mockResolvedValue({
      id: 2,
      workspaceId: 9,
    });
    const archivedAt = new Date();
    vi.mocked(cardRepo.getArchivedByBoardId).mockResolvedValue({
      cards: [
        {
          publicId: cardPublicId,
          title: "Card",
          createdBy: null,
          archivedAt,
          archivedByName: null,
          archivedByEmail: "a@example.com",
          listName: "Old",
          listDeletedAt: new Date(),
        },
      ],
      hasMore: false,
    });

    await expect(caller.archived({ boardPublicId })).resolves.toEqual({
      cards: [
        {
          publicId: cardPublicId,
          title: "Card",
          createdBy: null,
          archivedAt,
          archivedBy: "a@example.com",
          listName: "Old",
          isListDeleted: true,
        },
      ],
      hasMore: false,
    });
  });

  it("restores a card to its original list and logs it", async () => {
    vi.mocked(cardRepo.unarchive).mockResolvedValue({
      list: planned,
      originalListId: planned.id,
    });

    await expect(caller.unarchive({ cardPublicId })).resolves.toEqual({
      publicId: cardPublicId,
      listName: "Planned",
      movedToDefaultList: false,
    });

    expect(cardActivityRepo.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        type: "card.unarchived",
        cardId: 1,
        toListId: planned.id,
      }),
    );
    expect(sendWebhooksForWorkspace).toHaveBeenCalledWith(
      expect.anything(),
      9,
      { event: "card.created" },
    );
  });

  it("reports when the card landed in a default list", async () => {
    vi.mocked(cardRepo.unarchive).mockResolvedValue({
      list: planned,
      originalListId: 99,
    });

    await expect(caller.unarchive({ cardPublicId })).resolves.toMatchObject({
      movedToDefaultList: true,
    });
  });

  it("explains that a board without lists can't take the card", async () => {
    vi.mocked(cardRepo.unarchive).mockResolvedValue({
      list: null,
      originalListId: 99,
    });

    await expect(caller.unarchive({ cardPublicId })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
    });

    expect(cardActivityRepo.create).not.toHaveBeenCalled();
    expect(sendWebhooksForWorkspace).not.toHaveBeenCalled();
  });

  it("rejects a card that isn't archived", async () => {
    vi.mocked(
      cardRepo.getWorkspaceAndCardIdByArchivedCardPublicId,
    ).mockResolvedValue(undefined);

    await expect(caller.unarchive({ cardPublicId })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });

    expect(cardRepo.unarchive).not.toHaveBeenCalled();
  });

  it("applies the same permission as deleting a card", async () => {
    vi.mocked(assertCanDelete).mockRejectedValue(new Error("forbidden"));

    await expect(caller.unarchive({ cardPublicId })).rejects.toThrow();

    expect(assertCanDelete).toHaveBeenCalledWith(
      expect.anything(),
      "user-123",
      9,
      "card:delete",
      "user-456",
    );
    expect(cardRepo.unarchive).not.toHaveBeenCalled();
  });
});
