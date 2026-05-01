import type {
  BadgeVariant,
  LayerTransforms,
  RevealControls,
} from "../types/revealControls";

export type ExportPayload = Record<
  | "title"
  | "subtitle"
  | "badgeVariant"
  | "ctaLabel"
  | "badgePrefix"
  | "iconUrl"
  | "badgeIconUrl"
  | "iconCornerRadius"
  | "durationMs"
  | "playbackRate"
  | "glowColor"
  | "glowSize"
  | "rimColor"
  | "grayColor"
  | "layerTransforms",
  string
>;

type ExportPayloadControls = Pick<
  RevealControls,
  | "iconCornerRadius"
  | "durationMs"
  | "playbackRate"
  | "glowColor"
  | "glowSize"
  | "rimColor"
  | "grayColor"
> & {
  layers: LayerTransforms;
};

type GetExportPayloadOptions = {
  safeTitle: string;
  safeSubtitle: string;
  safeBadgeVariant: BadgeVariant;
  safeBadgeLabel: string;
  safeBadgePrefix: string;
  safeIconUrl: string | undefined;
  safeBadgeIconUrl: string | undefined;
  previewControls: ExportPayloadControls;
};

/** Appends `clientId` (and optional Turnstile token) without re-stringifying all fields. */
export function appendClientIdToPayloadJson(
  serializedPayload: string,
  clientId: string,
  options?: { turnstileToken?: string },
): string {
  if (serializedPayload.length <= 1 || !serializedPayload.startsWith("{")) {
    const base: Record<string, string> = { clientId };
    if (options?.turnstileToken) {
      base.turnstileToken = options.turnstileToken;
    }
    return JSON.stringify(base);
  }

  let out = `${serializedPayload.slice(0, -1)},"clientId":${JSON.stringify(clientId)}`;
  if (options?.turnstileToken) {
    out += `,"turnstileToken":${JSON.stringify(options.turnstileToken)}`;
  }
  return `${out}}`;
}

export function getExportPayload({
  safeTitle,
  safeSubtitle,
  safeBadgeVariant,
  safeBadgeLabel,
  safeBadgePrefix,
  safeIconUrl,
  safeBadgeIconUrl,
  previewControls,
}: GetExportPayloadOptions): ExportPayload {
  return {
    title: safeTitle,
    subtitle: safeSubtitle,
    badgeVariant: safeBadgeVariant,
    ctaLabel: safeBadgeLabel,
    badgePrefix: safeBadgePrefix,
    iconUrl: safeIconUrl ?? "",
    badgeIconUrl: safeBadgeIconUrl ?? "",
    iconCornerRadius: String(previewControls.iconCornerRadius),
    durationMs: String(previewControls.durationMs),
    playbackRate: String(previewControls.playbackRate),
    glowColor: previewControls.glowColor,
    glowSize: String(previewControls.glowSize),
    rimColor: previewControls.rimColor,
    grayColor: previewControls.grayColor,
    layerTransforms: JSON.stringify(previewControls.layers),
  };
}
