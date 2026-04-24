import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { staggerOpacity, useEnter } from "../utils";

export const ComparisonSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const left = frame.left || {};
  const right = frame.right || {};
  const lPts = Array.isArray(left.points) ? left.points : [];
  const rPts = Array.isArray(right.points) ? right.points : [];
  return (
    <AbsoluteFill style={{ padding: "52px 60px", opacity }}>
      <div style={{ fontSize: 42, fontWeight: 800, color: colors.primary, marginBottom: 26 }}>{frame.title}</div>
      <div style={{ display: "flex", gap: 28, flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, borderRadius: 20, padding: 24, background: colors.card, border: "1px solid rgba(34,211,238,0.25)", opacity: staggerOpacity(localFrame, 0) }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#22d3ee", marginBottom: 14 }}>{left.label || left.title || "左侧"}</div>
          {lPts.length ? <ul style={{ margin: 0, paddingLeft: 22, color: colors.muted, fontSize: 24, lineHeight: 1.55 }}>{lPts.map((p, i) => <li key={i}>{p}</li>)}</ul> : <div style={{ color: colors.muted, fontSize: 22 }}>（无要点，见下方结论）</div>}
        </div>
        <div style={{ flex: 1, borderRadius: 20, padding: 24, background: colors.card, border: "1px solid rgba(251,146,60,0.25)", opacity: staggerOpacity(localFrame, 1) }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#fb923c", marginBottom: 14 }}>{right.label || right.title || "右侧"}</div>
          {rPts.length ? <ul style={{ margin: 0, paddingLeft: 22, color: colors.muted, fontSize: 24, lineHeight: 1.55 }}>{rPts.map((p, i) => <li key={i}>{p}</li>)}</ul> : <div style={{ color: colors.muted, fontSize: 22 }}>（无要点，见下方结论）</div>}
        </div>
      </div>
      {frame.insight ? <div style={{ marginTop: 22, fontSize: 24, color: colors.muted, padding: "16px 20px", borderRadius: 14, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.08)", opacity: staggerOpacity(localFrame, 2) }}>{frame.insight}</div> : null}
    </AbsoluteFill>
  );
};
