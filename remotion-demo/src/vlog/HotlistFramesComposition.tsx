import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { captionZoneContainerStyle, contentBoundsStyle, useHotlistCaptionLayout } from "./captionLayout";
import { HotlistCaption } from "./hotlist/HotlistCaption";
import { HotlistChrome } from "./hotlist/HotlistChrome";
import { HotlistWatermark } from "./hotlist/HotlistWatermark";
import { isHotlistVideo, normalizeHotlistProps } from "./hotlist/detect";
import { HotlistSlideBody } from "./hotlist/slides";
import { HOTLIST_THEME } from "./hotlist/theme";
import type { VlogFramesProps } from "./types";
import { VlogFramesComposition } from "./VlogFramesComposition";

export type { SlideSpec, VlogFrame, VlogFramesProps } from "./types";

export const HotlistFramesComposition: React.FC<VlogFramesProps> = (rawProps) => {
  const { meta, slides } = normalizeHotlistProps(rawProps);
  const { zoneH } = useHotlistCaptionLayout();
  let from = 0;

  return (
    <AbsoluteFill
      style={{
        background: HOTLIST_THEME.bg,
        fontFamily: "system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif",
        color: HOTLIST_THEME.title,
      }}
    >
      <HotlistWatermark
        topic={meta?.topic}
        isLight={String(meta?.theme || "light").toLowerCase() !== "dark"}
      />
      <HotlistChrome topic={meta?.topic} />
      {slides.map((slide) => {
        const dur = Math.max(15, slide.durationInFrames);
        const seq = (
          <Sequence key={slide.id} from={from} durationInFrames={dur}>
            {slide.audioSrc ? <Audio src={staticFile(slide.audioSrc)} /> : null}
            <div style={contentBoundsStyle(zoneH)}>
              <HotlistSlideBody slide={slide} />
            </div>
            <div style={captionZoneContainerStyle(zoneH)}>
              <HotlistCaption slide={slide} />
            </div>
          </Sequence>
        );
        from += dur;
        return seq;
      })}
    </AbsoluteFill>
  );
};

/** 根据 props 选择榜单或常规合成（供 Root 统一 component 使用） */
export const VlogOrHotlistComposition: React.FC<VlogFramesProps> = (props) => {
  if (isHotlistVideo(props)) {
    return <HotlistFramesComposition {...props} />;
  }
  return <VlogFramesComposition {...props} />;
};
