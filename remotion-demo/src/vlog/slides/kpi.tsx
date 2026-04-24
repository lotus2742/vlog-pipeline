import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { staggerOpacity, useEnter } from "../utils";

export const KpiSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const kpis = Array.isArray(frame.kpis) ? frame.kpis : [];
  const trendPts = Array.isArray(frame.trend_points) ? frame.trend_points : [];
  const showDashboard = kpis.length >= 3 && (Boolean(frame.trend_title?.trim()) || trendPts.length > 0);
  const pulse = interpolate(localFrame % 90, [0, 45, 89], [0.88, 1, 0.88], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  if (kpis.length && showDashboard) {
    return (
      <AbsoluteFill style={{ padding: "30px 36px 96px", opacity }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: colors.primary, marginBottom: 12 }}>{frame.title}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1, minHeight: 0 }}>
          <div style={{ flex: "0 0 auto", display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
            {kpis.map((k, i) => (
              <div key={i} style={{ minWidth: 124, flex: "1 1 44%", borderRadius: 16, padding: "11px 12px", background: colors.card, border: "1px solid rgba(255,255,255,0.1)", opacity: staggerOpacity(localFrame, i) }}>
                <div style={{ fontSize: 15, color: colors.muted }}>{k.title}</div>
                <div style={{ fontSize: 27, fontWeight: 800, color: "#34d399", marginTop: 2 }}>{k.value}{k.unit ? <span style={{ fontSize: 16, fontWeight: 600 }}> {k.unit}</span> : null}</div>
              </div>
            ))}
          </div>
          <div style={{ flex: "1 1 auto", borderRadius: 18, padding: "12px 12px 10px", background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)", border: "1px solid rgba(255,255,255,0.16)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, padding: "0 2px 6px", borderBottom: "1px solid rgba(255,255,255,0.12)" }}>
              <div style={{ fontSize: 12, letterSpacing: 1.2, fontWeight: 700, color: "rgba(148,163,184,0.95)" }}>TREND PANEL</div>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: "#34d399", boxShadow: "0 0 10px rgba(52,211,153,0.9)", transform: `scale(${pulse})` }} />
            </div>
            {frame.trend_title ? <div style={{ fontSize: 17, fontWeight: 700, color: colors.primary, marginBottom: 6, lineHeight: 1.35 }}>{frame.trend_title}</div> : null}
            <div style={{ position: "relative", height: 56, borderRadius: 12, marginBottom: 8, background: "linear-gradient(180deg, rgba(15,23,42,0.32) 0%, rgba(15,23,42,0.14) 100%)", border: "1px solid rgba(148,163,184,0.2)", overflow: "hidden" }}>
              <svg viewBox="0 0 240 68" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                <defs><linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#34d399" /></linearGradient></defs>
                <polyline points={`0,54 36,${46 - pulse * 1.5} 72,${38 - pulse * 2} 108,42 144,${26 - pulse * 2.5} 180,30 216,${16 - pulse * 2} 240,20`} fill="none" stroke="url(#trendLine)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {trendPts.map((p, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "5px 7px", borderRadius: 10, background: "rgba(15,23,42,0.24)", border: "1px solid rgba(148,163,184,0.18)", opacity: staggerOpacity(localFrame, i, 16) }}>
                  <div style={{ width: 7, height: 7, borderRadius: 999, marginTop: 8, background: i === 0 ? "#34d399" : i === 1 ? "#22d3ee" : "#a78bfa", flexShrink: 0 }} />
                  <div style={{ fontSize: 16, fontWeight: 500, color: colors.muted, lineHeight: 1.35 }}>{p}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  if (kpis.length) {
    return (
      <AbsoluteFill style={{ padding: "56px 64px", opacity }}>
        <div style={{ fontSize: 44, fontWeight: 800, color: colors.primary, marginBottom: 28 }}>{frame.title}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ minWidth: 200, flex: "1 1 200px", borderRadius: 18, padding: "24px 26px", background: colors.card, border: "1px solid rgba(255,255,255,0.1)", opacity: staggerOpacity(localFrame, i) }}>
              <div style={{ fontSize: 22, color: colors.muted }}>{k.title}</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "#34d399", marginTop: 8 }}>{k.value}{k.unit ? <span style={{ fontSize: 24, fontWeight: 600 }}> {k.unit}</span> : null}</div>
              {k.label ? <div style={{ fontSize: 20, color: colors.muted, marginTop: 6 }}>{k.label}</div> : null}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ padding: "56px 64px", justifyContent: "center", opacity }}>
      <div style={{ fontSize: 28, color: colors.muted, marginBottom: 12 }}>{frame.label}</div>
      <div style={{ fontSize: 72, fontWeight: 900, color: "#34d399" }}>{frame.value}{frame.unit ? <span style={{ fontSize: 36 }}> {frame.unit}</span> : null}</div>
      <div style={{ fontSize: 40, fontWeight: 800, color: colors.primary, marginTop: 20 }}>{frame.title}</div>
      {frame.footnote ? <div style={{ fontSize: 22, color: colors.muted, marginTop: 16 }}>{frame.footnote}</div> : null}
    </AbsoluteFill>
  );
};
