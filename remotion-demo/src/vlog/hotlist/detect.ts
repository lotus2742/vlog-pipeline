import type { SlideSpec, VlogFramesProps } from "../types";

const HOTLIST_SLIDE_TYPES = new Set([
  "hotlist-cover",
  "hotlist-project",
  "hotlist-outro",
  "hotlist-table",
]);

const LEGACY_HOTLIST_STYLES = new Set([
  "hotlist-cover",
  "hotlist-project",
  "hotlist-outro",
  "hotlist-table",
]);

/** 是否为榜单专用视频（与常规 vlog 分离） */
export const isHotlistVideo = (props: VlogFramesProps): boolean => {
  const vt = String(props.videoType ?? props.meta?.videoType ?? "").toLowerCase();
  if (vt === "hotlist") return true;
  return (props.slides ?? []).some((slide) => isHotlistSlide(slide));
};

export const isHotlistSlide = (slide: SlideSpec): boolean => {
  const type = String(slide.type || "").toLowerCase();
  if (HOTLIST_SLIDE_TYPES.has(type)) return true;
  const style = String(slide.frame?.style || "").toLowerCase();
  return LEGACY_HOTLIST_STYLES.has(style);
};

/** 将 hook/kpi + style=hotlist-* 规范为独立 slide type */
export const normalizeHotlistSlide = (slide: SlideSpec): SlideSpec => {
  const frame = slide.frame ?? {};
  const style = String(frame.style || "").toLowerCase();
  let type = String(slide.type || "").toLowerCase();

  if (HOTLIST_SLIDE_TYPES.has(type)) {
    return { ...slide, type, frame };
  }

  if (LEGACY_HOTLIST_STYLES.has(style)) {
    type = style;
  } else if (type === "kpi" && style === "hotlist-project") {
    type = "hotlist-project";
  } else if (type === "hook" && LEGACY_HOTLIST_STYLES.has(style)) {
    type = style;
  }

  return { ...slide, type, frame };
};

export const normalizeHotlistProps = (props: VlogFramesProps): VlogFramesProps => {
  if (!isHotlistVideo(props)) return props;
  const slides = (props.slides ?? []).map(normalizeHotlistSlide);
  const meta = {
    ...props.meta,
    videoType: "hotlist" as const,
    aspectRatio: "16:9" as const,
    engagementCta: false,
    bgStyle: "classic",
    theme: "light",
  };
  return {
    ...props,
    videoType: "hotlist",
    aspectRatio: "16:9",
    meta,
    slides,
  };
};
