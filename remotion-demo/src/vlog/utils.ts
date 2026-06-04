import { Easing, interpolate, useCurrentFrame } from "remotion";
import { firstSlideTypeAtFrame } from "./constants";
import type { SlideSpec } from "./types";

export const useEnter = () => {
  const frame = useCurrentFrame();
  return interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.bezier(0.22, 1, 0.36, 1)),
  });
};

export const staggerOpacity = (frame: number, index: number, start = 0, step = 6, duration = 12) =>
  interpolate(frame, [start + index * step, start + index * step + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const getCurrentSlideType = (slides: SlideSpec[], frame: number): string => firstSlideTypeAtFrame(slides, frame);

export const getCurrentSlideAtFrame = (slides: SlideSpec[], frame: number): SlideSpec | null => {
  let start = 0;
  for (const slide of slides) {
    const dur = Math.max(15, slide.durationInFrames);
    if (frame >= start && frame < start + dur) return slide;
    start += dur;
  }
  return slides.length ? slides[slides.length - 1] : null;
};
