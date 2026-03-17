import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { initialControls } from "../utils/revealControls";
import { readFileAsDataURL } from "../utils/fileReader";

export type TextControlKey =
  | "title"
  | "subtitle"
  | "iconUrl"
  | "badgePrefix"
  | "badgeLabel"
  | "badgeIconUrl";

export type RangeControlKey =
  | "durationMs"
  | "playbackRate"
  | "iconCornerRadius";
export type ColorControlKey = "glowColor" | "rimColor" | "grayColor";

export function useRevealControls() {
  const [controls, setControls] = useState(initialControls);
  const [iconFileInputKey, setIconFileInputKey] = useState(0);
  const [uploadedIconUrl, setUploadedIconUrl] = useState<string | null>(null);
  const [uploadedIconName, setUploadedIconName] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const previewControls = useDeferredValue(controls);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const updateTextControl = useCallback(
    (key: TextControlKey, value: string) => {
      setControls((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const updateRangeControl = useCallback(
    (key: RangeControlKey, value: number) => {
      setControls((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const updateColorControl = useCallback(
    (key: ColorControlKey, value: string) => {
      setControls((current) => ({
        ...current,
        [key]: value,
      }));
    },
    [],
  );

  const setUploadedIconFile = useCallback(async (file?: File) => {
    if (!file) {
      return;
    }

    // Cancel any ongoing file read
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setUploadedIconName(file.name);

    try {
      const dataUrl = await readFileAsDataURL(file);

      // Check if this operation was aborted
      if (!abortControllerRef.current?.signal.aborted) {
        setUploadedIconUrl(dataUrl);
      }
    } catch (error) {
      console.error("Failed to read icon file:", error);
      setUploadedIconUrl(null);
    }
  }, []);

  const clearUploadedIcon = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setUploadedIconUrl(null);
    setUploadedIconName("");
    setIconFileInputKey((current) => current + 1);
  }, []);

  const safeTitle = previewControls.title.trim() || initialControls.title;
  const safeSubtitle =
    previewControls.subtitle.trim() || initialControls.subtitle;
  const safeBadgeLabel =
    previewControls.badgeLabel.trim() || initialControls.badgeLabel;
  const safeBadgePrefix =
    previewControls.badgePrefix.trim() || initialControls.badgePrefix;
  const safeIconUrl =
    uploadedIconUrl ?? (previewControls.iconUrl.trim() || undefined);
  const safeBadgeIconUrl = previewControls.badgeIconUrl.trim() || undefined;

  return {
    controls,
    previewControls,
    iconFileInputKey,
    uploadedIconName,
    uploadedIconUrl,
    updateTextControl,
    updateRangeControl,
    updateColorControl,
    setUploadedIconFile,
    clearUploadedIcon,
    safeTitle,
    safeSubtitle,
    safeBadgeLabel,
    safeBadgePrefix,
    safeIconUrl,
    safeBadgeIconUrl,
  };
}
