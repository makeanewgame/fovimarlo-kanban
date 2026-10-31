import { useCallback, useEffect, useRef, useState } from "react";

import type { RouterOutputs } from "~/utils/api";
import { api } from "~/utils/api";

const AUTOSAVE_DELAY_MS = 800;

interface PageDraft {
  title?: string;
  content?: string;
}

export type PageSaveStatus = "idle" | "saving" | "saved" | "error" | "conflict";

export function usePageAutosave({
  pagePublicId,
  initialRevision,
  onSaved,
}: {
  pagePublicId: string;
  initialRevision: number;
  onSaved: (saved: RouterOutputs["page"]["update"]) => void;
}) {
  const { mutateAsync } = api.page.update.useMutation();
  const [status, setStatus] = useState<PageSaveStatus>("idle");

  // Saves run one at a time because each needs the revision the last one
  // returned, so edits made during a save wait in draftRef for the next one.
  const draftRef = useRef<PageDraft>({});
  const revisionRef = useRef(initialRevision);
  const isSavingRef = useRef(false);
  const isConflictedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const hasDraft = () => Object.keys(draftRef.current).length > 0;

  const flush = useCallback(async () => {
    clearTimeout(timerRef.current);
    if (isSavingRef.current || isConflictedRef.current || !hasDraft()) return;

    const draft = draftRef.current;
    draftRef.current = {};
    isSavingRef.current = true;
    setStatus("saving");

    try {
      const saved = await mutateAsync({
        pagePublicId,
        ...draft,
        expectedRevision: revisionRef.current,
      });
      revisionRef.current = saved.revision;
      isSavingRef.current = false;
      onSavedRef.current(saved);

      if (hasDraft()) await flush();
      else setStatus("saved");
    } catch (error) {
      isSavingRef.current = false;
      // Keep the failed edits, letting anything typed since then win.
      draftRef.current = { ...draft, ...draftRef.current };

      const isConflict =
        (error as { data?: { code?: string } | null }).data?.code ===
        "CONFLICT";
      isConflictedRef.current = isConflict;
      setStatus(isConflict ? "conflict" : "error");
    }
  }, [mutateAsync, pagePublicId]);

  const queueSave = useCallback(
    (changes: PageDraft) => {
      draftRef.current = { ...draftRef.current, ...changes };
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => void flush(), AUTOSAVE_DELAY_MS);
    },
    [flush],
  );

  // Save whatever is left when switching to another page.
  useEffect(() => () => void flush(), [flush]);

  useEffect(() => {
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (hasDraft() || isSavingRef.current) event.preventDefault();
    };

    window.addEventListener("beforeunload", warnAboutUnsavedChanges);
    return () =>
      window.removeEventListener("beforeunload", warnAboutUnsavedChanges);
  }, []);

  return { status, queueSave, retry: flush };
}
