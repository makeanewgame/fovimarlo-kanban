import { t } from "@lingui/core/macro";
import { HiMiniPlus } from "react-icons/hi2";

import type { CardPriority } from "@kan/shared/constants";

import CheckboxDropdown from "~/components/CheckboxDropdown";
import PriorityBadge, { getPriorityOptions } from "~/components/PriorityBadge";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

interface PrioritySelectorProps {
  cardPublicId: string;
  priority: CardPriority | null | undefined;
  isLoading: boolean;
  disabled?: boolean;
}

export default function PrioritySelector({
  cardPublicId,
  priority,
  isLoading,
  disabled = false,
}: PrioritySelectorProps) {
  const utils = api.useUtils();

  const { showPopup } = usePopup();

  const updateCardPriority = api.card.update.useMutation({
    onMutate: async (update) => {
      await utils.card.byId.cancel();

      const previousCard = utils.card.byId.getData({ cardPublicId });

      utils.card.byId.setData({ cardPublicId }, (oldCard) => {
        if (!oldCard) return oldCard;

        return {
          ...oldCard,
          priority:
            update.priority !== undefined ? update.priority : oldCard.priority,
        };
      });

      return { previousCard };
    },
    onError: (_error, _update, context) => {
      utils.card.byId.setData({ cardPublicId }, context?.previousCard);
      showPopup({
        header: t`Unable to update priority`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      await invalidateCard(utils, cardPublicId);
      await utils.board.byId.invalidate();
    },
  });

  return (
    <>
      {isLoading ? (
        <div className="flex w-full">
          <div className="h-full w-[150px] animate-pulse rounded-[5px] bg-light-300 dark:bg-dark-300" />
        </div>
      ) : (
        <CheckboxDropdown
          items={getPriorityOptions(priority)}
          handleSelect={(_, item) => {
            // Choosing the current priority again clears it.
            updateCardPriority.mutate({
              cardPublicId,
              priority:
                item.key === priority ? null : (item.key as CardPriority),
            });
          }}
          disabled={disabled}
          asChild
          ariaLabel={t`Priority`}
        >
          <div
            className={`flex h-full w-full items-center rounded-[5px] border-[1px] border-light-50 py-1 pl-2 text-left text-xs text-neutral-900 dark:border-dark-50 dark:text-dark-1000 ${disabled ? "cursor-not-allowed opacity-60" : "hover:border-light-300 hover:bg-light-200 dark:hover:border-dark-200 dark:hover:bg-dark-100"}`}
          >
            {priority ? (
              <PriorityBadge priority={priority} />
            ) : (
              <>
                <HiMiniPlus size={22} className="pr-2" />
                {t`Set priority`}
              </>
            )}
          </div>
        </CheckboxDropdown>
      )}
    </>
  );
}
