import type { SlideSpec } from "./types";

export const THEME_BG: Record<string, string> = {
  purple: "linear-gradient(145deg, #12081c 0%, #2a1040 45%, #4c1d95 100%)",
  ocean: "linear-gradient(145deg, #041a24 0%, #0c4a6e 50%, #155e75 100%)",
  dark: "linear-gradient(145deg, #0a0a0a 0%, #171717 50%, #262626 100%)",
  light: "linear-gradient(145deg, #f8fafc 0%, #e2e8f0 55%, #cbd5e1 100%)",
};

export const THEME_TEXT = {
  purple: { primary: "#faf5ff", muted: "rgba(250,245,255,0.78)", card: "rgba(255,255,255,0.08)" },
  ocean: { primary: "#ecfeff", muted: "rgba(236,254,255,0.8)", card: "rgba(255,255,255,0.08)" },
  dark: { primary: "#fafafa", muted: "rgba(250,250,250,0.75)", card: "rgba(255,255,255,0.06)" },
  light: { primary: "#0f172a", muted: "rgba(15,23,42,0.72)", card: "rgba(15,23,42,0.06)" },
} as const;

export const THEME_ACCENT: Record<string, string> = {
  purple: "rgba(167, 139, 250, 0.26)",
  ocean: "rgba(34, 211, 238, 0.24)",
  dark: "rgba(56, 189, 248, 0.2)",
  light: "rgba(59, 130, 246, 0.16)",
};

export const BIG_DIPPER_STARS = [
  { x: 170, y: 118 },
  { x: 220, y: 152 },
  { x: 286, y: 162 },
  { x: 312, y: 124 },
  { x: 374, y: 106 },
  { x: 442, y: 94 },
  { x: 512, y: 86 },
];

export const GEMINI_STARS = [
  { x: 86, y: 474 },
  { x: 130, y: 442 },
  { x: 178, y: 446 },
  { x: 214, y: 478 },
  { x: 162, y: 514 },
  { x: 114, y: 512 },
];

export const LIBRA_STARS = [
  { x: 1190, y: 386 },
  { x: 1138, y: 414 },
  { x: 1098, y: 450 },
  { x: 1048, y: 468 },
  { x: 1006, y: 446 },
  { x: 960, y: 470 },
  { x: 920, y: 508 },
];

export const STAR_NOISE_POINTS = Array.from({ length: 42 }, (_, i) => {
  const nx = (Math.sin(i * 91.7) + 1) / 2;
  const ny = (Math.sin(i * 57.3 + 1.2) + 1) / 2;
  const ns = (Math.sin(i * 33.1 + 2.1) + 1) / 2;
  const na = (Math.sin(i * 73.9 + 0.8) + 1) / 2;
  return { x: 40 + nx * 1200, y: 36 + ny * 648, r: 0.55 + ns * 1.05, a: 0.035 + na * 0.08, phase: i * 11 };
});

export const NOISY_HEAVY_TYPES = new Set(["comparison", "kpi", "bullets"]);

export const TOPIC_TOKEN_MAP: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /llm|大模型|语言模型/i, label: "LLM" },
  { pattern: /rag|检索|召回|重排/i, label: "RAG" },
  { pattern: /agent|智能体/i, label: "AGENT" },
  { pattern: /prompt|提示词/i, label: "PROMPT" },
  { pattern: /function\s*calling|工具调用/i, label: "FUNCTION CALLING" },
  { pattern: /multi[- ]?agent|多agent|多智能体/i, label: "MULTI AGENT" },
  { pattern: /memory|记忆|状态/i, label: "MEMORY" },
  { pattern: /performance|性能|延迟/i, label: "PERFORMANCE" },
  { pattern: /cost|成本|token/i, label: "COST CONTROL" },
  { pattern: /安全|security|注入/i, label: "SECURITY" },
];

export const TOPIC_FALLBACK: [string, string] = ["AI AGENT", "VLOG PIPELINE"];

export const firstSlideTypeAtFrame = (slides: SlideSpec[], frame: number): string => {
  let start = 0;
  for (const slide of slides) {
    const dur = Math.max(15, slide.durationInFrames);
    if (frame >= start && frame < start + dur) return String(slide.type || "").toLowerCase();
    start += dur;
  }
  return String(slides[slides.length - 1]?.type || "").toLowerCase();
};
