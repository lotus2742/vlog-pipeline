import { Easing, interpolate, useCurrentFrame } from "remotion";
import { TOPIC_FALLBACK, TOPIC_TOKEN_MAP, firstSlideTypeAtFrame } from "./constants";
import type { SlideSpec } from "./types";

const extractAsciiTopicTokens = (text: string): string[] => {
  const raw = String(text || "")
    .toUpperCase()
    .match(/[A-Z][A-Z0-9+#-]{1,24}/g);
  if (!raw) return [];
  const stop = new Set(["THE", "AND", "WITH", "FROM", "FOR", "THIS", "THAT", "VIDEO"]);
  return raw.filter((t) => !stop.has(t));
};

export const buildBackgroundTopicWords = (metaTopic: string | undefined, slides: SlideSpec[]): [string, string] => {
  const sources = [String(metaTopic || ""), ...slides.slice(0, 4).map((s) => String(s.frame?.title || ""))];
  const merged = sources.join(" ");
  const picked: string[] = [];

  for (const item of TOPIC_TOKEN_MAP) {
    if (item.pattern.test(merged)) picked.push(item.label);
    if (picked.length >= 2) break;
  }
  if (picked.length < 2) {
    for (const t of extractAsciiTopicTokens(merged)) {
      if (!picked.includes(t)) picked.push(t);
      if (picked.length >= 2) break;
    }
  }
  if (picked.length === 0) return TOPIC_FALLBACK;
  if (picked.length === 1) return [picked[0], TOPIC_FALLBACK[1]];
  return [picked[0], picked[1]];
};

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
