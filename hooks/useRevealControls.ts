import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { initialControls } from "../utils/revealControls";
import { readImageFileAsDataURL } from "../utils/fileReader";
import type {
  BadgeVariant,
  EditableLayerId,
  LayerTransform,
  RevealControls,
} from "../types/revealControls";

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
  | "iconCornerRadius"
  | "glowSize";
export type ColorControlKey = "glowColor" | "rimColor" | "grayColor";

type RevealControlsAction =
  | { type: "text"; key: TextControlKey; value: string }
  | { type: "range"; key: RangeControlKey; value: number }
  | { type: "color"; key: ColorControlKey; value: string }
  | { type: "badgeVariant"; value: BadgeVariant }
  | {
      type: "layerTransform";
      layerId: EditableLayerId;
      nextTransform: LayerTransform;
    };

function revealControlsReducer(
  state: RevealControls,
  action: RevealControlsAction,
): RevealControls {
  switch (action.type) {
    case "text":
    case "range":
    case "color":
      return {
        ...state,
        [action.key]: action.value,
      };
    case "badgeVariant":
      return {
        ...state,
        badgeVariant: action.value,
      };
    case "layerTransform":
      return {
        ...state,
        layers: {
          ...state.layers,
          [action.layerId]: action.nextTransform,
        },
      };
    default:
      return state;
  }
}

function useDataUrlUpload(errorLabel: string) {
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const setUploadedFile = useCallback(
    async (file?: File) => {
      if (!file) {
        return;
      }

      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setUploadedName(file.name);

      try {
        const dataUrl = await readImageFileAsDataURL(file);

        if (
          !controller.signal.aborted &&
          abortControllerRef.current === controller
        ) {
          setUploadedUrl(dataUrl);
        }
      } catch (error) {
        console.error(`Failed to read ${errorLabel}:`, error);
        if (
          !controller.signal.aborted &&
          abortControllerRef.current === controller
        ) {
          setUploadedUrl(null);
        }
      }
    },
    [errorLabel],
  );

  const clearUploadedFile = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setUploadedUrl(null);
    setUploadedName("");
    setFileInputKey((current) => current + 1);
  }, []);

  return {
    fileInputKey,
    uploadedUrl,
    uploadedName,
    setUploadedFile,
    clearUploadedFile,
  };
}

export function useRevealControls() {
  const [controls, dispatch] = useReducer(
    revealControlsReducer,
    initialControls,
  );
  const iconUpload = useDataUrlUpload("icon file");
  const badgeIconUpload = useDataUrlUpload("badge icon file");

  const updateTextControl = useCallback(
    (key: TextControlKey, value: string) => {
      dispatch({ type: "text", key, value });
    },
    [],
  );

  const updateRangeControl = useCallback(
    (key: RangeControlKey, value: number) => {
      dispatch({ type: "range", key, value });
    },
    [],
  );

  const updateColorControl = useCallback(
    (key: ColorControlKey, value: string) => {
      dispatch({ type: "color", key, value });
    },
    [],
  );

  const updateBadgeVariant = useCallback((value: BadgeVariant) => {
    dispatch({ type: "badgeVariant", value });
  }, []);

  const updateLayerTransform = useCallback(
    (layerId: EditableLayerId, nextTransform: LayerTransform) => {
      dispatch({
        type: "layerTransform",
        layerId,
        nextTransform,
      });
    },
    [],
  );

  const safeTitle = controls.title.trim() || initialControls.title;
  const safeSubtitle = controls.subtitle.trim() || initialControls.subtitle;
  const safeBadgeLabel =
    controls.badgeLabel.trim() || initialControls.badgeLabel;
  const safeBadgePrefix =
    controls.badgePrefix.trim() || initialControls.badgePrefix;
  const safeIconUrl =
    iconUpload.uploadedUrl ?? (controls.iconUrl.trim() || undefined);
  const safeBadgeIconUrl =
    badgeIconUpload.uploadedUrl ?? (controls.badgeIconUrl.trim() || undefined);

  return {
    controls,
    iconFileInputKey: iconUpload.fileInputKey,
    badgeIconFileInputKey: badgeIconUpload.fileInputKey,
    uploadedIconName: iconUpload.uploadedName,
    uploadedIconUrl: iconUpload.uploadedUrl,
    uploadedBadgeIconName: badgeIconUpload.uploadedName,
    uploadedBadgeIconUrl: badgeIconUpload.uploadedUrl,
    updateTextControl,
    updateRangeControl,
    updateColorControl,
    updateBadgeVariant,
    updateLayerTransform,
    setUploadedIconFile: iconUpload.setUploadedFile,
    setUploadedBadgeIconFile: badgeIconUpload.setUploadedFile,
    clearUploadedIcon: iconUpload.clearUploadedFile,
    clearUploadedBadgeIcon: badgeIconUpload.clearUploadedFile,
    safeTitle,
    safeSubtitle,
    safeBadgeVariant: controls.badgeVariant,
    safeBadgeLabel,
    safeBadgePrefix,
    safeIconUrl,
    safeBadgeIconUrl,
    safeLayerTransforms: controls.layers,
  };
}
