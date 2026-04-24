import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { SlideSpec } from "../types";

export const SlideCaption: React.FC<{ slide: SlideSpec }> = ({ slide }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cues = Array.isArray(slide.captions) ? slide.captions : [];
  const active = cues.find((c) => t >= c.start && t <= c.end);
  if (!active) return null;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", pointerEvents: "none" }}>
      <div style={{ marginBottom: 30, maxWidth: "88%", borderRadius: 12, background: "rgba(0,0,0,0.65)", border: "1px solid rgba(255,255,255,0.16)", padding: "10px 16px", color: "#f8fafc", fontSize: 28, fontWeight: 600, lineHeight: 1.35, textAlign: "center", textShadow: "0 2px 12px rgba(0,0,0,0.55)" }}>
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
