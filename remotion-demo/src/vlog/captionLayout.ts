import type { CSSProperties } from "react";
import { useVideoConfig } from "remotion";
import { SVG_ARTBOARD } from "./hotlist/layoutSpec";

/** 常规 vlog 底部字幕条样式（横屏 / 竖屏） */
export const VLOG_CAPTION = {
  landscape: {
    fontSize: 28,
    lineHeight: 1.35,
    padY: 10,
    padX: 16,
    insetBottom: 20,
    maxLines: 2,
    zonePadTop: 8,
  },
  portrait: {
    fontSize: 32,
    lineHeight: 1.35,
    padY: 12,
    padX: 18,
    insetBottom: 56,
    maxLines: 2,
    zonePadTop: 16,
  },
  /** 抖音竖屏：底部留白避开平台 UI */
  douyin: {
    fontSize: 30,
    lineHeight: 1.4,
    padY: 10,
    padX: 20,
    insetBottom: 96,
    maxLines: 2,
    zonePadTop: 10,
  },
} as const;

/** 热榜字幕条（随 sx 缩放） */
export const HOTLIST_CAPTION = {
  fontSize: 14,
  lineHeight: 1.35,
  padY: 5,
  padX: 12,
  insetBottom: 10,
  maxLines: 2,
  zonePadTop: 8,
} as const;

export type CaptionVariant = "vlog" | "hotlist" | "douyin";

const zoneFromMetrics = (m: {
  fontSize: number;
  lineHeight: number;
  padY: number;
  insetBottom: number;
  maxLines: number;
  zonePadTop: number;
  scale?: number;
}): number => {
  const scale = m.scale ?? 1;
  const lineH = m.fontSize * scale * m.lineHeight;
  const box = m.padY * 2 * scale + lineH * m.maxLines;
  return Math.ceil(m.insetBottom * scale + box + m.zonePadTop * scale);
};

/** 底部字幕保护区高度（内容区 bottom 应 ≥ 此值） */
export const captionZoneHeight = (opts: {
  portrait?: boolean;
  variant?: CaptionVariant;
  sx?: number;
}): number => {
  if (opts.variant === "hotlist") {
    const sx = opts.sx ?? 1;
    return zoneFromMetrics({ ...HOTLIST_CAPTION, scale: sx });
  }
  if (opts.variant === "douyin") {
    return zoneFromMetrics(VLOG_CAPTION.douyin);
  }
  const s = opts.portrait ? VLOG_CAPTION.portrait : VLOG_CAPTION.landscape;
  return zoneFromMetrics(s);
};

/** 内容区：占满除字幕区外的画布，slide 在内部正常排版 */
export const contentBoundsStyle = (captionH: number, top = 0): CSSProperties => ({
  position: "absolute",
  top,
  left: 0,
  right: 0,
  width: "100%",
  height: `calc(100% - ${top + captionH}px)`,
  zIndex: 1,
});

/** 底部字幕专用层（仅在此高度内渲染字幕） */
export const captionZoneContainerStyle = (captionH: number): CSSProperties => ({
  position: "absolute",
  left: 0,
  right: 0,
  bottom: 0,
  /** 覆盖 AbsoluteFill 默认 top:0，否则 height 会从顶部算起 */
  top: "auto",
  width: "100%",
  height: captionH,
  display: "flex",
  justifyContent: "center",
  alignItems: "flex-end",
  pointerEvents: "none",
  zIndex: 30,
});

export const useVlogCaptionLayout = (aspectRatio?: string, variant?: CaptionVariant) => {
  const { height, width } = useVideoConfig();
  const portrait = aspectRatio === "9:16" || height > width;
  const isDouyin = variant === "douyin";
  const zoneH = isDouyin
    ? captionZoneHeight({ variant: "douyin" })
    : captionZoneHeight({ portrait });
  const metrics = isDouyin ? VLOG_CAPTION.douyin : portrait ? VLOG_CAPTION.portrait : VLOG_CAPTION.landscape;
  return { portrait, zoneH, metrics, isDouyin };
};

export const useHotlistCaptionLayout = () => {
  const { width } = useVideoConfig();
  const sx = width / SVG_ARTBOARD.width;
  const zoneH = captionZoneHeight({ variant: "hotlist", sx });
  return { sx, zoneH, metrics: HOTLIST_CAPTION };
};
