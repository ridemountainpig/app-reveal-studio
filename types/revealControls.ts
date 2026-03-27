export type BadgeVariant = "custom" | "appStore" | "googlePlay";

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
  rimColor: string;
  grayColor: string;
};
