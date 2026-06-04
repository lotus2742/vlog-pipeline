import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BackgroundDecor } from "./BackgroundDecor";
import { captionZoneContainerStyle, contentBoundsStyle, useVlogCaptionLayout } from "./captionLayout";
import { EngagementCta } from "./EngagementCta";
import { NOISY_HEAVY_TYPES, THEME_ACCENT, THEME_BG } from "./constants";
import { SlideBody, SlideCaption } from "./slides";
import type { VlogFramesProps } from "./types";
import { SectionProgressBar } from "./SectionProgressBar";
import { getCurrentSlideAtFrame, getCurrentSlideType } from "./utils";

export type { SlideSpec, VlogFrame, VlogFramesProps } from "./types";

export const VlogFramesComposition: React.FC<VlogFramesProps> = ({ meta, slides, aspectRatio }) => {
  const bgStyle = String(meta?.bgStyle || "cinematic").toLowerCase();
  const minimal = bgStyle === "minimal" || bgStyle === "douyin";
  const cinematicSafe = bgStyle === "cinematic-safe" || bgStyle === "cinematic_safe";
  const portraitLayout = aspectRatio === "9:16";
  const douyinCaption = portraitLayout || bgStyle === "douyin";
  const { portrait, zoneH } = useVlogCaptionLayout(aspectRatio, douyinCaption ? "douyin" : "vlog");
  const captionH = meta?.hideCaptions ? 0 : zoneH;
  const frame = useCurrentFrame();
  const themeKey = String(meta?.theme || "purple").toLowerCase();
  const showDecor = !minimal && bgStyle !== "classic";
  const cinematic = showDecor && !cinematicSafe;
  const bg = minimal ? "#0a0a0f" : (THEME_BG[themeKey] ?? THEME_BG.purple);
  const isLight = themeKey === "light";
  const accent = THEME_ACCENT[themeKey] ?? THEME_ACCENT.purple;
  const currentSlide = getCurrentSlideAtFrame(slides, frame);
  const currentSlideType = getCurrentSlideType(slides, frame);
  const sectionProgress = currentSlide?.frame?.sectionProgress;
  const lowNoiseMode = NOISY_HEAVY_TYPES.has(currentSlideType);
  const noiseFactor = lowNoiseMode ? 0.76 : 1;

  let from = 0;
  return (
    <AbsoluteFill
      style={{
        background: bg,
        fontFamily: "system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif",
        color: isLight ? "#0f172a" : "#fafafa",
      }}
    >
      {showDecor ? (
      <BackgroundDecor
        frame={frame}
        isLight={isLight}
        cinematic={cinematic}
        safe={cinematicSafe}
        accent={accent}
        noiseFactor={noiseFactor}
        lowNoiseMode={lowNoiseMode}
        topic={meta?.topic}
      />
      ) : null}
      {meta?.engagementCta !== false ? <EngagementCta isLight={isLight} /> : null}
      {sectionProgress ? <SectionProgressBar spec={sectionProgress} isLight={isLight} /> : null}
      {slides.map((slide) => {
        const dur = Math.max(15, slide.durationInFrames);
        const seq = (
          <Sequence key={slide.id} from={from} durationInFrames={dur}>
            {slide.audioSrc ? <Audio src={staticFile(slide.audioSrc)} /> : null}
            <div style={contentBoundsStyle(captionH, portrait ? 0 : minimal ? 0 : cinematicSafe ? 20 : 24)}>
              <SlideBody slide={slide} themeKey={themeKey} />
            </div>
            {!meta?.hideCaptions ? (
              <div style={captionZoneContainerStyle(captionH)}>
                <SlideCaption slide={slide} aspectRatio={aspectRatio} meta={meta} />
              </div>
            ) : null}
          </Sequence>
        );
        from += dur;
        return seq;
      })}
    </AbsoluteFill>
  );
};
