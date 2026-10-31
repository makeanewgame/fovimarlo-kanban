import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useRef, useState } from "react";
import { HiChevronLeft } from "react-icons/hi2";

import type { PageSaveStatus } from "../usePageAutosave";
import type { WorkspaceMember } from "~/components/Editor";
import type { RouterOutputs } from "~/utils/api";
import Avatar from "~/components/Avatar";
import Button from "~/components/Button";
import Editor from "~/components/Editor";
import LoadingSpinner from "~/components/LoadingSpinner";
import { PageHead } from "~/components/PageHead";
import { usePermissions } from "~/hooks/usePermissions";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { usePageAutosave } from "../usePageAutosave";

type Page = RouterOutputs["page"]["byPublicId"];

function SaveStatus({
  status,
  onRetry,
}: {
  status: PageSaveStatus;
  onRetry: () => void;
}) {
  useLingui();

  if (status === "saving") return <span>{t`Saving...`}</span>;
  if (status === "saved") return <span>{t`Saved`}</span>;
  if (status === "error") {
    return (
      <span className="text-red-600 dark:text-red-400">
        {t`Couldn't save.`}{" "}
        <button type="button" className="underline" onClick={onRetry}>
          {t`Try again`}
        </button>
      </span>
    );
  }
  return null;
}

function PageDocument({
  page,
  canEdit,
  workspaceMembers,
  onReload,
}: {
  page: Page;
  canEdit: boolean;
  workspaceMembers: WorkspaceMember[];
  onReload: () => void;
}) {
  const { i18n } = useLingui();
  const { workspace } = useWorkspace();
  const utils = api.useUtils();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(page.title);
  const [content, setContent] = useState(page.content ?? "");
  const [lastEdit, setLastEdit] = useState({
    updatedAt: page.updatedAt,
    updatedBy: page.updatedBy,
  });

  const { status, queueSave, retry } = usePageAutosave({
    pagePublicId: page.publicId,
    initialRevision: page.revision,
    onSaved: ({ updatedAt, updatedBy }) =>
      setLastEdit({ updatedAt, updatedBy }),
  });

  useEffect(() => {
    if (canEdit && !page.title) titleRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    queueSave({ title: value });
    utils.page.all.setData({ workspacePublicId: workspace.publicId }, (pages) =>
      pages?.map((item) =>
        item.publicId === page.publicId ? { ...item, title: value } : item,
      ),
    );
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    queueSave({ content: value });
  };

  const authorName = lastEdit.updatedBy?.name?.trim();

  return (
    <>
      <PageHead
        title={`${title || t`Untitled`} | ${workspace.name ?? t`Workspace`}`}
      />
      {status === "conflict" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <span>
            {t`Someone else changed this page. Your latest edits aren't saved. Copy them if you need them, then reload.`}
          </span>
          <Button variant="secondary" onClick={onReload}>
            {t`Reload`}
          </Button>
        </div>
      )}
      <input
        ref={titleRef}
        type="text"
        value={title}
        maxLength={255}
        readOnly={!canEdit}
        placeholder={t`Untitled`}
        aria-label={t`Page title`}
        onChange={(event) => handleTitleChange(event.target.value)}
        className="w-full border-0 bg-transparent p-0 text-3xl font-bold tracking-tight text-neutral-900 placeholder:text-light-800 focus:outline-none focus:ring-0 dark:text-dark-1000 dark:placeholder:text-dark-700"
      />
      <div className="mb-8 mt-3 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-light-900 dark:text-dark-900">
        {lastEdit.updatedBy && (
          <>
            <Avatar
              size="xs"
              name={authorName ?? ""}
              email={lastEdit.updatedBy.email}
            />
            <span>{authorName || lastEdit.updatedBy.email}</span>
            <span aria-hidden="true">·</span>
          </>
        )}
        <span>
          {t`Last updated ${i18n.date(lastEdit.updatedAt, {
            dateStyle: "medium",
            timeStyle: "short",
          })}`}
        </span>
        {canEdit && <SaveStatus status={status} onRetry={() => void retry()} />}
      </div>
      <Editor
        variant="document"
        content={content}
        onChange={canEdit ? handleContentChange : undefined}
        readOnly={!canEdit}
        workspaceMembers={workspaceMembers}
        enableYouTubeEmbed={false}
        placeholder={t`Write something... (type '/' for commands or '@' to mention)`}
      />
    </>
  );
}

export function PageEditor({ pagePublicId }: { pagePublicId: string }) {
  useLingui();
  const { workspace } = useWorkspace();
  const { canEditPage, isLoading: isLoadingPermissions } = usePermissions();
  const [reloadCount, setReloadCount] = useState(0);

  // The editor reads its mention list once, so it has to wait for the members.
  const { data: workspaceData, isLoading: isLoadingMembers } =
    api.workspace.byId.useQuery(
      { workspacePublicId: workspace.publicId },
      { enabled: !!workspace.publicId },
    );

  // Without a cache a reopened page always loads with its latest revision, and
  // refetches stay off so they can't replace text that's being typed.
  const {
    data: page,
    isLoading,
    error,
    refetch,
  } = api.page.byPublicId.useQuery(
    { pagePublicId },
    {
      gcTime: 0,
      retry: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  );

  const handleReload = async () => {
    await refetch();
    setReloadCount((count) => count + 1);
  };

  return (
    <div className="mx-auto w-full max-w-[860px] px-5 py-6 md:px-12 md:py-12">
      <Link
        href="/pages"
        className="mb-4 inline-flex items-center gap-1 text-sm text-light-900 dark:text-dark-900 md:hidden"
      >
        <HiChevronLeft aria-hidden="true" className="h-4 w-4" />
        {t`Pages`}
      </Link>
      {isLoading || isLoadingPermissions || isLoadingMembers ? (
        <div className="flex justify-center py-16 text-light-900 dark:text-dark-900">
          <LoadingSpinner size="lg" />
        </div>
      ) : !page ? (
        <p className="py-16 text-center text-sm text-light-900 dark:text-dark-900">
          {error?.data?.code === "FORBIDDEN"
            ? t`You don't have permission to view this page.`
            : t`This page doesn't exist or was deleted.`}
        </p>
      ) : (
        <PageDocument
          key={reloadCount}
          page={page}
          canEdit={canEditPage}
          workspaceMembers={(workspaceData?.members ?? []).map((member) => ({
            ...member,
            email: member.email ?? "",
          }))}
          onReload={() => void handleReload()}
        />
      )}
    </div>
  );
}
