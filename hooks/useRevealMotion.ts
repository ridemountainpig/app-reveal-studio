import { useEffect } from "react";
import type { MutableRefObject } from "react";
import { animate, useMotionValue, useTransform } from "framer-motion";
import { clamp, getSegmentProgress } from "../utils/revealMath";
import type { NumericMotionValue } from "../types/reveal";

export function useTimeline(
  durationMs: number,
  prefersReducedMotion: boolean,
  restartKey: string,
  timelineRef?: MutableRefObject<{ set: (value: number) => void } | null>,
) {
  const timeline = useMotionValue(prefersReducedMotion ? 1 : 0);

  useEffect(() => {
    if (timelineRef) {
      timelineRef.current = { set: (value: number) => timeline.set(value) };
    }
  }, [timeline, timelineRef]);

  useEffect(() => {
    if (prefersReducedMotion) {
      timeline.set(1);
      return;
    }

    if (timelineRef) {
      timeline.set(0);
      return;
    }

    timeline.set(0);
    const controls = animate(timeline, 1, {
      duration: durationMs / 1000,
      ease: "linear",
    });

    return () => controls.stop();
  }, [durationMs, prefersReducedMotion, restartKey, timeline, timelineRef]);

  return timeline;
}

export function useAnimationValues(
  timeline: NumericMotionValue,
  prefersReducedMotion: boolean,
  playbackRate: number,
) {
  const toScaledValue = (value: number) => clamp(value * playbackRate, 0, 1);

  const revealProgress = useTransform(timeline, (value: number) =>
    prefersReducedMotion ? 1 : getSegmentProgress(toScaledValue(value)),
  );
  const delayedReveal = useTransform(timeline, (value: number) => {
    if (prefersReducedMotion) return 1;
    const scaledValue = toScaledValue(value);
    return getSegmentProgress(clamp((scaledValue - 0.05) / 0.95, 0, 1));
  });
  const bloomProgress = useTransform(revealProgress, (value: number) =>
    prefersReducedMotion ? 1 : clamp((value - 0.68) / 0.32, 0, 1),
  );
  const iconRevealProgress = useTransform(timeline, (value: number) => {
    if (prefersReducedMotion) return 1;
    const scaledValue = toScaledValue(value);
    return getSegmentProgress(clamp((scaledValue - 0.16) / 0.84, 0, 1));
  });
  const iconDelayedReveal = useTransform(timeline, (value: number) => {
    if (prefersReducedMotion) return 1;
    const scaledValue = toScaledValue(value);
    return getSegmentProgress(clamp((scaledValue - 0.2) / 0.8, 0, 1));
  });

  return {
    revealProgress,
    delayedReveal,
    bloomProgress,
    iconRevealProgress,
    iconDelayedReveal,
  };
}
