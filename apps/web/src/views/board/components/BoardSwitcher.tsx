import Link from "next/link";
import { Menu, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Fragment, useMemo } from "react";
import { HiCheck, HiChevronUpDown, HiStar } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

export default function BoardSwitcher({
  currentBoardPublicId,
  isTemplate,
}: {
  currentBoardPublicId: string;
  isTemplate: boolean;
}) {
  useLingui();
  const { workspace } = useWorkspace();

  const { data: boards } = api.board.all.useQuery(
    {
      workspacePublicId: workspace.publicId,
      type: isTemplate ? "template" : "regular",
    },
    { enabled: !!workspace.publicId },
  );

  const sortedBoards = useMemo(
    () =>
      [...(boards ?? [])].sort(
        (a, b) => Number(b.favorite) - Number(a.favorite),
      ),
    [boards],
  );

  const label = isTemplate ? t`Switch template` : t`Switch board`;

  return (
    <Menu as="div" className="relative">
      <Menu.Button
        aria-label={label}
        title={label}
        className="flex h-7 w-7 items-center justify-center rounded-[5px] text-light-900 hover:bg-light-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-light-600 dark:text-dark-900 dark:hover:bg-dark-200 dark:focus-visible:ring-dark-600"
      >
        <HiChevronUpDown aria-hidden="true" className="h-4 w-4" />
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute left-0 z-[100] mt-1 max-h-80 w-64 origin-top-left overflow-y-auto rounded-md border border-light-200 bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:border-dark-400 dark:bg-dark-300">
          {sortedBoards.map((board) => (
            <Menu.Item key={board.publicId}>
              {({ active }) => (
                <Link
                  href={`/${isTemplate ? "templates" : "boards"}/${board.publicId}`}
                  className={twMerge(
                    "flex items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-sm text-neutral-900 dark:text-dark-950",
                    active && "bg-light-200 dark:bg-dark-400",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{board.name}</span>
                  {board.favorite && (
                    <HiStar
                      aria-hidden="true"
                      className="h-3.5 w-3.5 shrink-0 text-amber-500"
                    />
                  )}
                  {board.publicId === currentBoardPublicId && (
                    <HiCheck
                      aria-label={t`Current board`}
                      className="h-4 w-4 shrink-0"
                    />
                  )}
                </Link>
              )}
            </Menu.Item>
          ))}
        </Menu.Items>
      </Transition>
    </Menu>
  );
}
