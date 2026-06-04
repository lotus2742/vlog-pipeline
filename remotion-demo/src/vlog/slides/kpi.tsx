import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { SlideInsight } from "./insight";
import { staggerOpacity, useEnter } from "../utils";

const parseKpiNum = (raw: string): number => {
  const n = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const parseNumericTrend = (raw: unknown[]): number[] => {
  const out: number[] = [];
  for (const x of raw) {
    if (typeof x === "number" && Number.isFinite(x)) {
      out.push(x);
      continue;
    }
    const n = parseFloat(String(x).replace(/[^0-9.]/g, ""));
    if (Number.isFinite(n) && String(x).trim().match(/\d/)) out.push(n);
  }
  return out;
};

const parseTextTrend = (raw: unknown[], numeric: number[]): string[] => {
  const used = new Set(numeric);
  return raw
    .map((x) => String(x).trim())
    .filter((s) => {
      if (!s) return false;
      const n = parseFloat(s.replace(/[^0-9.]/g, ""));
      return !(Number.isFinite(n) && /^\d[\d.,]*$/.test(s.replace(/,/g, "").trim()) && used.has(n));
    });
};

const kpiBarColor = (value: number, highlight: boolean): string => {
  if (highlight || value < 85) return "#fb923c";
  if (value >= 99) return "#34d399";
  if (value >= 90) return "#22d3ee";
  return "#fbbf24";
};

const STRIP_ACCENTS = ["#34d399", "#22d3ee", "#fbbf24", "#a78bfa"] as const;

const trendPolyline = (values: number[], h: number, w: number, padY = 8): string => {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const innerH = h - padY * 2;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = padY + innerH - ((v - min) / span) * innerH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
};

const deriveTrendFromKpis = (kpis: VlogFrame["kpis"]): number[] => {
  if (!kpis?.length) return [];
  const nums = kpis.map((k) => parseKpiNum(String(k.value || "0"))).filter((n) => n > 0);
  return nums.length >= 2 ? nums : [];
};

export const KpiSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const kpis = Array.isArray(frame.kpis) ? frame.kpis : [];
  const rawTrend = Array.isArray(frame.trend_points) ? frame.trend_points : [];
  const numericTrend = parseNumericTrend(rawTrend);
  const textTrend = parseTextTrend(rawTrend, numericTrend);
  const layoutStyle = String(frame.style || "").toLowerCase();
  const subtitle = String(frame.subtitle || "").trim();
  const insight = String(frame.insight || frame.footnote || "").trim();
  const useReliabilityRows = layoutStyle === "bars" || layoutStyle === "rows";
  const chartValues = numericTrend.length >= 2 ? numericTrend : deriveTrendFromKpis(kpis);
  const useDashboard =
    layoutStyle === "dashboard" || (layoutStyle !== "strip" && layoutStyle !== "single" && kpis.length >= 4 && chartValues.length >= 2);
  const useStrip = kpis.length >= 2 && (layoutStyle === "strip" || layoutStyle === "" || (!useReliabilityRows && !useDashboard && layoutStyle !== "single"));

  if (kpis.length && useReliabilityRows) {
    const maxVal = Math.max(...kpis.map((k) => parseKpiNum(String(k.value || "0"))), 1);
    const accents = ["#34d399", "#22d3ee", "#fb923c"] as const;
    const failReasonLabel = String(frame.trend_title || "典型失败原因").trim();

    const failNoteFor = (k: (typeof kpis)[number], i: number): string => {
      const direct = String(k.note || "").trim();
      if (direct) return direct;
      const title = String(k.title || "").trim();
      const pt = rawTrend[i] || rawTrend.find((p) => title && String(p).trim().startsWith(title));
      if (!pt) return "";
      const idx = String(pt).indexOf("：");
      return idx >= 0 ? String(pt).slice(idx + 1).trim() : String(pt).trim();
    };

    const rowCount = kpis.length;
    const compact = rowCount >= 3;

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          opacity,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          padding: compact ? "22px 44px 10px" : "28px 48px 16px",
          overflow: "hidden",
        }}
      >
        <header style={{ flexShrink: 0, marginBottom: compact ? 10 : 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "#22d3ee", marginBottom: 6 }}>
            RELIABILITY
          </div>
          <div style={{ fontSize: compact ? 30 : 32, fontWeight: 800, color: colors.primary, lineHeight: 1.12 }}>{frame.title}</div>
          {subtitle ? (
            <div style={{ fontSize: compact ? 15 : 16, fontWeight: 500, color: colors.muted, marginTop: 6, lineHeight: 1.4 }}>{subtitle}</div>
          ) : null}
        </header>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: compact ? 10 : 14, overflow: "hidden" }}>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              boxSizing: "border-box",
              borderRadius: 18,
              padding: compact ? "16px 28px" : "26px 36px",
              background: "rgba(0,0,0,0.24)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex",
              flexDirection: "column",
              gap: compact ? 14 : 22,
              overflow: "hidden",
              justifyContent: "flex-start",
            }}
          >
            {kpis.map((k, i) => {
              const val = parseKpiNum(String(k.value || "0"));
              const hi = Boolean(k.highlight);
              const barColor = kpiBarColor(val, hi);
              const failNote = failNoteFor(k, i);
              const barW = interpolate(localFrame, [8 + i * 6, 32 + i * 6], [0, (val / maxVal) * 100], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });
              const accent = accents[i % accents.length];
              const isLast = i === kpis.length - 1;
              const rowPad = compact ? 14 : 22;
              return (
                <div
                  key={i}
                  style={{
                    flexShrink: 0,
                    paddingBottom: isLast ? 0 : rowPad,
                    borderBottom: isLast ? undefined : "1px solid rgba(255,255,255,0.1)",
                    borderLeft: hi ? `4px solid ${barColor}` : undefined,
                    paddingLeft: hi ? 12 : 0,
                    opacity: staggerOpacity(localFrame, i),
                    boxSizing: "border-box",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: compact ? 8 : 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: compact ? 20 : 22, fontWeight: 900, color: accent, lineHeight: 1.2 }}>{k.title}</div>
                      {k.label ? (
                        <div style={{ fontSize: compact ? 13 : 14, fontWeight: 600, color: colors.muted, marginTop: 4, lineHeight: 1.35 }}>{k.label}</div>
                      ) : null}
                    </div>
                    <span style={{ fontSize: compact ? 26 : 28, fontWeight: 900, color: barColor, flexShrink: 0, lineHeight: 1 }}>
                      {k.value}
                      {k.unit ? <span style={{ fontSize: compact ? 14 : 16, fontWeight: 700 }}>{k.unit}</span> : null}
                    </span>
                  </div>
                  <div style={{ height: compact ? 9 : 11, borderRadius: 999, background: "rgba(15,23,42,0.55)", overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", marginBottom: failNote ? (compact ? 8 : 12) : 0 }}>
                    <div style={{ height: "100%", width: `${barW}%`, borderRadius: 999, background: `linear-gradient(90deg, ${barColor}cc 0%, ${barColor} 100%)` }} />
                  </div>
                  {failNote ? (
                    <div style={{ fontSize: compact ? 12 : 13, fontWeight: 500, color: colors.muted, lineHeight: 1.45 }}>
                      <span style={{ fontWeight: 700, color: accent }}>{failReasonLabel} · </span>
                      {failNote}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
          {insight ? <SlideInsight text={insight} colors={colors} marginTop={0} /> : null}
        </div>
      </div>
    );
  }

  if (kpis.length && useDashboard) {
    const trendTitle = String(frame.trend_title || "增长趋势").trim();
    const poly = trendPolyline(chartValues, 68, 240);
    const lineDraw = interpolate(localFrame, [6, 28], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

    return (
      <AbsoluteFill style={{ padding: "30px 36px 48px", opacity, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 34, fontWeight: 800, color: colors.primary, marginBottom: 8, flexShrink: 0 }}>{frame.title}</div>
        {subtitle ? <div style={{ fontSize: 18, color: colors.muted, marginBottom: 12, flexShrink: 0 }}>{subtitle}</div> : null}
        <div style={{ display: "flex", flex: 1, minHeight: 0, gap: 14 }}>
          <div style={{ flex: "1 1 52%", display: "flex", flexWrap: "wrap", gap: 8, alignContent: "flex-start" }}>
            {kpis.slice(0, 4).map((k, i) => (
              <div
                key={i}
                style={{
                  minWidth: 124,
                  flex: "1 1 44%",
                  borderRadius: 16,
                  padding: "11px 12px",
                  background: colors.card,
                  border: "1px solid rgba(255,255,255,0.1)",
                  opacity: staggerOpacity(localFrame, i),
                }}
              >
                <div style={{ fontSize: 15, color: colors.muted }}>{k.title}</div>
                <div style={{ fontSize: 27, fontWeight: 800, color: "#34d399", marginTop: 2 }}>
                  {k.value}
                  {k.unit ? <span style={{ fontSize: 16, fontWeight: 600 }}> {k.unit}</span> : null}
                </div>
                {k.label ? <div style={{ fontSize: 13, color: colors.muted, marginTop: 4 }}>{k.label}</div> : null}
              </div>
            ))}
          </div>
          <div
            style={{
              flex: "1 1 42%",
              borderRadius: 18,
              padding: "12px 14px",
              background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
              border: "1px solid rgba(255,255,255,0.16)",
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, color: colors.primary, marginBottom: 8 }}>{trendTitle}</div>
            <div style={{ position: "relative", flex: 1, minHeight: 80, borderRadius: 12, background: "rgba(15,23,42,0.28)", border: "1px solid rgba(148,163,184,0.2)", overflow: "hidden" }}>
              <svg viewBox="0 0 240 68" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
                <defs>
                  <linearGradient id="trendLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((g) => (
                  <line key={g} x1={0} y1={12 + g * 14} x2={240} y2={12 + g * 14} stroke="rgba(148,163,184,0.15)" strokeWidth={1} />
                ))}
                <polyline
                  points={poly}
                  fill="none"
                  stroke="url(#trendLine)"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={400}
                  strokeDashoffset={400 * (1 - lineDraw)}
                />
              </svg>
            </div>
            {textTrend.length ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                {textTrend.map((p, i) => (
                  <div key={i} style={{ fontSize: 14, color: colors.muted, lineHeight: 1.35, opacity: staggerOpacity(localFrame, i, 12) }}>
                    {p}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {insight ? <SlideInsight text={insight} colors={colors} marginTop={10} /> : null}
      </AbsoluteFill>
    );
  }

  if (kpis.length && useStrip) {
    const maxVal = Math.max(...kpis.map((k) => parseKpiNum(String(k.value || "0"))), 1);
    const n = kpis.length;
    const compact = n >= 4;

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          opacity,
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          padding: compact ? "24px 40px 12px" : "28px 48px 14px",
          overflow: "hidden",
        }}
      >
        <header style={{ flexShrink: 0, marginBottom: compact ? 12 : 16 }}>
          <div style={{ fontSize: compact ? 32 : 36, fontWeight: 800, color: colors.primary, lineHeight: 1.12 }}>{frame.title}</div>
          {subtitle ? <div style={{ fontSize: compact ? 16 : 18, fontWeight: 500, color: colors.muted, marginTop: 8, lineHeight: 1.4 }}>{subtitle}</div> : null}
        </header>

        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "flex",
            borderRadius: 20,
            background: "rgba(0,0,0,0.22)",
            border: "1px solid rgba(255,255,255,0.12)",
            overflow: "hidden",
          }}
        >
          {kpis.map((k, i) => {
            const val = parseKpiNum(String(k.value || "0"));
            const accent = STRIP_ACCENTS[i % STRIP_ACCENTS.length];
            const barW = interpolate(localFrame, [10 + i * 5, 34 + i * 5], [0, (val / maxVal) * 100], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: compact ? "20px 14px" : "28px 18px",
                  borderRight: i < n - 1 ? "1px solid rgba(255,255,255,0.1)" : undefined,
                  opacity: staggerOpacity(localFrame, i),
                  boxSizing: "border-box",
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: compact ? 15 : 17, fontWeight: 600, color: colors.muted, textAlign: "center", lineHeight: 1.3 }}>{k.title}</div>
                <div style={{ fontSize: compact ? 36 : 42, fontWeight: 900, color: accent, marginTop: 10, lineHeight: 1, textAlign: "center" }}>
                  {k.value}
                  {k.unit ? <span style={{ fontSize: compact ? 18 : 20, fontWeight: 700 }}>{k.unit}</span> : null}
                </div>
                {k.label ? (
                  <div style={{ fontSize: compact ? 13 : 14, color: colors.muted, marginTop: 8, textAlign: "center", lineHeight: 1.35 }}>{k.label}</div>
                ) : null}
                <div
                  style={{
                    width: "88%",
                    maxWidth: 200,
                    height: compact ? 8 : 10,
                    borderRadius: 999,
                    marginTop: compact ? 14 : 18,
                    background: "rgba(15,23,42,0.5)",
                    overflow: "hidden",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${barW}%`,
                      borderRadius: 999,
                      background: `linear-gradient(90deg, ${accent}aa 0%, ${accent} 100%)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {textTrend.length ? (
          <div style={{ flexShrink: 0, marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {textTrend.map((p, i) => (
              <div key={i} style={{ fontSize: 14, color: colors.muted, lineHeight: 1.35, opacity: staggerOpacity(localFrame, i, 8) }}>
                {p}
              </div>
            ))}
          </div>
        ) : null}

        {insight ? <SlideInsight text={insight} colors={colors} marginTop={10} /> : null}
      </div>
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
              <div style={{ fontSize: 40, fontWeight: 800, color: "#34d399", marginTop: 8 }}>
                {k.value}
                {k.unit ? <span style={{ fontSize: 24, fontWeight: 600 }}> {k.unit}</span> : null}
              </div>
              {k.label ? <div style={{ fontSize: 20, color: colors.muted, marginTop: 6 }}>{k.label}</div> : null}
            </div>
          ))}
        </div>
        {insight ? <SlideInsight text={insight} colors={colors} marginTop={16} /> : null}
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ padding: "56px 64px", justifyContent: "center", opacity }}>
      <div style={{ fontSize: 28, color: colors.muted, marginBottom: 12 }}>{frame.label}</div>
      <div style={{ fontSize: 72, fontWeight: 900, color: "#34d399" }}>
        {frame.value}
        {frame.unit ? <span style={{ fontSize: 36 }}> {frame.unit}</span> : null}
      </div>
      <div style={{ fontSize: 40, fontWeight: 800, color: colors.primary, marginTop: 20 }}>{frame.title}</div>
      {frame.footnote ? <div style={{ fontSize: 22, color: colors.muted, marginTop: 16 }}>{frame.footnote}</div> : null}
    </AbsoluteFill>
  );
};
