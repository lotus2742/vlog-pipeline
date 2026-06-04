import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { VlogFrame } from "../../types";
import { staggerOpacity, useEnter } from "../../utils";
import { useHotlistLayout } from "../layoutSpec";
import { HOTLIST_THEME } from "../theme";

export const HotlistOutroSlide: React.FC<{ frame: VlogFrame }> = ({ frame }) => {
  const { headerH } = useHotlistLayout();
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const trendCards = Array.isArray(frame.cards) ? frame.cards : [];

  return (
    <AbsoluteFill
      style={{
        top: headerH,
        height: `calc(100% - ${headerH}px)`,
        background: "transparent",
        padding: "32px 40px 120px",
        boxSizing: "border-box",
        opacity,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flexShrink: 0, marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.12em", color: HOTLIST_THEME.growth, marginBottom: 8 }}>
          本周总结
        </div>
        <div style={{ fontSize: 36, fontWeight: 900, color: HOTLIST_THEME.title, lineHeight: 1.15 }}>
          {frame.title}
        </div>
        {frame.subtitle ? (
          <div style={{ fontSize: 18, color: HOTLIST_THEME.muted, marginTop: 10, lineHeight: 1.4 }}>{frame.subtitle}</div>
        ) : null}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: trendCards.length >= 4 ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
          gap: 14,
          alignContent: "start",
        }}
      >
        {trendCards.map((c, i) => {
          const accents = ["#0d9488", "#7c3aed", "#10b981", "#b45309"] as const;
          const accent = accents[i % accents.length];
          return (
            <div
              key={i}
              style={{
                borderRadius: 10,
                padding: "18px 16px",
                background: HOTLIST_THEME.footerBg,
                border: `1px solid ${HOTLIST_THEME.footerBorder}`,
                borderLeft: `4px solid ${accent}`,
                opacity: staggerOpacity(localFrame, i),
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, color: accent, marginBottom: 6 }}>趋势 {i + 1}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: HOTLIST_THEME.title, lineHeight: 1.25, marginBottom: 6 }}>
                {c.title || c.label}
              </div>
              <div style={{ fontSize: 14, color: HOTLIST_THEME.body, lineHeight: 1.4 }}>{c.desc}</div>
            </div>
          );
        })}
      </div>

      {frame.insight ? (
        <div
          style={{
            flexShrink: 0,
            marginTop: 16,
            fontSize: 17,
            fontWeight: 600,
            color: HOTLIST_THEME.footerText,
            padding: "14px 20px",
            borderRadius: 10,
            background: HOTLIST_THEME.footerBg,
            border: `1px solid ${HOTLIST_THEME.footerBorder}`,
            lineHeight: 1.45,
            opacity: staggerOpacity(localFrame, trendCards.length),
          }}
        >
          {frame.insight}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
