"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_EXPORT_PAYLOAD_BYTES } from "../constants/exportSettings";
import type { ExportPayload } from "../utils/exportPayload";
import { appendClientIdToPayloadJson } from "../utils/exportPayload";
import { exportMessages, formatExportQueueStatus } from "../utils/styles";

const SUCCESS_RESET_MS = 2400;
const EXPORT_QUEUE_POLL_MS = 5000;

type UseExportVideoOptions =
  | {
      payload: ExportPayload;
      filename?: string;
      turnstileRequired: true;
      getTurnstileToken: () => string | null | undefined;
      /** After export completes or errors (including cancel); reset Turnstile widget. */
      onExportSettled?: () => void;
    }
  | {
      payload: ExportPayload;
      filename?: string;
      turnstileRequired?: false;
      getTurnstileToken?: never;
      onExportSettled?: never;
    };

export function useExportVideo({
  payload,
  filename = "app-reveal.mp4",
  turnstileRequired = false,
  getTurnstileToken,
  onExportSettled,
}: UseExportVideoOptions) {
  const exportAbortControllerRef = useRef<AbortController | null>(null);
  const stopPollingRef = useRef<(() => void) | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [exportStatus, setExportStatus] = useState("");

  const cancelExport = useCallback(() => {
    const controller = exportAbortControllerRef.current;
    if (!controller || controller.signal.aborted) {
      return;
    }

    setIsCancelling(true);
    setExportStatus("Cancelling export...");
    stopPollingRef.current?.();
    controller.abort();
  }, []);

  useEffect(() => {
    return () => {
      stopPollingRef.current?.();
      stopPollingRef.current = null;
      exportAbortControllerRef.current?.abort();
      exportAbortControllerRef.current = null;
    };
  }, []);

  const exportVideo = useCallback(async () => {
    if (isExporting) {
      return;
    }

    if (turnstileRequired) {
      const token = getTurnstileToken?.() ?? null;
      if (!token || !String(token).trim()) {
        setExportStatus("Complete verification first.");
        setTimeout(() => setExportStatus(""), SUCCESS_RESET_MS);
        return;
      }
    }

    const clientId = crypto.randomUUID();
    const exportController = new AbortController();
    exportAbortControllerRef.current = exportController;

    setIsExporting(true);
    setIsCancelling(false);
    setExportStatus(exportMessages.rendering);

    try {
      const serializedPayload = JSON.stringify(payload);
      const payloadBytes = new TextEncoder().encode(serializedPayload).length;

      if (payloadBytes > MAX_EXPORT_PAYLOAD_BYTES) {
        throw new Error(
          "Images are too large to export. Use smaller files or lower-resolution icons.",
        );
      }

      const requestBody = appendClientIdToPayloadJson(
        serializedPayload,
        clientId,
        turnstileRequired
          ? {
              turnstileToken: String(getTurnstileToken?.() ?? "").trim(),
            }
          : undefined,
      );

      let pollTimer: ReturnType<typeof setTimeout> | undefined;
      let pollController: AbortController | undefined;
      let shouldPoll = true;

      const stopPolling = () => {
        shouldPoll = false;
        if (pollTimer !== undefined) {
          clearTimeout(pollTimer);
          pollTimer = undefined;
        }
        if (pollController) {
          pollController.abort();
          pollController = undefined;
        }
      };
      stopPollingRef.current = stopPolling;

      const pollQueueStatus = async () => {
        if (!shouldPoll) {
          return;
        }

        const controller = new AbortController();
        pollController = controller;

        try {
          const response = await fetch(
            `/api/export?clientId=${encodeURIComponent(clientId)}`,
            {
              cache: "no-store",
              signal: controller.signal,
            },
          );

          if (response.ok) {
            const data = (await response.json()) as {
              phase: string;
              ahead?: number;
              waitingTotal: number;
            };
            if (data.phase === "queued" && typeof data.ahead === "number") {
              setExportStatus(
                formatExportQueueStatus(data.ahead, data.waitingTotal),
              );
            } else if (data.phase === "active") {
              setExportStatus(exportMessages.rendering);
              stopPolling();
            }
          }
        } catch {
          if (controller.signal.aborted) {
            return;
          }
        } finally {
          if (pollController === controller) {
            pollController = undefined;
          }
        }

        if (shouldPoll) {
          pollTimer = setTimeout(pollQueueStatus, EXPORT_QUEUE_POLL_MS);
        }
      };

      pollTimer = setTimeout(pollQueueStatus, EXPORT_QUEUE_POLL_MS);

      try {
        const response = await fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: exportController.signal,
          body: requestBody,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let message = errorText || "Export failed.";
          try {
            const parsed = JSON.parse(errorText) as { error?: string };
            if (parsed.error) {
              message = parsed.error;
            }
          } catch {
            // use raw text
          }
          throw new Error(message);
        }

        setExportStatus(exportMessages.downloading);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.style.display = "none";
        document.body.appendChild(anchor);
        anchor.click();
        setTimeout(() => {
          document.body.removeChild(anchor);
          URL.revokeObjectURL(url);
        }, 1000);

        setExportStatus(exportMessages.downloaded);
        setTimeout(() => setExportStatus(""), SUCCESS_RESET_MS);
      } finally {
        stopPolling();
        if (stopPollingRef.current === stopPolling) {
          stopPollingRef.current = null;
        }
      }
    } catch (error) {
      if (exportController.signal.aborted) {
        setExportStatus("Export cancelled.");
        setTimeout(() => setExportStatus(""), SUCCESS_RESET_MS);
        return;
      }

      setExportStatus(
        error instanceof Error ? error.message : exportMessages.failed,
      );
      setTimeout(() => setExportStatus(""), SUCCESS_RESET_MS);
    } finally {
      if (turnstileRequired && onExportSettled) {
        onExportSettled();
      }
      if (exportAbortControllerRef.current === exportController) {
        exportAbortControllerRef.current = null;
      }
      setIsCancelling(false);
      setIsExporting(false);
    }
  }, [
    filename,
    getTurnstileToken,
    isExporting,
    onExportSettled,
    payload,
    turnstileRequired,
  ]);

  return {
    isExporting,
    isCancelling,
    exportStatus,
    exportVideo,
    cancelExport,
  };
}
