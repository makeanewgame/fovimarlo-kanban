import { t } from "@lingui/core/macro";
import {
  HiMiniChevronDoubleUp,
  HiMiniChevronDown,
  HiMiniMinus,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { CardPriority } from "@kan/shared/constants";
import { cardPriorities } from "@kan/shared/constants";

const PRIORITY_STYLES = {
  high: {
    icon: HiMiniChevronDoubleUp,
    text: "text-red-700 dark:text-red-400",
    background: "bg-red-500/15",
  },
  medium: {
    icon: HiMiniMinus,
    text: "text-amber-700 dark:text-amber-400",
    background: "bg-amber-500/15",
  },
  low: {
    icon: HiMiniChevronDown,
    text: "text-sky-700 dark:text-sky-400",
    background: "bg-sky-500/15",
  },
} as const satisfies Record<CardPriority, unknown>;

export const getPriorityLabel = (priority: CardPriority): string => {
  const labels: Record<CardPriority, string> = {
    high: t`High`,
    medium: t`Medium`,
    low: t`Low`,
  };

  return labels[priority];
};

export const PriorityIcon = ({ priority }: { priority: CardPriority }) => {
  const { icon: Icon, text } = PRIORITY_STYLES[priority];

  return <Icon className={twMerge("h-3.5 w-3.5 flex-shrink-0", text)} />;
};

export const getPriorityOptions = (selected: CardPriority | null | undefined) =>
  [...cardPriorities].reverse().map((priority) => ({
    key: priority,
    value: getPriorityLabel(priority),
    selected: priority === selected,
    leftIcon: <PriorityIcon priority={priority} />,
  }));

const PriorityBadge = ({ priority }: { priority: CardPriority }) => {
  const { background, text } = PRIORITY_STYLES[priority];

  return (
    <span
      className={twMerge(
        "inline-flex w-fit flex-shrink-0 items-center gap-x-0.5 rounded-full py-0.5 pl-1 pr-2 text-[10px] font-medium",
        background,
        text,
      )}
    >
      <PriorityIcon priority={priority} />
      {getPriorityLabel(priority)}
    </span>
  );
};

export default PriorityBadge;
