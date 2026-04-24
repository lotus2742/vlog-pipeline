import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { BackgroundDecor } from "./BackgroundDecor";
import { NOISY_HEAVY_TYPES, THEME_ACCENT, THEME_BG } from "./constants";
import { SlideBody, SlideCaption } from "./slides";
import type { VlogFramesProps } from "./types";
import { buildBackgroundTopicWords, getCurrentSlideType } from "./utils";

export type { SlideSpec, VlogFrame, VlogFramesProps } from "./types";

export const VlogFramesComposition: React.FC<VlogFramesProps> = ({ meta, slides }) => {
  const frame = useCurrentFrame();
  const themeKey = String(meta?.theme || "purple").toLowerCase();
  const bgStyle = String(meta?.bgStyle || "cinematic").toLowerCase();
  const cinematic = bgStyle !== "classic";
  const bg = THEME_BG[themeKey] ?? THEME_BG.purple;
  const isLight = themeKey === "light";
  const accent = THEME_ACCENT[themeKey] ?? THEME_ACCENT.purple;
  const [bgWordA, bgWordB] = buildBackgroundTopicWords(meta?.topic, slides);
  const currentSlideType = getCurrentSlideType(slides, frame);
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
      <BackgroundDecor
        frame={frame}
        isLight={isLight}
        cinematic={cinematic}
        accent={accent}
        noiseFactor={noiseFactor}
        lowNoiseMode={lowNoiseMode}
        bgWordA={bgWordA}
        bgWordB={bgWordB}
        topic={meta?.topic}
      />
      {slides.map((slide) => {
        const dur = Math.max(15, slide.durationInFrames);
        const isLastSlide = slide.id === slides[slides.length - 1]?.id;
        const seq = (
          <Sequence key={slide.id} from={from} durationInFrames={dur}>
            {slide.audioSrc ? <Audio src={staticFile(slide.audioSrc)} /> : null}
            <AbsoluteFill style={{ top: isLastSlide ? -36 : 24 }}>
              <SlideBody slide={slide} themeKey={themeKey} />
            </AbsoluteFill>
            <SlideCaption slide={slide} />
          </Sequence>
        );
        from += dur;
        return seq;
      })}
    </AbsoluteFill>
  );
};
