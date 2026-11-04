import Link from "next/link";
import { t } from "@lingui/core/macro";
import { format, isBefore, isSameYear, startOfDay } from "date-fns";
import { HiOutlineClock } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { PageHead } from "~/components/PageHead";
import PriorityBadge from "~/components/PriorityBadge";
import { useLocalisation } from "~/hooks/useLocalisation";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export default function AssignedView() {
  const { workspace } = useWorkspace();
  const { dateLocale } = useLocalisation();

  const { data: cards, isLoading } = api.card.assignedToMe.useQuery(
    { workspacePublicId: workspace.publicId },
    { enabled: !!workspace.publicId && workspace.publicId.length >= 12 },
  );

  // Cards arrive ordered by board name, so grouping preserves that order
  const boards = new Map<
    string,
    { boardName: string; cards: NonNullable<typeof cards> }
  >();
  for (const card of cards ?? []) {
    const group = boards.get(card.boardPublicId) ?? {
      boardName: card.boardName,
      cards: [],
    };
    group.cards.push(card);
    boards.set(card.boardPublicId, group);
  }

  return (
    <>
      <PageHead title={t`Assigned to me | ${workspace.name}`} />
      <div className="m-auto h-full max-w-[1100px] p-8 px-5 md:px-28 md:py-12">
        <div className="mb-8 flex w-full items-center justify-between">
          <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
            {t`Assigned to me`}
          </h1>
          {cards && cards.length > 0 && (
            <span className="text-sm text-light-900 dark:text-dark-900">
              {t`${cards.length} cards`}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-12 animate-pulse rounded-lg bg-light-200 dark:bg-dark-200"
              />
            ))}
          </div>
        ) : boards.size === 0 ? (
          <p className="text-sm text-light-900 dark:text-dark-900">
            {t`No cards are assigned to you yet.`}
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {[...boards].map(([boardPublicId, group]) => (
              <section key={boardPublicId}>
                <Link
                  href={`/boards/${boardPublicId}`}
                  className="mb-2 inline-block text-sm font-semibold text-light-1000 hover:underline dark:text-dark-1000"
                >
                  {group.boardName}
                </Link>
                <ul className="flex flex-col divide-y divide-light-300 overflow-hidden rounded-lg border border-light-300 dark:divide-dark-300 dark:border-dark-300">
                  {group.cards.map((card) => {
                    const isOverdue = card.dueDate
                      ? isBefore(card.dueDate, startOfDay(new Date()))
                      : false;
                    return (
                      <li key={card.publicId}>
                        <Link
                          href={`/cards/${card.publicId}`}
                          className="flex items-center gap-3 bg-light-50 px-4 py-3 transition-colors hover:bg-light-100 dark:bg-dark-50 dark:hover:bg-dark-100"
                        >
                          {card.cardPrefix && card.cardNumber != null && (
                            <span className="flex-shrink-0 text-xs text-light-900 dark:text-dark-900">
                              {card.cardPrefix}-{card.cardNumber}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-sm text-light-1000 dark:text-dark-1000">
                            {card.title}
                          </span>
                          {card.priority && (
                            <PriorityBadge priority={card.priority} />
                          )}
                          {card.dueDate && (
                            <span
                              className={twMerge(
                                "flex flex-shrink-0 items-center gap-1 text-xs",
                                isOverdue
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-light-900 dark:text-dark-900",
                              )}
                            >
                              <HiOutlineClock className="h-4 w-4" />
                              {format(
                                card.dueDate,
                                isSameYear(card.dueDate, new Date())
                                  ? "do MMM"
                                  : "do MMM yyyy",
                                { locale: dateLocale },
                              )}
                            </span>
                          )}
                          <span className="hidden flex-shrink-0 rounded-full bg-light-200 px-2 py-0.5 text-xs text-light-1000 dark:bg-dark-200 dark:text-dark-1000 sm:inline">
                            {card.listName}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
