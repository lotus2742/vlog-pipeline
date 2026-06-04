import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { ThemeText, TriplePillar, VlogFrame } from "../types";
import { staggerOpacity, useEnter } from "../utils";

/** 角色冲突：左栏候选条渐增、右栏漏斗收窄，以数量对比呈现矛盾 */
const TensionComparisonSlide: React.FC<{ frame: VlogFrame; colors: ThemeText; opacity: number; localFrame: number }> = ({
  frame,
  colors,
  opacity,
  localFrame,
}) => {
  const left = frame.left || {};
  const right = frame.right || {};
  const lPts = Array.isArray(left.points) ? left.points : [];
  const rPts = Array.isArray(right.points) ? right.points : [];
  const lAccent = String(left.color || "#22d3ee");
  const rAccent = String(right.color || "#fb7185");
  const lMax = Math.max(1, lPts.length);
  const rMax = Math.max(1, rPts.length);
  const progress = interpolate(localFrame, [8, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const leftCount = Math.max(1, Math.round(interpolate(progress, [0, 1], [1, lMax])));
  const rightCount = Math.max(1, Math.round(interpolate(progress, [0, 1], [rMax, 1])));
  const wobble = Math.sin(localFrame / 7) * 5;
  const leftGoal = String(left.title || "多找").trim();
  const rightGoal = String(right.title || "严筛").trim();
  const outcome = String(rPts[0] || "精选 ✓").trim();

  const panelShell = (accent: string): React.CSSProperties => ({
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    borderRadius: 18,
    padding: "16px 18px",
    background: colors.card,
    border: `1.5px solid ${accent}55`,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  });

  return (
    <AbsoluteFill style={{ padding: "52px 56px 44px", opacity, boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ fontSize: 38, fontWeight: 800, color: colors.primary, marginBottom: 8, lineHeight: 1.15, flexShrink: 0 }}>{frame.title}</div>
      {frame.subtitle ? (
        <div style={{ fontSize: 20, fontWeight: 500, color: colors.muted, marginBottom: 12, lineHeight: 1.4, flexShrink: 0 }}>{frame.subtitle}</div>
      ) : null}

      <div
        style={{
          flexShrink: 0,
          marginBottom: 14,
          borderRadius: 12,
          padding: "10px 18px",
          background: "rgba(0,0,0,0.28)",
          border: "1px solid rgba(255,255,255,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          fontSize: 19,
          fontWeight: 700,
        }}
      >
        <span style={{ color: lAccent }}>{leftGoal}</span>
        <span style={{ color: "#fbbf24", transform: `translateX(${wobble}px)`, display: "inline-block" }}>↔</span>
        <span style={{ color: rAccent }}>{rightGoal}</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 14, alignItems: "stretch" }}>
        <div style={panelShell(lAccent)}>
          <div style={{ fontSize: 20, fontWeight: 800, color: lAccent, marginBottom: 4, flexShrink: 0 }}>{left.label}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: colors.muted, marginBottom: 12, flexShrink: 0 }}>{leftGoal}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: lAccent, lineHeight: 1 }}>{leftCount}</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: colors.muted }}>条候选</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 7, marginTop: 14 }}>
            {Array.from({ length: lMax }).map((_, i) => {
              const lit = i < leftCount;
              const widthPct = 52 + (i / Math.max(lMax - 1, 1)) * 42;
              return (
                <div
                  key={i}
                  style={{
                    height: 10,
                    borderRadius: 5,
                    width: `${widthPct}%`,
                    background: lit ? `linear-gradient(90deg, ${lAccent}66, ${lAccent})` : "rgba(255,255,255,0.06)",
                    border: `1px solid ${lit ? `${lAccent}55` : "rgba(255,255,255,0.08)"}`,
                    opacity: lit ? staggerOpacity(localFrame, i, 4, 4) : 0.3,
                  }}
                />
              );
            })}
          </div>
        </div>

        <div style={{ alignSelf: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, width: 44 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#fbbf24", lineHeight: 1 }}>⚡</div>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(148,163,184,0.85)" }}>冲突</div>
        </div>

        <div style={panelShell(rAccent)}>
          <div style={{ fontSize: 20, fontWeight: 800, color: rAccent, marginBottom: 4, flexShrink: 0 }}>{right.label}</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: colors.muted, marginBottom: 12, flexShrink: 0 }}>{rightGoal}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 48, fontWeight: 900, color: rAccent, lineHeight: 1 }}>{rightCount}</span>
            <span style={{ fontSize: 17, fontWeight: 600, color: colors.muted }}>条保留</span>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6, maxWidth: 168, opacity: 0.55 + progress * 0.35 }}>
              {Array.from({ length: leftCount }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: `${lAccent}${i < leftCount - 1 ? "88" : "44"}`,
                  }}
                />
              ))}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: rAccent, letterSpacing: "0.12em" }}>↓ 筛 ↓</div>
            <div
              style={{
                padding: "12px 22px",
                borderRadius: 12,
                background: `${rAccent}22`,
                border: `2px solid ${rAccent}`,
                fontSize: 21,
                fontWeight: 800,
                color: colors.primary,
                opacity: staggerOpacity(localFrame, 0, 28, 10),
                textAlign: "center",
              }}
            >
              {outcome}
            </div>
          </div>
        </div>
      </div>

      {frame.insight ? (
        <div
          style={{
            marginTop: 14,
            flexShrink: 0,
            fontSize: 21,
            fontWeight: 700,
            color: colors.primary,
            padding: "14px 18px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.1)",
            opacity: staggerOpacity(localFrame, 4, 20, 8),
            lineHeight: 1.4,
            textAlign: "center",
          }}
        >
          {frame.insight}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** 串行 vs 并行：上串行链、下并行汇入 */
const PipelineComparisonSlide: React.FC<{ frame: VlogFrame; colors: ThemeText; opacity: number; localFrame: number }> = ({
  frame,
  colors,
  opacity,
  localFrame,
}) => {
  const left = frame.left || {};
  const right = frame.right || {};
  const serialLabels = ["A", "B", "C", "D", "E"];
  const lAccent = String(left.color || "#94a3b8");
  const rAccent = String(right.color || "#34d399");
  const serialLit = Math.min(
    serialLabels.length,
    Math.max(0, Math.floor(interpolate(localFrame, [6, 72], [0, serialLabels.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))),
  );
  const parallelLit = Math.min(
    5,
    Math.max(0, Math.floor(interpolate(localFrame, [10, 60], [0, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }))),
  );

  const serialDone = serialLit >= serialLabels.length;
  const parallelDone = parallelLit >= 5;

  const blockShell = (accent: string): React.CSSProperties => ({
    flex: 1,
    minHeight: 0,
    borderRadius: 16,
    padding: "14px 16px 12px",
    background: colors.card,
    border: `1px solid ${accent}44`,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    boxSizing: "border-box",
  });

  const timeRowStyle = (accent: string, lit: boolean): React.CSSProperties => ({
    flexShrink: 0,
    marginTop: 8,
    paddingTop: 8,
    textAlign: "center",
    fontSize: 22,
    fontWeight: 800,
    color: accent,
    opacity: lit ? 1 : 0.35,
    borderTop: `1px solid ${accent}22`,
    lineHeight: 1.2,
  });

  return (
    <AbsoluteFill style={{ padding: "48px 52px 40px", opacity, boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ fontSize: 38, fontWeight: 800, color: colors.primary, marginBottom: 8, lineHeight: 1.15, flexShrink: 0 }}>{frame.title}</div>
      {frame.subtitle ? (
        <div style={{ fontSize: 20, fontWeight: 500, color: colors.muted, marginBottom: 14, lineHeight: 1.4, flexShrink: 0 }}>{frame.subtitle}</div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
        <div style={blockShell(lAccent)}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.1em", color: lAccent, marginBottom: 10, flexShrink: 0 }}>
            {left.label || "单 Agent"} · {left.title || "串行"}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap", overflow: "hidden" }}>
            {serialLabels.map((lab, i) => (
              <div key={lab} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 11,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 800,
                    color: i < serialLit ? colors.primary : colors.muted,
                    background: i < serialLit ? `${lAccent}33` : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${i < serialLit ? lAccent : "rgba(255,255,255,0.1)"}`,
                    opacity: staggerOpacity(localFrame, i, 2, 8),
                  }}
                >
                  {lab}
                </div>
                {i < serialLabels.length - 1 ? (
                  <div style={{ fontSize: 20, fontWeight: 800, color: i < serialLit - 1 ? lAccent : "rgba(148,163,184,0.35)" }}>→</div>
                ) : null}
              </div>
            ))}
          </div>
          <div style={timeRowStyle(lAccent, serialDone)}>{(left.points || [])[0] || "⏱ 50 秒"}</div>
        </div>

        <div style={blockShell(rAccent)}>
          <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: "0.1em", color: rAccent, marginBottom: 10, flexShrink: 0 }}>
            {right.label || "多 Agent"} · {right.title || "并行 + 汇总"}
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 8, overflow: "hidden" }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 30,
                    height: 28 + i * 3,
                    borderRadius: 7,
                    background: i < parallelLit ? `${rAccent}44` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${i < parallelLit ? rAccent : "rgba(255,255,255,0.1)"}`,
                    opacity: staggerOpacity(localFrame, i, 8, 6),
                  }}
                />
                <div style={{ fontSize: 10, fontWeight: 700, color: rAccent, opacity: i < parallelLit ? 1 : 0.4 }}>
                  {serialLabels[i]}
                </div>
              </div>
            ))}
            <div style={{ fontSize: 22, fontWeight: 800, color: rAccent, margin: "0 4px", opacity: parallelDone ? 1 : 0.3 }}>→</div>
            <div
              style={{
                borderRadius: 10,
                padding: "10px 14px",
                background: `${rAccent}22`,
                border: `1.5px solid ${rAccent}`,
                fontSize: 16,
                fontWeight: 800,
                color: colors.primary,
                opacity: parallelDone ? 1 : 0.35,
                flexShrink: 0,
              }}
            >
              汇总
            </div>
          </div>
          <div style={timeRowStyle(rAccent, parallelDone)}>{(right.points || [])[0] || "⏱ 15 秒"}</div>
        </div>
      </div>

      {frame.insight ? (
        <div
          style={{
            marginTop: 14,
            flexShrink: 0,
            fontSize: 18,
            fontWeight: 600,
            color: colors.muted,
            textAlign: "center",
            opacity: staggerOpacity(localFrame, 5, 40, 10),
          }}
        >
          {frame.insight}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

const TriplePillarSlide: React.FC<{
  frame: VlogFrame;
  colors: ThemeText;
  opacity: number;
  localFrame: number;
  pillars: TriplePillar[];
}> = ({ frame, colors, opacity, localFrame, pillars }) => {
  const accent = ["#22d3ee", "#34d399", "#a78bfa"] as const;
  const subtitle = String(frame.subtitle || "").trim();

  return (
    <AbsoluteFill
      style={{
        padding: "44px 40px 48px",
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: "#22d3ee", marginBottom: 8 }}>
          FACTION MAP
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, color: colors.primary, lineHeight: 1.12 }}>{frame.title}</div>
        {subtitle ? (
          <div style={{ fontSize: 20, fontWeight: 500, color: colors.muted, marginTop: 8, lineHeight: 1.4 }}>{subtitle}</div>
        ) : null}
      </div>
      <div style={{ flex: 1, minHeight: 0, marginTop: 18, display: "flex", gap: 14, alignItems: "stretch" }}>
        {pillars.map((p, i) => {
          const lines = Array.isArray(p.lines) ? p.lines : [];
          const border = accent[i % accent.length];
          const hi = Boolean(p.highlight);
          const badge = String(p.highlightLabel || "").trim();
          const bodyFs = lines.length >= 3 ? 18 : 19;
          const lineGap = lines.length >= 3 ? 10 : 8;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 18,
                padding: hi ? "18px 16px 16px" : "16px 14px 14px",
                background: hi ? `linear-gradient(180deg, ${border}18 0%, rgba(15,23,42,0.55) 100%)` : colors.card,
                border: hi ? `2px solid ${border}` : `1px solid ${border}55`,
                boxShadow: hi
                  ? `0 16px 48px ${border}33, inset 0 1px 0 rgba(255,255,255,0.08)`
                  : `0 12px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.06)`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 10,
                opacity: staggerOpacity(localFrame, i),
                position: "relative",
                textAlign: "center",
              }}
            >
              {hi && badge ? (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: border,
                    background: `${border}22`,
                    border: `1px solid ${border}66`,
                    borderRadius: 6,
                    padding: "3px 8px",
                  }}
                >
                  {badge}
                </div>
              ) : null}
              <div style={{ fontSize: 26, fontWeight: 900, color: border, lineHeight: 1.1, width: "100%" }}>{p.title}</div>
              {p.foot ? (
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: colors.primary,
                    background: `${border}1a`,
                    border: `1px solid ${border}55`,
                    borderRadius: 999,
                    padding: "6px 14px",
                    lineHeight: 1.25,
                    maxWidth: "100%",
                  }}
                >
                  {p.foot}
                </div>
              ) : null}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: lineGap,
                  justifyContent: "center",
                }}
              >
                {lines.map((ln, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: bodyFs,
                      fontWeight: 600,
                      color: colors.primary,
                      lineHeight: 1.42,
                      padding: "0 6px",
                    }}
                  >
                    {ln}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {frame.insight ? (
        <div
          style={{
            marginTop: 14,
            flexShrink: 0,
            fontSize: 22,
            fontWeight: 700,
            color: colors.primary,
            padding: "14px 18px",
            borderRadius: 12,
            background: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.08)",
            opacity: staggerOpacity(localFrame, pillars.length),
            lineHeight: 1.4,
          }}
        >
          {frame.insight}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

export const ComparisonSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const layoutStyle = String(frame.style || "").toLowerCase();
  if (layoutStyle === "tension") {
    return <TensionComparisonSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} />;
  }
  if (layoutStyle === "pipeline") {
    return <PipelineComparisonSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} />;
  }
  const pillars = Array.isArray(frame.pillars) ? frame.pillars : [];
  if (layoutStyle === "triple" && pillars.length === 3) {
    return <TriplePillarSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} pillars={pillars} />;
  }
  const left = frame.left || {};
  const right = frame.right || {};
  const lPts = Array.isArray(left.points) ? left.points : [];
  const rPts = Array.isArray(right.points) ? right.points : [];
  const lExample = String(left.example || "").trim();
  const rExample = String(right.example || "").trim();
  const compareRows = Array.isArray(frame.compareRows) ? frame.compareRows : [];
  const rowMatrix = compareRows.filter((r) => String(r?.left || "").trim() && String(r?.right || "").trim());
  const useRowMatrix = rowMatrix.length >= 1;
  const hasSplitExamples = Boolean(lExample || rExample);
  const splitCompact = hasSplitExamples && !useRowMatrix;
  /** 无举例区时：左右各一栏，避免大框套标签框/标题框 */
  const flatSplit = layoutStyle === "split" && !useRowMatrix && !hasSplitExamples;

  const renderCompareColumn = (
    side: { label?: string; title?: string; color?: string; points?: string[]; example?: string },
    pts: string[],
    example: string,
    fallbackAccent: string,
    staggerIndex: number,
    compact: boolean,
    flat: boolean,
  ) => {
    const accent = String(side.color || fallbackAccent).trim() || fallbackAccent;
    const borderSoft = `${accent}66`;
    const label = side.label || side.title || "";
    const title = side.title && side.title !== side.label ? side.title : "";
    const labelFs = compact ? 20 : 24;
    const titleFs = compact ? 17 : 19;
    const pointFs = compact ? 17 : 20;
    const exampleFs = compact ? 15 : 17;

    if (flat) {
      return (
        <div
          style={{
            flex: 1,
            minWidth: 0,
            borderRadius: 16,
            padding: "20px 22px 18px",
            background: colors.card,
            border: `1.5px solid ${borderSoft}`,
            opacity: staggerOpacity(localFrame, staggerIndex),
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          <div style={{ fontSize: 24, fontWeight: 800, color: accent, lineHeight: 1.2, flexShrink: 0 }}>{label}</div>
          {title ? (
            <div style={{ fontSize: 17, fontWeight: 600, color: colors.muted, marginTop: 6, lineHeight: 1.35, flexShrink: 0 }}>
              {title}
            </div>
          ) : null}
          <div style={{ flex: 1, minHeight: 0, marginTop: 14, display: "flex", flexDirection: "column", gap: 10, justifyContent: "center" }}>
            {pts.map((p, i) => (
              <div
                key={i}
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  color: colors.primary,
                  lineHeight: 1.42,
                  paddingLeft: 12,
                  borderLeft: `3px solid ${accent}`,
                }}
              >
                {p}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div
        style={{
          flex: 1,
          minWidth: 0,
          borderRadius: compact ? 16 : 20,
          padding: compact ? "14px 14px 12px" : "20px 18px 16px",
          background: `linear-gradient(180deg, ${accent}18 0%, ${colors.card} 42%)`,
          border: `1.5px solid ${borderSoft}`,
          boxShadow: `inset 0 1px 0 ${accent}33, 0 10px 32px rgba(0,0,0,0.22)`,
          opacity: staggerOpacity(localFrame, staggerIndex),
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            alignSelf: "flex-start",
            fontSize: labelFs,
            fontWeight: 800,
            color: accent,
            background: `${accent}28`,
            border: `1.5px solid ${accent}`,
            borderRadius: 10,
            padding: "5px 12px",
            marginBottom: title ? 8 : compact ? 10 : 12,
            lineHeight: 1.2,
            flexShrink: 0,
          }}
        >
          {label || "左侧"}
        </div>
        {title ? (
          <div
            style={{
              fontSize: titleFs,
              fontWeight: 700,
              color: colors.primary,
              background: "rgba(0,0,0,0.42)",
              border: `1px solid ${accent}88`,
              borderRadius: 8,
              padding: compact ? "6px 10px" : "8px 12px",
              marginBottom: compact ? 8 : 10,
              lineHeight: 1.3,
              flexShrink: 0,
            }}
          >
            {title}
          </div>
        ) : null}
        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {pts.length ? (
            <ul
              style={{
                margin: 0,
                paddingLeft: 20,
                color: colors.muted,
                fontSize: pointFs,
                lineHeight: 1.38,
                flex: example ? "1 1 auto" : undefined,
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              {pts.map((p, i) => (
                <li key={i} style={{ marginBottom: compact ? 4 : 6 }}>
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: colors.muted, fontSize: pointFs, flexShrink: 0 }}>（无要点，见下方结论）</div>
          )}
          {example ? (
            <div
              style={{
                marginTop: "auto",
                flexShrink: 0,
                padding: compact ? "8px 10px" : "10px 12px",
                borderRadius: 10,
                background: "rgba(0,0,0,0.38)",
                border: `1px dashed ${accent}`,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: accent, marginBottom: 4 }}>举例</div>
              <div style={{ fontSize: exampleFs, fontWeight: 600, color: colors.primary, lineHeight: 1.38, wordBreak: "break-word" }}>{example}</div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };
  const compactRows = useRowMatrix && rowMatrix.length >= 5;
  const fewRows = useRowMatrix && rowMatrix.length <= 3;

  const titleFs = compactRows ? 38 : splitCompact ? 36 : 42;
  const titleMb = compactRows ? 14 : splitCompact ? 12 : useRowMatrix ? 18 : 26;
  const headFs = compactRows ? 19 : 22;
  const headMb = compactRows ? 10 : 12;
  const rowGap = compactRows ? 9 : fewRows ? 14 : 10;
  const cellPad = compactRows ? "11px 14px" : fewRows ? "22px 20px" : "14px 16px";
  const cellRadius = compactRows ? 13 : 14;
  const rowFs = compactRows ? 17 : fewRows ? 22 : 20;
  const midW = compactRows ? 32 : 36;
  const midFs = compactRows ? 16 : fewRows ? 20 : 18;
  const rowMinH = fewRows ? (rowMatrix.length === 1 ? 140 : 108) : undefined;
  const shellPad = compactRows ? "48px 56px 48px" : splitCompact ? "38px 44px 32px" : "52px 60px 48px";

  return (
    <AbsoluteFill style={{ padding: shellPad, opacity, boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ fontSize: titleFs, fontWeight: 800, color: colors.primary, marginBottom: titleMb, flexShrink: 0, lineHeight: 1.15 }}>{frame.title}</div>
      {flatSplit && String(frame.subtitle || "").trim() ? (
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: colors.muted,
            marginTop: -Math.max(8, titleMb - 10),
            marginBottom: 16,
            flexShrink: 0,
            lineHeight: 1.4,
          }}
        >
          {frame.subtitle}
        </div>
      ) : null}
      {useRowMatrix ? (
        <>
          <div style={{ display: "flex", gap: 14, marginBottom: headMb, paddingLeft: 4, paddingRight: 4, flexShrink: 0 }}>
            <div style={{ flex: 1, fontSize: headFs, fontWeight: 700, color: "#22d3ee", textAlign: "center" }}>
              {left.label || left.title || "左侧"}
            </div>
            <div style={{ width: midW }} />
            <div style={{ flex: 1, fontSize: headFs, fontWeight: 700, color: "#fb923c", textAlign: "center" }}>
              {right.label || right.title || "右侧"}
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                gap: rowGap,
                justifyContent: compactRows ? "flex-start" : "center",
                paddingBottom: frame.insight ? 8 : 0,
              }}
            >
              {rowMatrix.map((row, i) => (
                <div
                  key={i}
                  style={{
                    flex: "0 0 auto",
                    minHeight: rowMinH,
                    display: "flex",
                    gap: compactRows ? 10 : 14,
                    alignItems: "stretch",
                    opacity: staggerOpacity(localFrame, i),
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderRadius: cellRadius,
                      padding: cellPad,
                      background: colors.card,
                      border: "1px solid rgba(34,211,238,0.28)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: rowFs, color: colors.muted, lineHeight: 1.42 }}>{row.left}</span>
                  </div>
                  <div
                    style={{
                      width: midW,
                      alignSelf: "center",
                      textAlign: "center",
                      fontSize: midFs,
                      fontWeight: 800,
                      color: "rgba(148,163,184,0.85)",
                    }}
                  >
                    ⇄
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minWidth: 0,
                      borderRadius: cellRadius,
                      padding: cellPad,
                      background: colors.card,
                      border: "1px solid rgba(251,146,60,0.28)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    <span style={{ fontSize: rowFs, color: colors.muted, lineHeight: 1.42 }}>{row.right}</span>
                  </div>
                </div>
              ))}
            </div>
            {frame.insight ? (
              <div
                style={{
                  flexShrink: 0,
                  marginTop: compactRows ? 10 : 12,
                  fontSize: compactRows ? 19 : fewRows ? 21 : 22,
                  color: colors.muted,
                  padding: "14px 18px",
                  borderRadius: 14,
                  background: "rgba(0,0,0,0.2)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  opacity: staggerOpacity(localFrame, rowMatrix.length),
                  lineHeight: 1.45,
                }}
              >
                {frame.insight}
              </div>
            ) : null}
          </div>
        </>
      ) : (
        <div style={{ display: "flex", gap: flatSplit ? 20 : splitCompact ? 16 : 28, flex: 1, minHeight: 0, overflow: "hidden" }}>
          {renderCompareColumn(left, lPts, lExample, "#22d3ee", 0, splitCompact, flatSplit)}
          {renderCompareColumn(right, rPts, rExample, "#a78bfa", 1, splitCompact, flatSplit)}
        </div>
      )}
      {frame.insight && !useRowMatrix ? (
        <div
          style={{
            marginTop: splitCompact ? 12 : 22,
            flexShrink: 0,
            fontSize: splitCompact ? 18 : compactRows ? 19 : 22,
            color: colors.muted,
            padding: splitCompact ? "10px 14px" : "14px 18px",
            borderRadius: 14,
            background: "rgba(0,0,0,0.2)",
            border: "1px solid rgba(255,255,255,0.08)",
            opacity: staggerOpacity(localFrame, 2),
            lineHeight: 1.4,
          }}
        >
          {frame.insight}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
