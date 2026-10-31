import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useState } from "react";
import {
  HiChevronDown,
  HiChevronRight,
  HiOutlineDocumentText,
  HiOutlinePlusSmall,
  HiOutlineTrash,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { PageTreeNode } from "../utils";

const actionClassName =
  "flex h-6 w-6 shrink-0 items-center justify-center rounded text-light-900 hover:bg-light-300 focus:opacity-100 dark:text-dark-900 dark:hover:bg-dark-400 md:opacity-0 md:group-hover:opacity-100";

function PageTreeItem({
  page,
  depth,
  selectedPublicId,
  canCreate,
  canDelete,
  onCreateChild,
  onDelete,
}: {
  page: PageTreeNode;
  depth: number;
  selectedPublicId?: string;
  canCreate: boolean;
  canDelete: boolean;
  onCreateChild: (parentPublicId: string) => void;
  onDelete: (page: PageTreeNode) => void;
}) {
  useLingui();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const hasChildren = page.children.length > 0;
  const title = page.title || t`Untitled`;
  const ToggleIcon = isCollapsed ? HiChevronRight : HiChevronDown;

  return (
    <li>
      <div
        style={{ paddingLeft: depth * 16 }}
        className={twMerge(
          "group flex h-8 items-center gap-1 rounded-md pr-1 text-sm text-neutral-700 hover:bg-light-200 dark:text-dark-950 dark:hover:bg-dark-200",
          page.publicId === selectedPublicId &&
            "bg-light-200 font-medium text-neutral-900 dark:bg-dark-200 dark:text-dark-1000",
        )}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? t`Expand ${title}` : t`Collapse ${title}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-light-900 hover:bg-light-300 dark:text-dark-900 dark:hover:bg-dark-400"
          >
            <ToggleIcon aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span className="h-6 w-6 shrink-0" />
        )}
        <Link
          href={`/pages/${page.publicId}`}
          className="flex h-full min-w-0 flex-1 items-center gap-2"
        >
          <HiOutlineDocumentText
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-light-900 dark:text-dark-900"
          />
          <span className="truncate">{title}</span>
        </Link>
        {canCreate && (
          <button
            type="button"
            onClick={() => {
              setIsCollapsed(false);
              onCreateChild(page.publicId);
            }}
            aria-label={t`Add a page inside ${title}`}
            title={t`Add sub-page`}
            className={actionClassName}
          >
            <HiOutlinePlusSmall aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => onDelete(page)}
            aria-label={t`Delete ${title}`}
            title={t`Delete page`}
            className={actionClassName}
          >
            <HiOutlineTrash aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {hasChildren && !isCollapsed && (
        <ul role="list">
          {page.children.map((child) => (
            <PageTreeItem
              key={child.publicId}
              page={child}
              depth={depth + 1}
              selectedPublicId={selectedPublicId}
              canCreate={canCreate}
              canDelete={canDelete}
              onCreateChild={onCreateChild}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function PageTree({
  pages,
  ...itemProps
}: {
  pages: PageTreeNode[];
  selectedPublicId?: string;
  canCreate: boolean;
  canDelete: boolean;
  onCreateChild: (parentPublicId: string) => void;
  onDelete: (page: PageTreeNode) => void;
}) {
  return (
    <ul role="list" className="space-y-0.5">
      {pages.map((page) => (
        <PageTreeItem
          key={page.publicId}
          page={page}
          depth={0}
          {...itemProps}
        />
      ))}
    </ul>
  );
}
