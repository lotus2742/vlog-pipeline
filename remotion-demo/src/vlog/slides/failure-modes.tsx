import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { FailureModeItem, ThemeText, VlogFrame } from "../types";
import { staggerOpacity, useEnter } from "../utils";

type FreqKey = "high" | "medium" | "low";

const FREQ_STYLE: Record<FreqKey, { label: string; color: string; bg: string; border: string }> = {
  high: { label: "高频", color: "#fb923c", bg: "rgba(251,146,60,0.16)", border: "rgba(251,146,60,0.45)" },
  medium: { label: "中频", color: "#fbbf24", bg: "rgba(251,191,36,0.14)", border: "rgba(251,191,36,0.38)" },
  low: { label: "低频", color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.32)" },
};

const parseFrequency = (raw: string): FreqKey => {
  const t = String(raw || "");
  if (/高频|high/i.test(t)) return "high";
  if (/中频|medium/i.test(t)) return "medium";
  if (/低频|low/i.test(t)) return "low";
  return "medium";
};

const splitTitleFreq = (title: string): { title: string; frequency: FreqKey } => {
  const parts = String(title || "").split(/[·•|]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1];
    if (/频/.test(tail)) {
      return { title: parts.slice(0, -1).join(" · "), frequency: parseFrequency(tail) };
    }
  }
  return { title: String(title || "").trim(), frequency: "medium" };
};

const normalizeModes = (frame: VlogFrame): FailureModeItem[] => {
  const explicit = Array.isArray(frame.failureModes) ? frame.failureModes : [];
  if (explicit.length) {
    return explicit.map((m, i) => ({
      rank: m.rank ?? i + 1,
      title: String(m.title || "").trim(),
      desc: String(m.desc || "").trim(),
      frequency: (m.frequency as FreqKey) || parseFrequency(String(m.frequencyLabel || "")),
    }));
  }
  const items = Array.isArray(frame.items) ? frame.items : [];
  return items.map((it, i) => {
    const parsed = splitTitleFreq(String(it.title || ""));
    return {
      rank: i + 1,
      title: parsed.title,
      desc: String(it.desc || "").trim(),
      frequency: parsed.frequency,
    };
  });
};

export const FailureModesSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const modes = normalizeModes(frame);
  const subtitle = String(frame.subtitle || "").trim();
  const statValue = String(frame.value || "72%").trim();
  const statLabel = String(frame.label || "成功率").trim();
  const statNote = String(frame.footnote || frame.hookLine || "每 4 次约有 1 次失败").trim();
  const pulse = interpolate(localFrame % 72, [0, 36, 71], [0.92, 1.06, 0.92], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        padding: "40px 48px 48px",
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 24,
          marginBottom: 18,
          flexShrink: 0,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: "#22d3ee", marginBottom: 8 }}>
            FAILURE ANALYSIS
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: colors.primary, lineHeight: 1.15 }}>{frame.title}</div>
          {subtitle ? (
            <div style={{ fontSize: 20, fontWeight: 500, color: colors.muted, marginTop: 8, lineHeight: 1.4 }}>{subtitle}</div>
          ) : null}
        </div>

        <div
          style={{
            flexShrink: 0,
            minWidth: 168,
            borderRadius: 18,
            padding: "14px 18px",
            textAlign: "center",
            background: "linear-gradient(145deg, rgba(251,146,60,0.2) 0%, rgba(239,68,68,0.12) 100%)",
            border: "1px solid rgba(251,146,60,0.35)",
            transform: `scale(${pulse})`,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "#fdba74", letterSpacing: "0.06em" }}>{statLabel}</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: "#fb923c", lineHeight: 1.05, marginTop: 2 }}>{statValue}</div>
          {statNote ? (
            <div style={{ fontSize: 15, fontWeight: 600, color: colors.muted, marginTop: 8, lineHeight: 1.35 }}>{statNote}</div>
          ) : null}
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12, justifyContent: "center" }}>
        {modes.map((m, i) => {
          const freq = (m.frequency as FreqKey) || "medium";
          const tone = FREQ_STYLE[freq] ?? FREQ_STYLE.medium;
          const rank = m.rank ?? i + 1;
          return (
            <div
              key={i}
              style={{
                display: "grid",
                gridTemplateColumns: "52px minmax(0, 1fr)",
                gap: 14,
                alignItems: "stretch",
                opacity: staggerOpacity(localFrame, i, 10),
              }}
            >
              <div
                style={{
                  borderRadius: 14,
                  background: "rgba(15,23,42,0.55)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  fontWeight: 900,
                  color: rank === 1 ? "#fb923c" : "#22d3ee",
                }}
              >
                {rank}
              </div>
              <div
                style={{
                  borderRadius: 16,
                  padding: "14px 18px",
                  background: colors.card,
                  borderLeft: `5px solid ${tone.color}`,
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      color: tone.color,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: tone.bg,
                      border: `1px solid ${tone.border}`,
                    }}
                  >
                    {tone.label}
                  </span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: colors.primary, lineHeight: 1.25 }}>{m.title}</span>
                </div>
                <div style={{ fontSize: 18, fontWeight: 500, color: colors.muted, lineHeight: 1.45 }}>{m.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
