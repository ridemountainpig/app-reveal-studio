import type {
  EditableLayerId,
  LayerTransform,
  LayerTransforms,
  RevealControls,
} from "../types/revealControls";

const DEFAULT_LAYER_TRANSFORM: LayerTransform = {
  x: 0,
  y: 0,
  scale: 1,
};

const editableLayerIds: EditableLayerId[] = [
  "title",
  "subtitle",
  "icon",
  "badge",
  "badgeAppStore",
  "badgeGooglePlay",
];

function getFiniteNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function createDefaultLayerTransforms(): LayerTransforms {
  return editableLayerIds.reduce<LayerTransforms>((accumulator, layerId) => {
    accumulator[layerId] = { ...DEFAULT_LAYER_TRANSFORM };
    return accumulator;
  }, {} as LayerTransforms);
}

export function sanitizeLayerTransforms(value: unknown): LayerTransforms {
  const defaults = createDefaultLayerTransforms();

  if (!value || typeof value !== "object") {
    return defaults;
  }

  for (const layerId of editableLayerIds) {
    const candidate = (value as Partial<Record<EditableLayerId, unknown>>)[
      layerId
    ];
    if (!candidate || typeof candidate !== "object") {
      continue;
    }

    const nextTransform = candidate as Partial<LayerTransform>;
    defaults[layerId] = {
      x: getFiniteNumber(nextTransform.x, 0),
      y: getFiniteNumber(nextTransform.y, 0),
      scale: getFiniteNumber(nextTransform.scale, 1),
    };
  }

  return defaults;
}

export const initialControls: RevealControls = {
  title: "Now Available",
  subtitle: "Subflow - Manage Your Subscriptions",
  iconUrl: "https://subflow.ing/favicon.ico",
  iconCornerRadius: 60,
  badgeVariant: "custom",
  badgePrefix: "Manage Subscription on the",
  badgeLabel: "subflow.ing",
  badgeIconUrl: "https://subflow.ing/favicon.ico",
  durationMs: 7000,
  playbackRate: 1,
  glowColor: "#ffffff",
  glowSize: 100,
  rimColor: "#ffffff",
  grayColor: "#c5cbd5",
  layers: createDefaultLayerTransforms(),
};
