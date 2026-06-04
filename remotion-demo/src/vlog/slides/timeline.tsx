import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { ThemeText, TimelineMilestone, VlogFrame } from "../types";
import { staggerOpacity, useEnter } from "../utils";

export const TimelineSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const items: TimelineMilestone[] = Array.isArray(frame.milestones) ? frame.milestones : [];

  return (
    <AbsoluteFill
      style={{
        padding: "48px 56px 48px",
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 800, color: colors.primary, marginBottom: 10, lineHeight: 1.15, flexShrink: 0 }}>
        {frame.title}
      </div>
      {frame.subtitle ? (
        <div style={{ fontSize: 22, fontWeight: 500, color: colors.muted, marginBottom: 18, lineHeight: 1.4, flexShrink: 0 }}>
          {frame.subtitle}
        </div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, position: "relative", paddingLeft: 22 }}>
        <div
          style={{
            position: "absolute",
            left: 10,
            top: 12,
            bottom: 12,
            width: 3,
            borderRadius: 999,
            background: "linear-gradient(180deg, rgba(167,139,250,0.95) 0%, rgba(34,211,238,0.55) 55%, rgba(52,211,153,0.45) 100%)",
            opacity: 0.85,
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingLeft: 18 }}>
          {items.map((m, i) => (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 132px) minmax(0, 1fr)",
                gap: 14,
                alignItems: "start",
                opacity: staggerOpacity(localFrame, i, 4, 7),
              }}
            >
              <div style={{ position: "relative", paddingTop: 4 }}>
                <div
                  style={{
                    position: "absolute",
                    left: -32,
                    top: 10,
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: i === 0 ? "#a78bfa" : i === items.length - 1 ? "#34d399" : "#22d3ee",
                    boxShadow: "0 0 0 4px rgba(15,23,42,0.55), 0 0 18px rgba(167,139,250,0.55)",
                  }}
                />
                <div
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    color: "#c4b5fd",
                    letterSpacing: "0.04em",
                    lineHeight: 1.25,
                  }}
                >
                  {m.label || m.title || `阶段 ${i + 1}`}
                </div>
              </div>
              <div
                style={{
                  borderRadius: 16,
                  padding: "14px 16px",
                  background: colors.card,
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.22)",
                }}
              >
                {m.title && m.label ? (
                  <div style={{ fontSize: 20, fontWeight: 750, color: colors.primary, marginBottom: 6, lineHeight: 1.3 }}>{m.title}</div>
                ) : null}
                <div style={{ fontSize: 22, color: colors.muted, lineHeight: 1.48 }}>{m.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
