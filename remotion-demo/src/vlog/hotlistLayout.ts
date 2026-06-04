import { captionZoneHeight } from "./captionLayout";

/** 热榜内容区整体下移（相对 topic 条） */
export const HOTLIST_CONTENT_OFFSET_Y = 10;

/** 9:16 热榜竖屏安全区（抖音字幕区预留） */
export const HOTLIST_PORTRAIT = {
  /** 顶部 topic 条 + 呼吸间距 */
  padTop: 92,
  padX: 36,
  /** 底部字幕 + 缓冲（竖屏按 1080 宽估算 sx≈1.59） */
  captionReserve: Math.max(168, captionZoneHeight({ variant: "hotlist", sx: 1080 / 680 })),
  titleFs: 44,
  rankFs: 26,
  /** 项目简介主文案 */
  hookLineFs: 32,
  /** 项目标签 pill */
  tagFs: 22,
  metaFs: 18,
  starFs: 22,
  authorFs: 21,
  headerPad: "24px 24px",
  /** 头部卡片内：排名行 / 标题 / Star / 标签 / 作者 之间的间距 */
  headerRowGap: 18,
  headerTagGap: 12,
  rankTitleGap: 16,
  stackGap: 18,
} as const;

/** 16:9 热榜横屏版式 */
export const HOTLIST_LANDSCAPE = {
  hookLineFs: 32,
  titleFs: 42,
  authorFs: 20,
  tagFs: 18,
  metaFs: 16,
  starFs: 20,
  headerRowGap: 14,
  headerTagGap: 10,
  stackGap: 14,
} as const;

export const hotlistPortraitPad = () => ({
  paddingTop: HOTLIST_PORTRAIT.padTop + HOTLIST_CONTENT_OFFSET_Y,
  paddingLeft: HOTLIST_PORTRAIT.padX,
  paddingRight: HOTLIST_PORTRAIT.padX,
  paddingBottom: HOTLIST_PORTRAIT.captionReserve,
  boxSizing: "border-box" as const,
});

export const hotlistLandscapePad = (top: number, sides = 56, bottom = 88) => ({
  padding: `${top + HOTLIST_CONTENT_OFFSET_Y}px ${sides}px ${bottom}px`,
  boxSizing: "border-box" as const,
});

/** 本周增速条：相对榜首留 headroom，榜首也不顶满 */
export const growthBarRatio = (
  weekly: number,
  maxWeekly: number,
  opts?: { headroom?: number; cap?: number },
): number => {
  const headroom = opts?.headroom ?? 1.25;
  const cap = opts?.cap ?? 0.82;
  if (weekly <= 0 || maxWeekly <= 0) return 0;
  return Math.min(cap, weekly / (maxWeekly * headroom));
};

/** 与 VlogFramesComposition 一致：竖屏画布 */
export const isHotlistPortrait = (width: number, height: number) => height > width;

export const formatRankLabel = (rank: string) => {
  const n = parseInt(rank, 10);
  if (Number.isFinite(n)) return `第 ${String(n).padStart(2, "0")} 名`;
  return rank ? `第 ${rank} 名` : "";
};
