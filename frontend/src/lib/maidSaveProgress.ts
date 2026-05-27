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
  persisted?: boolean;
  startedAt: number;
  finishedAt?: number;
};

type SaveTaskListener = (snapshot: MaidSaveTaskSnapshot) => void;

const STORAGE_KEY_PREFIX = "maid-save-task:";
const METADATA_REQUEST_TIMEOUT_MS = 30_000;
const MEDIA_REQUEST_TIMEOUT_MS = 120_000;
const listeners = new Map<string, Set<SaveTaskListener>>();
const inflightRequests = new Map<string, XMLHttpRequest>();

const isInlineMediaUrl = (value: unknown) =>
  typeof value === "string" && value.trim().startsWith("data:");

const parseXhrJsonResponse = <TResponse extends { error?: string }>(
  request: XMLHttpRequest,
): TResponse => {
  if (request.response && typeof request.response === "object") {
    return request.response as TResponse;
  }

  const rawText = String(request.responseText || "").trim();
  if (!rawText) {
    return {} as TResponse;
  }

  try {
    return JSON.parse(rawText) as TResponse;
  } catch {
    const looksLikeHtml = rawText.startsWith("<!DOCTYPE") || rawText.startsWith("<html") || rawText.startsWith("<");
    return {
      error: looksLikeHtml
        ? `Server error (${request.status || 503}). Please try again in a moment.`
        : "Server returned an invalid response.",
    } as TResponse;
  }
};

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
  const normalizedVideo = String(payload.videoDataUrl || "").trim();
  const metadataPayload: Partial<MaidProfile> = {
    ...payload,
    photoDataUrl: undefined,
    photoDataUrls: undefined,
    videoDataUrl: undefined,
    hasPhoto: undefined,
  };

  const promise = new Promise<MaidProfile>((resolve, reject) => {
    const sendJsonRequest = <TResponse extends { error?: string }>({
      requestUrl,
      requestMethod,
      requestBody,
      timeoutMs,
      uploadStage,
      onUploadProgress,
    }: {
      requestUrl: string;
      requestMethod: string;
      requestBody: unknown;
      timeoutMs: number;
      uploadStage: string;
      onUploadProgress?: (loaded: number, total: number, lengthComputable: boolean) => void;
    }) =>
      new Promise<TResponse>((innerResolve, innerReject) => {
        const request = new XMLHttpRequest();
        inflightRequests.set(taskId, request);

        request.open(requestMethod, requestUrl, true);
        request.responseType = "json";
        request.timeout = timeoutMs;
        request.setRequestHeader("Content-Type", "application/json");
        Object.entries(authHeaders).forEach(([key, value]) => {
          request.setRequestHeader(key, value);
        });

        if (onUploadProgress) {
          request.upload.onprogress = (event) => {
            onUploadProgress(event.loaded, event.total, event.lengthComputable);
          };
        }

        request.onreadystatechange = () => {
          if (request.readyState === XMLHttpRequest.HEADERS_RECEIVED || request.readyState === XMLHttpRequest.LOADING) {
            const current = readMaidSaveTask(taskId) ?? initialSnapshot;
            if (current.status !== "success" && current.status !== "error") {
              emitSnapshot({
                ...current,
                status: "processing",
                percent: Math.max(current.percent, 94),
                stage: uploadStage,
              });
            }
          }
        };

        request.onload = () => {
          inflightRequests.delete(taskId);
          const response = parseXhrJsonResponse<TResponse>(request);

          if (request.status >= 200 && request.status < 300) {
            innerResolve(response);
            return;
          }

          innerReject(new Error(response.error || "Request failed"));
        };

        request.onerror = () => {
          inflightRequests.delete(taskId);
          innerReject(new Error("Network error while saving maid profile"));
        };

        request.ontimeout = () => {
          inflightRequests.delete(taskId);
          innerReject(new Error(`TIMEOUT:${uploadStage}`));
        };

        request.send(JSON.stringify(requestBody));
      });

    void (async () => {
      let persistedMaid: MaidProfile | null = null;
      try {
        const metadataResponse = await sendJsonRequest<{ error?: string; maid?: MaidProfile }>({
          requestUrl: url,
          requestMethod: method,
          requestBody: metadataPayload,
          timeoutMs: METADATA_REQUEST_TIMEOUT_MS,
          uploadStage: "Finalizing maid profile...",
          onUploadProgress: (loaded, total, lengthComputable) => {
            if (!lengthComputable) {
              const current = readMaidSaveTask(taskId) ?? initialSnapshot;
              emitSnapshot({
                ...current,
                status: "uploading",
                percent: 28,
                stage: "Saving maid details...",
              });
              return;
            }

            const uploadPercent = Math.max(8, Math.min(75, Math.round((loaded / total) * 75)));
            const current = readMaidSaveTask(taskId) ?? initialSnapshot;
            emitSnapshot({
              ...current,
              status: "uploading",
              percent: uploadPercent,
              stage: "Saving maid details...",
            });
          },
        });

        if (!metadataResponse.maid) {
          throw new Error(metadataResponse.error || "Failed to save maid profile");
        }

        persistedMaid = metadataResponse.maid;

        if (normalizedPhotos.length > 0) {
          for (let index = 0; index < normalizedPhotos.length; index += 1) {
            const photoDataUrl = normalizedPhotos[index]!;
            const isFirstPhoto = index === 0;
            const requestUrl = isFirstPhoto
              ? `/api/maids/${encodeURIComponent(persistedMaid.referenceCode)}/photo`
              : `/api/maids/${encodeURIComponent(persistedMaid.referenceCode)}/photos`;
            const requestBody = isFirstPhoto ? { photoDataUrl } : { photoDataUrl };
            const basePercent = 82 + Math.round((index / normalizedPhotos.length) * 10);
            const progressRange = Math.max(2, Math.round(12 / normalizedPhotos.length));
            const photoLabel = normalizedPhotos.length > 1
              ? `Uploading photo ${index + 1} of ${normalizedPhotos.length}...`
              : "Uploading maid photo...";

            emitSnapshot({
              ...(readMaidSaveTask(taskId) ?? initialSnapshot),
              status: "processing",
              percent: basePercent,
              persisted: true,
              stage: photoLabel,
            });

            const photoResponse = await sendJsonRequest<{ error?: string; maid?: MaidProfile }>({
              requestUrl,
              requestMethod: "PATCH",
              requestBody,
              timeoutMs: MEDIA_REQUEST_TIMEOUT_MS,
              uploadStage: `Finalizing photo ${index + 1}...`,
              onUploadProgress: (loaded, total, lengthComputable) => {
                const current = readMaidSaveTask(taskId) ?? initialSnapshot;
                const nextPercent = !lengthComputable || total <= 0
                  ? Math.min(96, basePercent + progressRange)
                  : Math.min(
                      96,
                      basePercent + Math.round((loaded / total) * progressRange)
                    );
                emitSnapshot({
                  ...current,
                  status: "uploading",
                  percent: nextPercent,
                  persisted: true,
                  stage: photoLabel,
                });
              },
            });

            if (photoResponse.maid) {
              persistedMaid = photoResponse.maid;
            }
          }
        }

        if (normalizedVideo && isInlineMediaUrl(normalizedVideo)) {
          emitSnapshot({
            ...(readMaidSaveTask(taskId) ?? initialSnapshot),
            status: "processing",
            percent: 97,
            persisted: true,
            stage: "Uploading maid video...",
          });

          const videoResponse = await sendJsonRequest<{ error?: string; maid?: MaidProfile }>({
            requestUrl: `/api/maids/${encodeURIComponent(persistedMaid.referenceCode)}/video`,
            requestMethod: "PATCH",
            requestBody: { videoDataUrl: normalizedVideo },
            timeoutMs: MEDIA_REQUEST_TIMEOUT_MS,
            uploadStage: "Finalizing maid video...",
          });

          if (videoResponse.maid) {
            persistedMaid = videoResponse.maid;
          }
        }

        emitSnapshot({
          ...(readMaidSaveTask(taskId) ?? initialSnapshot),
          status: "success",
          percent: 100,
          persisted: true,
          stage: "Maid profile saved successfully.",
          finishedAt: Date.now(),
        });
        resolve(persistedMaid);
      } catch (error) {
        const current = readMaidSaveTask(taskId) ?? initialSnapshot;
        const rawMessage = error instanceof Error ? error.message : "Failed to save maid profile";
        const errorMessage = rawMessage.startsWith("TIMEOUT:")
          ? persistedMaid
            ? "Maid profile was saved, but media upload took too long. You can reopen the maid and retry the photo/video upload."
            : "Saving maid details took too long. Please try again."
          : persistedMaid
            ? `Maid profile was saved, but media upload failed. ${rawMessage}`
            : rawMessage;

        emitSnapshot({
          ...current,
          status: "error",
          percent: Math.min(current.percent || 90, 100),
          persisted: Boolean(persistedMaid),
          stage: persistedMaid ? "Maid profile saved with media upload issue." : "Maid profile upload failed.",
          error: errorMessage,
          finishedAt: Date.now(),
        });
        reject(new Error(errorMessage));
      }
    })();
  });

  return { taskId, promise };
};
