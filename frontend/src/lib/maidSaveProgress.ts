import type { MaidProfile } from "@/lib/maids";

export type MaidSaveTaskStatus = "uploading" | "processing" | "success" | "error";

export type MaidSaveTaskSnapshot = {
  id: string;
  maidName: string;
  referenceCode: string;
  status: MaidSaveTaskStatus;
  percent: number;
  stage: string;
  error?: string;
  startedAt: number;
  finishedAt?: number;
};

type SaveTaskListener = (snapshot: MaidSaveTaskSnapshot) => void;

const STORAGE_KEY_PREFIX = "maid-save-task:";
const listeners = new Map<string, Set<SaveTaskListener>>();
const inflightRequests = new Map<string, XMLHttpRequest>();

const toStorageKey = (taskId: string) => `${STORAGE_KEY_PREFIX}${taskId}`;

const emitSnapshot = (snapshot: MaidSaveTaskSnapshot) => {
  try {
    window.sessionStorage.setItem(toStorageKey(snapshot.id), JSON.stringify(snapshot));
  } catch {
    // Ignore storage quota / availability issues.
  }

  listeners.get(snapshot.id)?.forEach((listener) => listener(snapshot));
  window.dispatchEvent(new CustomEvent("maid-save-task", { detail: snapshot }));
};

export const readMaidSaveTask = (taskId: string): MaidSaveTaskSnapshot | null => {
  if (!taskId || typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(toStorageKey(taskId));
    return raw ? (JSON.parse(raw) as MaidSaveTaskSnapshot) : null;
  } catch {
    return null;
  }
};

export const subscribeToMaidSaveTask = (
  taskId: string,
  listener: SaveTaskListener,
) => {
  if (!listeners.has(taskId)) listeners.set(taskId, new Set());
  listeners.get(taskId)!.add(listener);

  const handleWindowEvent = (event: Event) => {
    const detail = (event as CustomEvent<MaidSaveTaskSnapshot>).detail;
    if (detail?.id === taskId) {
      listener(detail);
    }
  };

  window.addEventListener("maid-save-task", handleWindowEvent as EventListener);

  return () => {
    listeners.get(taskId)?.delete(listener);
    if (listeners.get(taskId)?.size === 0) listeners.delete(taskId);
    window.removeEventListener("maid-save-task", handleWindowEvent as EventListener);
  };
};

export const dismissMaidSaveTask = (taskId: string) => {
  if (!taskId || typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(toStorageKey(taskId));
  } catch {
    // Ignore storage failures.
  }
  inflightRequests.delete(taskId);
};

export const startMaidSaveTask = ({
  payload,
  shouldCreate,
  authHeaders,
}: {
  payload: MaidProfile;
  shouldCreate: boolean;
  authHeaders: Record<string, string>;
}) => {
  const taskId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `maid-save-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const initialSnapshot: MaidSaveTaskSnapshot = {
    id: taskId,
    maidName: String(payload.fullName || "").trim() || "New maid",
    referenceCode: String(payload.referenceCode || "").trim(),
    status: "uploading",
    percent: 5,
    stage: "Preparing maid profile upload...",
    startedAt: Date.now(),
  };

  emitSnapshot(initialSnapshot);

  const refCode = payload.referenceCode;
  const url = shouldCreate ? "/api/maids" : `/api/maids/${encodeURIComponent(refCode)}`;
  const method = shouldCreate ? "POST" : "PUT";
  const normalizedPhotos = Array.isArray(payload.photoDataUrls)
    ? payload.photoDataUrls.filter((item) => typeof item === "string" && item.trim().length > 0)
    : [];
  const requestPayload: MaidProfile = {
    ...payload,
    photoDataUrls: normalizedPhotos,
    photoDataUrl: normalizedPhotos.length > 0 ? "" : String(payload.photoDataUrl || "").trim(),
  };
  const body = JSON.stringify(requestPayload);

  const promise = new Promise<MaidProfile>((resolve, reject) => {
    const request = new XMLHttpRequest();
    inflightRequests.set(taskId, request);

    request.open(method, url, true);
    request.responseType = "json";
    request.setRequestHeader("Content-Type", "application/json");
    Object.entries(authHeaders).forEach(([key, value]) => {
      request.setRequestHeader(key, value);
    });

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable) {
        emitSnapshot({
          ...readMaidSaveTask(taskId)!,
          status: "uploading",
          percent: 35,
          stage: "Uploading maid profile...",
        });
        return;
      }

      const uploadPercent = Math.max(8, Math.min(90, Math.round((event.loaded / event.total) * 90)));
      const current = readMaidSaveTask(taskId) ?? initialSnapshot;
      emitSnapshot({
        ...current,
        status: "uploading",
        percent: uploadPercent,
        stage: "Uploading maid profile...",
      });
    };

    request.onreadystatechange = () => {
      if (request.readyState === XMLHttpRequest.HEADERS_RECEIVED || request.readyState === XMLHttpRequest.LOADING) {
        const current = readMaidSaveTask(taskId) ?? initialSnapshot;
        if (current.status !== "success" && current.status !== "error") {
          emitSnapshot({
            ...current,
            status: "processing",
            percent: Math.max(current.percent, 94),
            stage: "Finalizing maid profile...",
          });
        }
      }
    };

    request.onload = () => {
      inflightRequests.delete(taskId);
      const response =
        request.response && typeof request.response === "object"
          ? (request.response as { error?: string; maid?: MaidProfile })
          : (JSON.parse(String(request.responseText || "{}")) as { error?: string; maid?: MaidProfile });

      if (request.status >= 200 && request.status < 300 && response.maid) {
        emitSnapshot({
          ...(readMaidSaveTask(taskId) ?? initialSnapshot),
          status: "success",
          percent: 100,
          stage: "Maid profile saved successfully.",
          finishedAt: Date.now(),
        });
        resolve(response.maid);
        return;
      }

      const errorMessage = response.error || "Failed to save maid profile";
      emitSnapshot({
        ...(readMaidSaveTask(taskId) ?? initialSnapshot),
        status: "error",
        percent: Math.min((readMaidSaveTask(taskId)?.percent ?? 90), 100),
        stage: "Maid profile upload failed.",
        error: errorMessage,
        finishedAt: Date.now(),
      });
      reject(new Error(errorMessage));
    };

    request.onerror = () => {
      inflightRequests.delete(taskId);
      emitSnapshot({
        ...(readMaidSaveTask(taskId) ?? initialSnapshot),
        status: "error",
        percent: Math.min((readMaidSaveTask(taskId)?.percent ?? 90), 100),
        stage: "Maid profile upload failed.",
        error: "Network error while saving maid profile",
        finishedAt: Date.now(),
      });
      reject(new Error("Network error while saving maid profile"));
    };

    request.send(body);
  });

  return { taskId, promise };
};
