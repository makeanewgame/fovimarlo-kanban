import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useMemo } from "react";
import { HiOutlinePlusSmall } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { PageTreeNode } from "./utils";
import LoadingSpinner from "~/components/LoadingSpinner";
import Modal from "~/components/modal";
import { PageHead } from "~/components/PageHead";
import { Tooltip } from "~/components/Tooltip";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { DeletePageConfirmation } from "./components/DeletePageConfirmation";
import { PageEditor } from "./components/PageEditor";
import { PageTree } from "./components/PageTree";
import { buildPageTree, getDescendantPublicIds } from "./utils";

export default function PagesView() {
  useLingui();
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { canCreatePage, canDeletePage } = usePermissions();
  const { openModal, modalContentType, isOpen, entityId, entityLabel } =
    useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  const selectedPublicId = Array.isArray(router.query.pagePublicId)
    ? router.query.pagePublicId[0]
    : undefined;

  const listInput = { workspacePublicId: workspace.publicId };

  const { data: pages, isLoading } = api.page.all.useQuery(listInput, {
    enabled: !!workspace.publicId,
  });

  const pageTree = useMemo(() => buildPageTree(pages ?? []), [pages]);

  const createPage = api.page.create.useMutation({
    onSuccess: async ({ publicId }) => {
      await utils.page.all.invalidate(listInput);
      await router.push(`/pages/${publicId}`);
    },
    onError: () =>
      showPopup({
        header: t`Unable to create page`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      }),
  });

  const handleCreate = (parentPublicId?: string) => {
    if (createPage.isPending) return;
    createPage.mutate({
      workspacePublicId: workspace.publicId,
      parentPublicId,
    });
  };

  const handleDelete = (page: PageTreeNode) => {
    openModal("DELETE_PAGE", page.publicId, page.title || t`Untitled`);
  };

  const pendingDeleteDescendants = getDescendantPublicIds(
    pages ?? [],
    entityId,
  );

  const handleDeleted = async () => {
    const isSelectionGone =
      selectedPublicId === entityId ||
      (!!selectedPublicId &&
        pendingDeleteDescendants.includes(selectedPublicId));

    if (isSelectionGone) await router.push("/pages");
    await utils.page.all.invalidate(listInput);
  };

  return (
    <>
      <PageHead title={t`Pages | ${workspace.name ?? t`Workspace`}`} />
      <div className="flex h-full min-h-0 w-full">
        <aside
          className={twMerge(
            "w-full shrink-0 overflow-y-auto border-light-300 p-3 dark:border-dark-300 md:block md:w-72 md:border-r",
            selectedPublicId && "hidden",
          )}
        >
          <div className="mb-2 flex h-8 items-center justify-between pl-2 pr-1">
            <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-dark-1000">
              {t`Pages`}
            </h1>
            <Tooltip
              content={
                canCreatePage ? t`New page` : t`You don't have permission`
              }
            >
              <button
                type="button"
                onClick={() => handleCreate()}
                disabled={!canCreatePage}
                aria-label={t`New page`}
                className="flex h-6 w-6 items-center justify-center rounded text-light-900 hover:bg-light-200 disabled:cursor-not-allowed disabled:opacity-50 dark:text-dark-900 dark:hover:bg-dark-300"
              >
                <HiOutlinePlusSmall aria-hidden="true" className="h-5 w-5" />
              </button>
            </Tooltip>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-8 text-light-900 dark:text-dark-900">
              <LoadingSpinner />
            </div>
          ) : (
            <PageTree
              pages={pageTree}
              selectedPublicId={selectedPublicId}
              canCreate={canCreatePage}
              canDelete={canDeletePage}
              onCreateChild={handleCreate}
              onDelete={handleDelete}
            />
          )}
          {!isLoading && pageTree.length === 0 && (
            <p className="px-2 py-4 text-sm text-light-900 dark:text-dark-900">
              {t`No pages yet.`}
            </p>
          )}
        </aside>
        <section
          className={twMerge(
            "min-w-0 flex-1 overflow-y-auto md:block",
            !selectedPublicId && "hidden",
          )}
        >
          {selectedPublicId ? (
            <PageEditor
              key={selectedPublicId}
              pagePublicId={selectedPublicId}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-light-900 dark:text-dark-900">
              {pageTree.length > 0
                ? t`Select a page to start reading.`
                : t`Create your first page to keep briefs, notes and checklists next to your boards.`}
            </div>
          )}
        </section>
      </div>
      <Modal
        modalSize="sm"
        isVisible={isOpen && modalContentType === "DELETE_PAGE"}
      >
        <DeletePageConfirmation
          pagePublicId={entityId}
          pageTitle={entityLabel}
          subPageCount={pendingDeleteDescendants.length}
          onDeleted={() => void handleDeleted()}
        />
      </Modal>
    </>
  );
}
