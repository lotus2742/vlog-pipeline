import { useVideoConfig } from "remotion";

/** 顶栏设计稿基准高度（缩放比 = headerH / 此值） */
export const HOTLIST_HEADER_DESIGN_H = 56;

/** optimized-slide-v4.svg 设计稿尺寸 */
export const SVG_ARTBOARD = {
  width: 680,
  height: 580,
  headerH: 76,
  contentH: 504,
} as const;

/** 内容区坐标（已减去 header 76px） */
export const SVG_CONTENT = {
  padX: 24,
  rank: { x: 24, y: 20, w: 72, h: 32, radius: 8 },
  projectName: { x: 24, y: 70 },
  /** 项目名末行与 Star 行之间的间距（内容区 px） */
  projectNameStarGap: 3,
  starRow: { x: 24, y: 108 },
  desc: { x: 24, y: 149, lineHeight: 30 },
  /** 描述末行与标签行之间的最小间距（内容区 px） */
  descTagGap: 16,
  tags: { x: 24, y: 219, h: 26, radius: 13, gap: 8 },
  /** 标签行与作者区之间的最小间距 */
  tagAuthorGap: 14,
  author: { x: 24, y: 264, avatarR: 18 },
  rightCol: { x: 480, y: 20, barW: 156, barH: 10 },
  kingBadge: { w: 92, h: 26, radius: 6 },
  metricY: 70,
  labelY: 95,
  barY: 115,
  scaleY: 135,
  footer: { x: 24, y: 324, w: 632, h: 80, radius: 10, padX: 24, lineHeight: 24 },
} as const;

export type HotlistLayout = {
  width: number;
  height: number;
  headerH: number;
  sx: number;
  sy: number;
  padX: number;
  /** 内容区 y = headerH + relY * sy */
  cy: (relY: number) => number;
  cx: (relX: number) => number;
};

export const useHotlistLayout = (): HotlistLayout => {
  const { width, height } = useVideoConfig();
  const headerH = SVG_ARTBOARD.headerH;
  const sx = width / SVG_ARTBOARD.width;
  const sy = (height - headerH) / SVG_ARTBOARD.contentH;
  const padX = SVG_CONTENT.padX * sx;
  return {
    width,
    height,
    headerH,
    sx,
    sy,
    padX,
    cy: (relY) => headerH + relY * sy,
    cx: (relX) => relX * sx,
  };
};
