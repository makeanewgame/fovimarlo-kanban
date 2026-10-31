import { plural, t } from "@lingui/core/macro";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";

export function DeletePageConfirmation({
  pagePublicId,
  pageTitle,
  subPageCount,
  onDeleted,
}: {
  pagePublicId: string;
  pageTitle: string;
  subPageCount: number;
  onDeleted: () => void;
}) {
  const { closeModal } = useModal();

  const deletePage = api.page.delete.useMutation({
    onSuccess: () => {
      closeModal();
      onDeleted();
    },
  });

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md break-words pb-4 font-medium text-neutral-900 dark:text-dark-1000">
          {t`Are you sure you want to delete "${pageTitle}"?`}
        </h2>
        <p className="text-sm font-medium text-light-900 dark:text-dark-900">
          {subPageCount > 0
            ? plural(subPageCount, {
                one: "Its # sub-page will be deleted too. This action can't be undone.",
                other:
                  "Its # sub-pages will be deleted too. This action can't be undone.",
              })
            : t`This action can't be undone.`}
        </p>
      </div>
      <div className="mt-5 flex justify-end space-x-2 sm:mt-6">
        <Button onClick={() => closeModal()} variant="secondary">
          {t`Cancel`}
        </Button>
        <Button
          onClick={() => deletePage.mutate({ pagePublicId })}
          isLoading={deletePage.isPending}
        >
          {t`Delete`}
        </Button>
      </div>
    </div>
  );
}
