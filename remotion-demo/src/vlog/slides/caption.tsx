import { useCurrentFrame, useVideoConfig } from "remotion";
import { useVlogCaptionLayout } from "../captionLayout";
import type { SlideSpec } from "../types";

const CYAN = "#00f0ff";

export const SlideCaption: React.FC<{
  slide: SlideSpec;
  aspectRatio?: string;
  meta?: { hideCaptions?: boolean; bgStyle?: string };
}> = ({ slide, aspectRatio, meta }) => {
  if (meta?.hideCaptions) return null;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bgStyle = String(meta?.bgStyle || "").toLowerCase();
  const portrait = aspectRatio === "9:16";
  /** minimal 仅表示纯黑底；抖音字幕样式仅用于竖屏 9:16 或 douyin-text 镜 */
  const isDouyin =
    slide.type === "douyin-text" || portrait || bgStyle === "douyin";
  const { metrics } = useVlogCaptionLayout(aspectRatio, isDouyin ? "douyin" : "vlog");
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
        paddingBottom: metrics.insetBottom,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          maxWidth: isDouyin ? "92%" : "88%",
          width: isDouyin ? "92%" : undefined,
          borderRadius: isDouyin ? 8 : 12,
          background: isDouyin ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.65)",
          border: isDouyin ? `1px solid rgba(0,240,255,0.35)` : "1px solid rgba(255,255,255,0.16)",
          borderLeft: isDouyin ? `3px solid ${CYAN}` : undefined,
          padding: `${metrics.padY}px ${metrics.padX}px`,
          color: "#f8fafc",
          fontSize: metrics.fontSize,
          fontWeight: isDouyin ? 700 : 600,
          lineHeight: metrics.lineHeight,
          textAlign: "center",
          textShadow: isDouyin ? `0 0 12px rgba(0,240,255,0.25), 0 2px 8px rgba(0,0,0,0.6)` : "0 2px 12px rgba(0,0,0,0.55)",
          boxShadow: isDouyin ? "0 4px 24px rgba(0,0,0,0.45)" : undefined,
        }}
      >
        {active.text}
      </div>
    </div>
  );
};
