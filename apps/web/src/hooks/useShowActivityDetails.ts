import { useSyncExternalStore } from "react";

const STORAGE_KEY = "kan_show-activity-details";
const CHANGE_EVENT = `${STORAGE_KEY}-change`;

const getSnapshot = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const setShowActivityDetails = (showDetails: boolean) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(showDetails));
  } catch {
    // The hook falls back to hiding details when storage is unavailable.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
};

const subscribe = (onStoreChange: () => void) => {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onStoreChange();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(CHANGE_EVENT, onStoreChange);
  };
};

export const useShowActivityDetails = () =>
  useSyncExternalStore(subscribe, getSnapshot, () => false);
