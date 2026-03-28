import type { BadgeVariant } from "../types/revealControls";

type BadgeVariantOption = {
  value: BadgeVariant;
  label: string;
  description: string;
};

type BadgePreset = {
  src: string;
  alt: string;
};

export const badgeVariantOptions: BadgeVariantOption[] = [
  {
    value: "custom",
    label: "Custom",
    description: "Build a badge with your own prefix, label, and icon.",
  },
  {
    value: "bothStores",
    label: "Both stores",
    description: "Show App Store and Google Play badges side by side.",
  },
  {
    value: "appStore",
    label: "App Store",
    description: "Use the built-in iOS download badge.",
  },
  {
    value: "googlePlay",
    label: "Google Play",
    description: "Use the built-in Android download badge.",
  },
];

export const badgeVariantValues = badgeVariantOptions.map(
  (option) => option.value,
);

const badgePresets: Record<"appStore" | "googlePlay", BadgePreset> = {
  appStore: {
    src: "/app-store-download.png",
    alt: "Download on the App Store",
  },
  googlePlay: {
    src: "/google-play-download.png",
    alt: "Get it on Google Play",
  },
};

export function getBadgePreset(variant: BadgeVariant): BadgePreset | null {
  if (variant === "custom" || variant === "bothStores") {
    return null;
  }

  return badgePresets[variant];
}

/** Store-asset badge row: one or both official download badges. */
export function getStoreBadgePresets(variant: BadgeVariant): BadgePreset[] {
  if (variant === "custom") {
    return [];
  }

  if (variant === "bothStores") {
    return [badgePresets.appStore, badgePresets.googlePlay];
  }

  return [badgePresets[variant]];
}

export function isBadgeVariant(value: string): value is BadgeVariant {
  return badgeVariantValues.includes(value as BadgeVariant);
}
