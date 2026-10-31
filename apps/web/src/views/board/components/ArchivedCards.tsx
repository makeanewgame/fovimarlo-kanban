import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import { HiXMark } from "react-icons/hi2";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import LoadingSpinner from "~/components/LoadingSpinner";
import { useLocalisation } from "~/hooks/useLocalisation";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const PAGE_SIZE = 50;

export function ArchivedCards({ boardPublicId }: { boardPublicId: string }) {
  useLingui();
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const { canDeleteCard } = usePermissions();
  const { dateLocale } = useLocalisation();
  const { data: sessionData } = authClient.useSession();
  const utils = api.useUtils();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data, isLoading } = api.card.archived.useQuery(
    { boardPublicId, limit },
    { enabled: !!boardPublicId, placeholderData: (previous) => previous },
  );

  const unarchiveCard = api.card.unarchive.useMutation({
    onSuccess: async ({ listName, movedToDefaultList }) => {
      showPopup({
        header: t`Card restored`,
        message: movedToDefaultList
          ? t`Its list no longer exists, so it was added to ${listName}.`
          : t`It's back in ${listName}.`,
        icon: "success",
      });
      await Promise.all([
        utils.card.archived.invalidate({ boardPublicId }),
        utils.board.byId.invalidate({ boardPublicId }),
      ]);
    },
    onError: (error) => {
      showPopup({
        header: t`Unable to restore card`,
        message:
          error.data?.code === "PRECONDITION_FAILED"
            ? t`This board has no lists. Add a list, then restore the card.`
            : t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const cards = data?.cards ?? [];

  return (
    <div className="p-5">
      <div className="flex items-center justify-between pb-4">
        <h2 className="text-md font-medium text-neutral-900 dark:text-dark-1000">
          {t`Archived cards`}
        </h2>
        <button
          type="button"
          onClick={closeModal}
          aria-label={t`Close`}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md text-light-900 hover:bg-light-200 focus:outline-none dark:text-dark-900 dark:hover:bg-dark-200"
        >
          <HiXMark aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-8 text-light-900 dark:text-dark-900">
          <LoadingSpinner />
        </div>
      ) : cards.length === 0 ? (
        <p className="py-8 text-center text-sm text-light-900 dark:text-dark-900">
          {t`No archived cards.`}
        </p>
      ) : (
        <ul
          role="list"
          className="max-h-[60vh] divide-y divide-light-300 overflow-y-auto dark:divide-dark-300"
        >
          {cards.map((card) => {
            const canRestore =
              canDeleteCard || card.createdBy === sessionData?.user.id;
            const archivedAgo = formatDistanceToNow(card.archivedAt, {
              addSuffix: true,
              locale: dateLocale,
            });

            return (
              <li
                key={card.publicId}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-dark-1000">
                    {card.title}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-light-900 dark:text-dark-900">
                    {card.isListDeleted
                      ? t`${card.listName} (deleted list)`
                      : card.listName}
                    {" · "}
                    {card.archivedBy
                      ? t`Archived ${archivedAgo} by ${card.archivedBy}`
                      : t`Archived ${archivedAgo}`}
                  </p>
                </div>
                {canRestore && (
                  <Button
                    variant="secondary"
                    size="sm"
                    aria-label={t`Restore ${card.title}`}
                    disabled={unarchiveCard.isPending}
                    onClick={() =>
                      unarchiveCard.mutate({ cardPublicId: card.publicId })
                    }
                  >
                    {t`Restore`}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {data?.hasMore && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={() => setLimit(limit + PAGE_SIZE)}
            className="text-sm font-medium text-light-900 hover:text-light-1000 dark:text-dark-800 dark:hover:text-dark-1000"
          >
            {t`Load more`}
          </button>
        </div>
      )}
    </div>
  );
}
