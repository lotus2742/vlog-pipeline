import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { BenchmarkTableColumn, BenchmarkTableRow, ThemeText, VlogFrame } from "../types";
import { SlideInsight } from "./insight";
import { staggerOpacity, useEnter } from "../utils";

const METRICS_COLS: BenchmarkTableColumn[] = [
  { key: "scheme", label: "方案", w: "0.9fr" },
  { key: "token", label: "Token 消耗", w: "1.35fr" },
  { key: "monthlyCost", label: "月成本", w: "0.85fr" },
  { key: "successRate", label: "成功率", w: "0.75fr" },
];

const SUMMARY_COLS: BenchmarkTableColumn[] = [
  { key: "scene", label: "场景", w: "1fr" },
  { key: "verdict", label: "结论", w: "0.95fr" },
  { key: "note", label: "要点", w: "1.35fr" },
];

const parseTokenNum = (raw: string): number => {
  const n = parseInt(String(raw).replace(/[^0-9]/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
};

const cellValue = (row: BenchmarkTableRow, key: string): string => {
  const v = (row as Record<string, string | boolean | undefined>)[key];
  return typeof v === "string" ? v : "";
};

const resolveColumns = (frame: VlogFrame): BenchmarkTableColumn[] => {
  const custom = Array.isArray(frame.benchmarkColumns) ? frame.benchmarkColumns : [];
  if (custom.length) return custom;
  const rows = Array.isArray(frame.benchmarkRows) ? frame.benchmarkRows : [];
  const isSummary = rows.some((r) => cellValue(r, "verdict") || cellValue(r, "scene"));
  return isSummary ? SUMMARY_COLS : METRICS_COLS;
};

const verdictColor = (text: string, highlight: boolean): string => {
  const t = String(text || "");
  if (/完胜|推荐|✅/i.test(t)) return "#34d399";
  if (/待验证|不确定|⚠️?/i.test(t) || highlight) return "#fbbf24";
  return "#ecfeff";
};

export const BenchmarkSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const rows = (Array.isArray(frame.benchmarkRows) ? frame.benchmarkRows : []) as BenchmarkTableRow[];
  const cols = resolveColumns(frame);
  const subtitle = String(frame.subtitle || "").trim();
  const tag = String(frame.benchmarkTag || "").trim() || (cols[0]?.key === "scene" ? "CONCLUSION" : "SCALEKIT BENCHMARK");
  const showTokenBars = cols.some((c) => c.key === "token");
  const maxToken = showTokenBars ? Math.max(...rows.map((r) => parseTokenNum(cellValue(r, "token"))), 1) : 1;

  return (
    <AbsoluteFill
      style={{
        padding: "44px 48px 48px",
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", color: "#22d3ee", marginBottom: 8 }}>
          {tag}
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, color: colors.primary, lineHeight: 1.12 }}>{frame.title}</div>
        {subtitle ? (
          <div style={{ fontSize: 20, fontWeight: 500, color: colors.muted, marginTop: 8, lineHeight: 1.4 }}>{subtitle}</div>
        ) : null}
      </div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          marginTop: 16,
          borderRadius: 16,
          overflow: "hidden",
          background: "rgba(0,0,0,0.22)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: cols.map((c) => c.w || "1fr").join(" "),
            padding: "11px 16px",
            background: "linear-gradient(90deg, rgba(34,211,238,0.22) 0%, rgba(21,94,117,0.35) 100%)",
            flexShrink: 0,
          }}
        >
          {cols.map((c) => (
            <div key={c.key} style={{ fontSize: 14, fontWeight: 800, color: "#ecfeff", letterSpacing: "0.04em" }}>
              {c.label}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {rows.map((row, i) => {
            const highlight = Boolean(row.highlight);
            const tokenRaw = cellValue(row, "token");
            const tokenNum = parseTokenNum(tokenRaw);
            const barTarget = (tokenNum / maxToken) * 100;
            const barW = interpolate(localFrame, [10 + i * 4, 34 + i * 4], [0, barTarget], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            });
            const successRaw = cellValue(row, "successRate");
            const successNum = parseInt(successRaw.replace(/[^0-9]/g, ""), 10) || 0;
            const successColor = successNum >= 99 ? "#34d399" : successNum >= 85 ? "#fbbf24" : "#fb923c";

            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: cols.map((c) => c.w || "1fr").join(" "),
                  padding: cols[0]?.key === "scene" ? "16px 16px" : "12px 16px",
                  alignItems: "center",
                  gap: 8,
                  background: highlight
                    ? "rgba(251,191,36,0.1)"
                    : i % 2 === 0
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(255,255,255,0.06)",
                  borderLeft: highlight ? "4px solid #fbbf24" : "4px solid transparent",
                  borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,0.06)" : undefined,
                  opacity: staggerOpacity(localFrame, i, 12),
                }}
              >
                {cols.map((c) => {
                  const val = cellValue(row, c.key);
                  if (c.key === "token" && showTokenBars) {
                    return (
                      <div key={c.key} style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, color: colors.primary, marginBottom: 6 }}>{val}</div>
                        <div
                          style={{
                            height: 8,
                            borderRadius: 999,
                            background: "rgba(15,23,42,0.45)",
                            overflow: "hidden",
                            border: "1px solid rgba(255,255,255,0.08)",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${barW}%`,
                              borderRadius: 999,
                              background: highlight
                                ? "linear-gradient(90deg, #fb923c 0%, #ef4444 100%)"
                                : "linear-gradient(90deg, #22d3ee 0%, #34d399 100%)",
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                  if (c.key === "successRate") {
                    return (
                      <div key={c.key} style={{ fontSize: 19, fontWeight: 800, color: successColor }}>
                        {val}
                      </div>
                    );
                  }
                  if (c.key === "verdict") {
                    return (
                      <div key={c.key} style={{ fontSize: 20, fontWeight: 800, color: verdictColor(val, highlight), lineHeight: 1.3 }}>
                        {val}
                      </div>
                    );
                  }
                  const isPrimary = c.key === "scheme" || c.key === "scene";
                  return (
                    <div
                      key={c.key}
                      style={{
                        fontSize: isPrimary ? 20 : 17,
                        fontWeight: isPrimary ? 800 : 500,
                        color: isPrimary ? (highlight ? "#fbbf24" : colors.primary) : colors.muted,
                        lineHeight: 1.4,
                      }}
                    >
                      {val}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {frame.insight ? (
        <div style={{ flexShrink: 0, marginTop: 14 }}>
          <SlideInsight text={frame.insight} colors={colors} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
