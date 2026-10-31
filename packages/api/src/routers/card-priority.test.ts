import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CardPriority } from "@kan/shared/constants";
import * as cardRepo from "@kan/db/repository/card.repo";
import * as cardActivityRepo from "@kan/db/repository/cardActivity.repo";

import { assertCanEdit } from "../utils/permissions";
import { sendWebhooksForWorkspace } from "../utils/webhook";

vi.mock("@kan/db/repository/card.repo", () => ({
  getWorkspaceAndCardIdByCardPublicId: vi.fn(),
  getByPublicId: vi.fn(),
  update: vi.fn(),
  reorder: vi.fn(),
}));
vi.mock("@kan/db/repository/cardActivity.repo", () => ({
  bulkCreate: vi.fn(),
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
  createCardWebhookPayload: vi.fn(() => ({})),
  sendWebhooksForWorkspace: vi.fn(() => Promise.resolve()),
}));

const cardPublicId = "card-12345678";

const updatePriority = async (
  previous: CardPriority | null,
  next: CardPriority | null,
) => {
  const ctx = {
    user: { id: "user-123", name: "Test User", email: "test@example.com" },
    db: {},
  } as never;

  vi.mocked(cardRepo.getByPublicId).mockResolvedValue({
    id: 1,
    publicId: cardPublicId,
    title: "Card",
    description: null,
    listId: 3,
    dueDate: null,
    priority: previous,
    list: { publicId: "list-12345678", name: "Todo" },
  });
  vi.mocked(cardRepo.update).mockResolvedValue({
    id: 1,
    publicId: cardPublicId,
    title: "Card",
    description: null,
    dueDate: null,
    priority: next,
  });

  const { cardRouter } = await import("./card");

  return cardRouter.createCaller(ctx).update({ cardPublicId, priority: next });
};

describe("card priority updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertCanEdit).mockResolvedValue(undefined);
    vi.mocked(cardRepo.getWorkspaceAndCardIdByCardPublicId).mockResolvedValue({
      id: 1,
      createdBy: "user-123",
      workspaceId: 2,
      workspaceVisibility: "private",
      listPublicId: "list-12345678",
      listName: "Todo",
      boardPublicId: "board-1234567",
      boardName: "Board",
    });
    vi.mocked(cardActivityRepo.bulkCreate).mockResolvedValue([]);
    vi.mocked(sendWebhooksForWorkspace).mockResolvedValue(undefined);
  });

  it.each([
    [null, "high", "card.updated.priority.added"],
    ["low", "high", "card.updated.priority.updated"],
    ["medium", null, "card.updated.priority.removed"],
  ] as const)(
    "records %s to %s as %s",
    async (previous, next, expectedActivity) => {
      const result = await updatePriority(previous, next);

      expect(result.priority).toBe(next);
      expect(cardRepo.update).toHaveBeenCalledWith(
        expect.anything(),
        { priority: next },
        { cardPublicId },
      );
      expect(cardActivityRepo.bulkCreate).toHaveBeenCalledWith(
        expect.anything(),
        [
          {
            type: expectedActivity,
            cardId: 1,
            createdBy: "user-123",
            fromPriority: previous ?? undefined,
            toPriority: next ?? undefined,
          },
        ],
      );
    },
  );

  it("records no activity when the priority is unchanged", async () => {
    await updatePriority("high", "high");

    expect(cardActivityRepo.bulkCreate).not.toHaveBeenCalled();
  });

  it("rejects a priority outside the allowed values", async () => {
    await expect(
      updatePriority(null, "urgent" as CardPriority),
    ).rejects.toThrow();

    expect(cardRepo.update).not.toHaveBeenCalled();
  });
});
