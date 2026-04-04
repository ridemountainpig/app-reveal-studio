export type BadgeVariant = "custom" | "appStore" | "googlePlay" | "bothStores";

export type EditableLayerId =
  | "title"
  | "subtitle"
  | "icon"
  | "badge"
  | "badgeAppStore"
  | "badgeGooglePlay";

export type LayerTransform = {
  x: number;
  y: number;
  scale: number;
};

export type LayerTransforms = Record<EditableLayerId, LayerTransform>;

export type RevealControls = {
  title: string;
  subtitle: string;
  iconUrl: string;
  iconCornerRadius: number;
  badgeVariant: BadgeVariant;
  badgePrefix: string;
  badgeLabel: string;
  badgeIconUrl: string;
  durationMs: number;
  playbackRate: number;
  glowColor: string;
  glowSize: number;
  rimColor: string;
  grayColor: string;
  layers: LayerTransforms;
};
