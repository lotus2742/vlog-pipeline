import { useCurrentFrame, useVideoConfig } from "remotion";
import { useHotlistCaptionLayout } from "../captionLayout";
import type { SlideSpec } from "../types";
import { HOTLIST_THEME } from "./theme";

/** 榜单视频字幕：浅色底深色条，适配白底画面 */
export const HotlistCaption: React.FC<{ slide: SlideSpec }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { sx, metrics } = useHotlistCaptionLayout();
  const t = frame / fps;
  const cues = Array.isArray(slide.captions) ? slide.captions : [];
  const active = cues.find((c) => t >= c.start && t <= c.end);
  if (!active) return null;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-end",
        paddingBottom: metrics.insetBottom * sx,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: "86%",
          borderRadius: 6 * sx,
          background: HOTLIST_THEME.captionBg,
          padding: `${metrics.padY * sx}px ${metrics.padX * sx}px`,
          color: "#f8fafc",
          fontSize: metrics.fontSize * sx,
          fontWeight: 600,
          lineHeight: metrics.lineHeight,
          textAlign: "center",
        }}
      >
        {active.text}
      </div>
    </div>
  );
};
