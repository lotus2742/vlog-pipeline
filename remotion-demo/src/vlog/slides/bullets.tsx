import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { ThemeText, TieredBulletsContent, VlogFrame } from "../types";
import { SlideInsight } from "./insight";
import { staggerOpacity, useEnter } from "../utils";

/** VS Code 风格的深色代码窗（用于 bullets 条目的伪代码） */
const BulletCodeEditor: React.FC<{ desc: string; codeLabel?: string; compact?: boolean }> = ({
  desc,
  codeLabel,
  compact,
}) => {
  const raw = String(desc ?? "").replace(/\r\n/g, "\n");
  const lines = raw.split("\n");
  const pad = compact ? "9px 10px" : "11px 14px";
  const fontSize = compact ? 13 : 15;
  const lineNumFs = compact ? 12 : 13;
  const barFs = 12;
  const label = String(codeLabel || "pseudo").trim() || "pseudo";
  const gutterW = Math.min(44, 14 + Math.min(9, String(lines.length).length) * 9);

  return (
    <div
      style={{
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.45)",
        boxShadow: "0 10px 28px rgba(0,0,0,0.35)",
        flexShrink: 0,
        width: "100%",
        maxWidth: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "7px 12px",
          background: "#323232",
          borderBottom: "1px solid rgba(0,0,0,0.5)",
        }}
      >
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f56" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ffbd2e" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#27c93f" }} />
        </span>
        <span
          style={{
            fontSize: barFs,
            fontWeight: 600,
            color: "#b3b3b3",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            letterSpacing: "0.02em",
          }}
        >
          {label}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          background: "#1e1e1e",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize,
          lineHeight: 1.55,
        }}
      >
        <div
          style={{
            flexShrink: 0,
            width: gutterW,
            padding: pad,
            paddingRight: 10,
            textAlign: "right",
            color: "#6e7681",
            fontSize: lineNumFs,
            userSelect: "none",
            borderRight: "1px solid rgba(255,255,255,0.06)",
            boxSizing: "border-box",
          }}
        >
          {lines.map((_, li) => (
            <div key={li}>{li + 1}</div>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0, padding: pad, color: "#d4d4d4" }}>
          {lines.map((line, li) => (
            <div key={li} style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {line.length ? line : "\u00a0"}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function hasTieredBullets(tb: unknown): tb is TieredBulletsContent {
  if (!tb || typeof tb !== "object") return false;
  const o = tb as TieredBulletsContent;
  const c = o.conclusion;
  const d = o.definition;
  const traits = o.traits;
  const cOk = c && typeof c.desc === "string" && c.desc.trim().length > 0;
  const dOk = d && typeof d.desc === "string" && d.desc.trim().length > 0;
  const tOk = Array.isArray(traits) && traits.length >= 2;
  return Boolean(cOk && dOk && tOk);
}

/** 「阶段一：xxx（2021-2023）」→ 标题与时间胶囊 */
function splitStageHeadline(raw: string): { head: string; era: string | null } {
  const t = String(raw ?? "").trim();
  const m = t.match(/^(.*)（([^）]+)）\s*$/);
  if (m) {
    return { head: m[1].trim(), era: m[2].trim() };
  }
  return { head: t, era: null };
}

function stageAccentFromTitle(title: string): string {
  if (title.includes("阶段一")) {
    return "#22d3ee";
  }
  if (title.includes("阶段二")) {
    return "#a78bfa";
  }
  if (title.includes("阶段三")) {
    return "#34d399";
  }
  return "#a78bfa";
}

/** 演进三连屏：标题拆年代胶囊 + 纵向大卡片，阅读顺序自上而下 */
const StageBulletsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText; opacity: number; localFrame: number }> = ({
  frame,
  colors,
  opacity,
  localFrame,
}) => {
  const items = Array.isArray(frame.items) ? frame.items : [];
  const subtitle = String(frame.subtitle || "").trim();
  const { head, era } = splitStageHeadline(String(frame.title || ""));
  const accent = stageAccentFromTitle(String(frame.title || ""));
  const pad = "48px 56px 92px";

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 12, rowGap: 10, marginBottom: subtitle ? 12 : 16, flexShrink: 0 }}>
        <div style={{ fontSize: 40, fontWeight: 800, color: colors.primary, lineHeight: 1.18 }}>{head}</div>
        {era ? (
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: accent,
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${accent}55`,
              background: `${accent}14`,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            }}
          >
            {era}
          </div>
        ) : null}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: 21,
            fontWeight: 500,
            color: colors.muted,
            lineHeight: 1.45,
            marginBottom: 22,
            maxWidth: 920,
            flexShrink: 0,
            paddingBottom: 14,
            borderBottom: `1px solid ${accent}28`,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          justifyContent: "center",
          maxWidth: 980,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {items.map((it, i) => {
          const rawTitle = String(it.title ?? "").trim();
          const showTitle = Boolean(rawTitle);
          return (
            <div
              key={i}
              style={{
                borderRadius: 20,
                padding: "24px 28px",
                background: `linear-gradient(135deg, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.72) 100%)`,
                border: `1px solid rgba(255,255,255,0.11)`,
                boxShadow: `0 18px 56px rgba(0,0,0,0.38), inset 0 1px 0 ${accent}22`,
                boxSizing: "border-box",
                opacity: staggerOpacity(localFrame, i),
                borderLeft: `6px solid ${accent}`,
              }}
            >
              {showTitle ? (
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: accent,
                    marginBottom: 12,
                  }}
                >
                  {it.title}
                </div>
              ) : null}
              <div
                style={{
                  fontSize: showTitle ? 27 : 29,
                  fontWeight: showTitle ? 650 : 750,
                  color: showTitle ? colors.primary : colors.primary,
                  lineHeight: 1.45,
                  wordBreak: "break-word",
                }}
              >
                {it.desc}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 纵向时间线：适合「里程碑 / 生态演进」类画面（title=节点名，desc=说明） */
const TimelineBulletsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText; opacity: number; localFrame: number }> = ({
  frame,
  colors,
  opacity,
  localFrame,
}) => {
  const items = Array.isArray(frame.items) ? frame.items : [];
  const subtitle = String(frame.subtitle || "").trim();
  const pad = "42px 48px 48px";
  const n = items.length;
  const compact = n >= 5;
  const relaxed = n <= 4;

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: compact ? 36 : 40,
          fontWeight: 800,
          color: colors.primary,
          marginBottom: subtitle ? 8 : 14,
          lineHeight: 1.15,
          flexShrink: 0,
        }}
      >
        {frame.title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: compact ? 19 : 21,
            fontWeight: 500,
            color: colors.muted,
            lineHeight: 1.4,
            marginBottom: compact ? 14 : relaxed ? 12 : 18,
            flexShrink: 0,
            maxWidth: 1020,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: compact ? 6 : relaxed ? 12 : 10,
          maxWidth: 1040,
          width: "100%",
          alignSelf: "center",
          paddingTop: relaxed ? 4 : 0,
        }}
      >
        {items.map((it, i) => {
          const t = String(it.title ?? "").trim();
          const d = String(it.desc ?? "").trim();
          const isLast = i === n - 1;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "stretch",
                gap: compact ? 12 : 16,
                opacity: staggerOpacity(localFrame, i),
                minHeight: relaxed ? 76 : undefined,
              }}
            >
              <div
                style={{
                  width: 28,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    width: compact ? 11 : 13,
                    height: compact ? 11 : 13,
                    borderRadius: 999,
                    marginTop: compact ? 10 : 12,
                    background: "linear-gradient(145deg, #c4b5fd 0%, #6366f1 55%, #4f46e5 100%)",
                    boxShadow: "0 0 0 4px rgba(99,102,241,0.22)",
                  }}
                />
                {!isLast ? (
                  <div
                    style={{
                      flex: 1,
                      width: 3,
                      minHeight: compact ? 6 : 10,
                      marginTop: 4,
                      borderRadius: 2,
                      background: "linear-gradient(180deg, rgba(167,139,250,0.55) 0%, rgba(99,102,241,0.15) 100%)",
                    }}
                  />
                ) : null}
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 16,
                  padding: compact ? "10px 14px" : relaxed ? "16px 18px" : "14px 18px",
                  background: colors.card,
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxShadow: "0 12px 36px rgba(0,0,0,0.28)",
                }}
              >
                {t ? (
                  <div
                    style={{
                      fontSize: compact ? 14 : relaxed ? 16 : 15,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      color: "#a78bfa",
                      marginBottom: compact ? 4 : 6,
                    }}
                  >
                    {t}
                  </div>
                ) : null}
                <div
                  style={{
                    fontSize: compact ? 17 : relaxed ? 20 : 19,
                    fontWeight: 600,
                    color: t ? colors.muted : colors.primary,
                    lineHeight: 1.42,
                    wordBreak: "break-word",
                  }}
                >
                  {d || t}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/** 平台→Agent 映射：三列紧凑卡片，适合 9–15 条本土平台专属 Agent */
const AgentMapBulletsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText; opacity: number; localFrame: number }> = ({
  frame,
  colors,
  opacity,
  localFrame,
}) => {
  const items = Array.isArray(frame.items) ? frame.items : [];
  const subtitle = String(frame.subtitle || "").trim();
  const n = items.length;
  const cols = n <= 6 ? 2 : 3;
  const rows = Math.ceil(n / cols);
  const tight = rows >= 4;
  const pad = tight ? "36px 44px 40px" : "42px 48px 44px";
  const titleFs = tight ? 34 : 38;
  const subFs = tight ? 18 : 20;
  const cardTitleFs = tight ? 15 : 16;
  const cardDescFs = tight ? 14 : 15;
  const cardPad = tight ? "10px 12px" : "12px 14px";
  const rowGap = tight ? 8 : 10;
  const colGap = tight ? 10 : 12;

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: titleFs, fontWeight: 800, color: colors.primary, marginBottom: subtitle ? 6 : 12, lineHeight: 1.12, flexShrink: 0 }}>
        {frame.title}
      </div>
      {subtitle ? (
        <div style={{ fontSize: subFs, fontWeight: 500, color: colors.muted, lineHeight: 1.4, marginBottom: tight ? 12 : 16, flexShrink: 0 }}>
          {subtitle}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
          gap: rowGap,
          columnGap: colGap,
          alignContent: "stretch",
        }}
      >
        {items.map((it, i) => {
          const t = String(it.title ?? "").trim();
          const d = String(it.desc ?? "").trim();
          const accent = ["#38bdf8", "#34d399", "#a78bfa", "#f472b6", "#fbbf24", "#fb923c"][i % 6];
          return (
            <div
              key={i}
              style={{
                borderRadius: 12,
                padding: cardPad,
                background: `linear-gradient(135deg, ${accent}12 0%, rgba(15,23,42,0.75) 100%)`,
                border: `1px solid ${accent}44`,
                opacity: staggerOpacity(localFrame, i),
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                minHeight: 0,
                boxSizing: "border-box",
              }}
            >
              <div style={{ fontSize: cardTitleFs, fontWeight: 750, color: colors.primary, lineHeight: 1.35, wordBreak: "break-word" }}>
                {t}
              </div>
              {d ? (
                <div style={{ fontSize: cardDescFs, fontWeight: 600, color: accent, marginTop: 4, lineHeight: 1.35, wordBreak: "break-word" }}>
                  → {d}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {String(frame.insight || "").trim() ? (
        <SlideInsight text={frame.insight} colors={colors} marginTop={tight ? 10 : 14} fontSize={tight ? 18 : 20} />
      ) : null}
    </AbsoluteFill>
  );
};

/** 双痛点 + 独立结论区：痛点并列展示，结论不与清单混排 */
const PainPairBulletsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText; opacity: number; localFrame: number }> = ({
  frame,
  colors,
  opacity,
  localFrame,
}) => {
  const items = Array.isArray(frame.items) ? frame.items : [];
  const subtitle = String(frame.subtitle || "").trim();
  const conclusion = String(frame.insight || "").trim();

  return (
    <AbsoluteFill
      style={{
        padding: "44px 52px 48px",
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: 40, fontWeight: 800, color: colors.primary, marginBottom: subtitle ? 8 : 16, lineHeight: 1.15, flexShrink: 0 }}>
        {frame.title}
      </div>
      {subtitle ? (
        <div style={{ fontSize: 22, fontWeight: 500, color: colors.muted, lineHeight: 1.4, marginBottom: 18, flexShrink: 0 }}>
          {subtitle}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 18,
          alignContent: "stretch",
        }}
      >
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              borderRadius: 18,
              padding: "20px 22px",
              background: colors.card,
              border: "1px solid rgba(255,255,255,0.12)",
              opacity: staggerOpacity(localFrame, i),
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              minHeight: 0,
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: i === 0 ? "#fb7185" : "#a78bfa",
                marginBottom: 10,
              }}
            >
              {`PAIN POINT 0${i + 2}`}
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: colors.primary, lineHeight: 1.25, marginBottom: 12 }}>
              {String(it.title || "").trim()}
            </div>
            <div style={{ fontSize: 19, fontWeight: 500, color: colors.muted, lineHeight: 1.48 }}>{String(it.desc || "").trim()}</div>
          </div>
        ))}
      </div>

      {conclusion ? (
        <div
          style={{
            flexShrink: 0,
            marginTop: 18,
            borderRadius: 16,
            padding: "16px 20px",
            background: "linear-gradient(90deg, rgba(52,211,153,0.16) 0%, rgba(34,211,238,0.12) 100%)",
            border: "1px solid rgba(52,211,153,0.32)",
            opacity: staggerOpacity(localFrame, items.length),
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.1em", color: "#34d399", marginBottom: 8 }}>CONCLUSION</div>
          <div style={{ fontSize: 21, fontWeight: 700, color: colors.primary, lineHeight: 1.45 }}>{conclusion}</div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

/** 去掉标题里与左侧状态块重复的符号（❌✅✓✗ 等），避免「方块里一套、正文再一套」 */
const stripStatusEmojiPrefix = (s: string): string =>
  String(s ?? "")
    .trim()
    .replace(/^\s*(?:❌|✅|✓|✗|✘|☑)\s*/u, "")
    .trim();

/** 前端实测：✓/✗ 清单；识别 ❌/✅ 等常见写法，避免误判为中性「·」 */
const ChecklistBulletsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText; opacity: number; localFrame: number }> = ({
  frame,
  colors,
  opacity,
  localFrame,
}) => {
  const items = Array.isArray(frame.items) ? frame.items : [];
  const subtitle = String(frame.subtitle || "").trim();
  const hasInsight = Boolean(String(frame.insight || "").trim());
  const n = items.length;
  const dense = n >= 4;
  const tight = n >= 5;
  /** 3~4 条 + insight：纵向均分列表区，避免顶底裁切、下方留白 */
  const spread = hasInsight && n >= 3 && !tight;
  const padTop = tight ? 36 : spread ? 40 : 44;
  const padBottom = spread ? 28 : tight ? 40 : dense ? 48 : 92;
  const pad = `${padTop}px 48px ${padBottom}px`;
  const titleFs = tight ? 36 : dense ? 38 : 40;
  const subFs = tight ? 19 : dense ? 20 : 22;
  const listGap = spread ? (n === 3 ? 14 : 12) : tight ? 8 : dense ? 10 : 14;
  const itemPad = spread ? (n === 3 ? "18px 20px" : "14px 18px") : tight ? "10px 14px" : dense ? "12px 16px" : "16px 18px";
  const markSize = spread ? (n === 3 ? 46 : 44) : tight ? 36 : dense ? 40 : 48;
  const markFs = spread ? (n === 3 ? 23 : 22) : tight ? 18 : dense ? 20 : 24;
  const labelFs = spread ? (n === 3 ? 16 : 15) : tight ? 14 : 15;
  const descFs = spread ? (n === 3 ? 20 : 19) : tight ? 17 : dense ? 18 : 20;
  const descFsInline = spread ? (n === 3 ? 19 : 18) : tight ? 16 : 17;
  const insightMt = spread ? 12 : tight ? 14 : dense ? 20 : 30;
  const insightFs = spread ? (n === 3 ? 23 : 22) : tight ? 20 : 26;
  const listJustify = spread ? "stretch" : tight ? "flex-start" : dense ? "center" : "center";

  const inferState = (raw: string): "pass" | "fail" | "neutral" => {
    const t = String(raw ?? "");
    if (/❌|✗|✘/.test(t)) return "fail";
    if (/✅|✓|☑/.test(t)) return "pass";
    return "neutral";
  };

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ fontSize: titleFs, fontWeight: 800, color: colors.primary, marginBottom: subtitle ? (tight ? 6 : 8) : tight ? 10 : 16, lineHeight: 1.15, flexShrink: 0 }}>
        {frame.title}
      </div>
      {subtitle ? (
        <div style={{ fontSize: subFs, fontWeight: 500, color: colors.muted, lineHeight: 1.4, marginBottom: tight ? 10 : dense ? 12 : 16, flexShrink: 0 }}>
          {subtitle}
        </div>
      ) : null}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: listGap,
          justifyContent: listJustify,
          overflow: "hidden",
        }}
      >
        {items.map((it, i) => {
          const tRaw = String(it.title ?? "").trim();
          const d = String(it.desc ?? "").trim();
          const inferSource = `${tRaw} ${d}`;
          const st = inferState(inferSource);
          const mark = st === "pass" ? "✓" : st === "fail" ? "✗" : "·";
          const markBg = st === "pass" ? "rgba(52,211,153,0.22)" : st === "fail" ? "rgba(248,113,113,0.2)" : "rgba(148,163,184,0.18)";
          const markFg = st === "pass" ? "#34d399" : st === "fail" ? "#fb7185" : "rgba(226,232,240,0.85)";
          const labelAccent = st === "pass" ? "#34d399" : st === "fail" ? "#fb7185" : "#a78bfa";
          const label = stripStatusEmojiPrefix(tRaw);
          const showTwoLine = Boolean(label && d);

          const body = showTwoLine ? (
            dense ? (
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "baseline",
                  gap: spread ? 12 : tight ? 10 : 14,
                  flexWrap: "nowrap",
                }}
              >
                <div
                  style={{
                    fontSize: labelFs,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: labelAccent,
                    lineHeight: 1.3,
                    flexShrink: 0,
                    minWidth: tight ? 96 : spread ? 104 : 108,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: descFsInline,
                    fontWeight: 600,
                    color: colors.primary,
                    lineHeight: 1.4,
                    wordBreak: "break-word",
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {d}
                </div>
              </div>
            ) : (
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch" }}>
                <div
                  style={{
                    fontSize: labelFs,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: labelAccent,
                    lineHeight: 1.25,
                  }}
                >
                  {label}
                </div>
                <div style={{ fontSize: descFs, fontWeight: 600, color: colors.primary, lineHeight: 1.5, wordBreak: "break-word" }}>{d}</div>
              </div>
            )
          ) : (
            <div style={{ flex: 1, minWidth: 0, fontSize: dense ? descFs : 21, fontWeight: 650, color: colors.primary, lineHeight: 1.45, wordBreak: "break-word" }}>
              {label && d ? `${label}：${d}` : label || d || tRaw}
            </div>
          );

          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: spread ? 14 : tight ? 10 : dense ? 12 : 16,
                borderRadius: spread ? 14 : tight ? 12 : 16,
                padding: itemPad,
                background: colors.card,
                border: `1px solid ${st === "pass" ? "rgba(52,211,153,0.22)" : st === "fail" ? "rgba(251,113,133,0.22)" : "rgba(255,255,255,0.1)"}`,
                opacity: staggerOpacity(localFrame, i),
                flex: spread ? "1 1 0" : undefined,
                flexShrink: spread ? 1 : 0,
                minHeight: spread ? 0 : undefined,
                boxSizing: "border-box",
              }}
            >
              <div
                style={{
                  width: markSize,
                  height: markSize,
                  borderRadius: tight ? 8 : 12,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: markFs,
                  fontWeight: 900,
                  color: markFg,
                  background: markBg,
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {mark}
              </div>
              {body}
            </div>
          );
        })}
      </div>
      <div style={{ flexShrink: 0 }}>
        <SlideInsight
          text={frame.insight}
          colors={colors}
          marginTop={insightMt}
          fontSize={insightFs}
          padding={spread ? "14px 20px" : tight ? "12px 16px" : undefined}
        />
      </div>
    </AbsoluteFill>
  );
};

/** 收束页：大标题 + 下期横幅 + 圆形序号 + 横向要点条 */
const TakeawaysBulletsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText; opacity: number; localFrame: number }> = ({
  frame,
  colors,
  opacity,
  localFrame,
}) => {
  const items = Array.isArray(frame.items) ? frame.items : [];
  const rawSub = String(frame.subtitle || "").trim();
  const nextPrefix = "下期预告：";
  const hasNextLabel = rawSub.startsWith(nextPrefix);
  const nextBody = hasNextLabel ? rawSub.slice(nextPrefix.length).trim() : rawSub;
  const pad = "44px 52px 90px";

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        opacity,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          fontSize: 44,
          fontWeight: 800,
          color: colors.primary,
          marginBottom: rawSub ? 14 : 20,
          lineHeight: 1.12,
          flexShrink: 0,
          letterSpacing: "-0.02em",
        }}
      >
        {frame.title}
      </div>

      {rawSub ? (
        <div
          style={{
            flexShrink: 0,
            marginBottom: 24,
            borderRadius: 16,
            padding: "16px 22px",
            background: "linear-gradient(105deg, rgba(167,139,250,0.2) 0%, rgba(34,211,238,0.08) 52%, rgba(15,23,42,0.55) 100%)",
            border: "1px solid rgba(167,139,250,0.32)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px" }}>
            {hasNextLabel ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: "0.16em",
                  color: "#e9d5ff",
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(109,40,217,0.45)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                下期预告
              </span>
            ) : null}
            <span style={{ fontSize: 22, fontWeight: 600, color: colors.muted, lineHeight: 1.45, flex: "1 1 280px" }}>
              {hasNextLabel ? nextBody : rawSub}
            </span>
          </div>
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          justifyContent: "center",
          maxWidth: 1000,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {items.map((it, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "stretch",
              gap: 20,
              opacity: staggerOpacity(localFrame, i),
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: 999,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 23,
                fontWeight: 800,
                color: "#fafafa",
                background: "linear-gradient(152deg, #c4b5fd 0%, #7c3aed 42%, #5b21b6 100%)",
                boxShadow: "0 12px 32px rgba(91,33,182,0.42)",
                border: "1px solid rgba(255,255,255,0.22)",
                alignSelf: "center",
              }}
            >
              {i + 1}
            </div>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 18,
                padding: "20px 24px",
                background: `linear-gradient(180deg, ${colors.card} 0%, rgba(15,23,42,0.85) 100%)`,
                border: "1px solid rgba(255,255,255,0.11)",
                boxShadow: "0 14px 44px rgba(0,0,0,0.32)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: 24,
                  fontWeight: 650,
                  color: colors.primary,
                  lineHeight: 1.48,
                  wordBreak: "break-word",
                }}
              >
                {it.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** 上：关键结论 · 中：定义公式 · 下：本质特征网格（hooks 由外层 BulletsSlide 统一调用） */
const TieredBulletsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText; opacity: number; localFrame: number }> = ({
  frame,
  colors,
  opacity,
  localFrame,
}) => {
  const tb = frame.tieredBullets!;
  const subtitle = String(frame.subtitle || "").trim();
  const traitsHeading = String(tb.traitsHeading || "本质特征").trim() || "本质特征";
  const traits = tb.traits;
  const pad = "48px 56px 84px";
  const titleFs = 40;
  const subFs = 22;
  const sectionLabelFs = 13;
  const conclusionBodyFs = 23;
  const definitionBodyFs = 21;
  const traitTitleFs = 17;
  const traitDescFs = 15;
  const traitRows = Math.ceil(traits.length / 2);

  const sectionShell = (opts: { children: ReactNode; staggerIndex: number; flex?: number; shrink?: number }) => (
    <div
      style={{
        opacity: staggerOpacity(localFrame, opts.staggerIndex),
        flex: opts.flex,
        flexShrink: opts.shrink ?? 0,
        minHeight: 0,
        width: "100%",
      }}
    >
      {opts.children}
    </div>
  );

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        opacity,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: titleFs,
          fontWeight: 800,
          color: colors.primary,
          marginBottom: subtitle ? 8 : 14,
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        {frame.title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: subFs,
            fontWeight: 500,
            color: colors.muted,
            lineHeight: 1.4,
            marginBottom: 18,
            maxWidth: "100%",
            flexShrink: 0,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {sectionShell({
          staggerIndex: 0,
          children: (
            <div
              style={{
                borderRadius: 12,
                padding: "18px 22px",
                background: "rgba(167,139,250,0.14)",
                border: "1px solid rgba(167,139,250,0.28)",
              }}
            >
              <div
                style={{
                  fontSize: sectionLabelFs,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: colors.muted,
                  marginBottom: 10,
                  textTransform: "none",
                }}
              >
                {String(tb.conclusion.label || "关键结论").trim() || "关键结论"}
              </div>
              <div style={{ fontSize: conclusionBodyFs, fontWeight: 700, color: colors.primary, lineHeight: 1.45, wordBreak: "break-word" }}>
                {tb.conclusion.desc}
              </div>
            </div>
          ),
        })}

        {sectionShell({
          staggerIndex: 1,
          children: (
            <div
              style={{
                borderRadius: 10,
                padding: "14px 20px",
                borderLeft: "4px solid rgba(167,139,250,0.85)",
                background: "rgba(255,255,255,0.04)",
              }}
            >
              <div
                style={{
                  fontSize: sectionLabelFs,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  color: colors.muted,
                  marginBottom: 8,
                }}
              >
                {String(tb.definition.label || "定义").trim() || "定义"}
              </div>
              <div
                style={{
                  fontSize: definitionBodyFs,
                  fontWeight: 600,
                  color: colors.primary,
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                }}
              >
                {tb.definition.desc}
              </div>
            </div>
          ),
        })}

        {sectionShell({
          staggerIndex: 2,
          flex: 1,
          shrink: 1,
          children: (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, gap: 10 }}>
              <div
                style={{
                  fontSize: sectionLabelFs + 2,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  color: colors.primary,
                  flexShrink: 0,
                  paddingLeft: 2,
                  borderBottom: "1px solid rgba(167,139,250,0.22)",
                  paddingBottom: 8,
                }}
              >
                {traitsHeading}
              </div>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gridTemplateRows: `repeat(${traitRows}, minmax(0, 1fr))`,
                  gap: 12,
                }}
              >
                {traits.map((it, i) => {
                  const rawTitle = String(it.title ?? "").trim();
                  const lastSpansFullRow = traits.length % 2 === 1 && i === traits.length - 1;
                  return (
                    <div
                      key={i}
                      style={{
                        opacity: staggerOpacity(localFrame, 3 + i),
                        minWidth: 0,
                        minHeight: 0,
                        gridColumn: lastSpansFullRow ? "1 / -1" : undefined,
                        borderRadius: 10,
                        padding: "12px 14px",
                        background: "rgba(255,255,255,0.045)",
                        border: "1px solid rgba(255,255,255,0.08)",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      {rawTitle ? (
                        <div style={{ fontSize: traitTitleFs, fontWeight: 700, color: colors.primary, lineHeight: 1.35, marginBottom: 5 }}>
                          {rawTitle}
                        </div>
                      ) : null}
                      <div style={{ fontSize: traitDescFs, fontWeight: 400, color: colors.muted, lineHeight: 1.45, wordBreak: "break-word" }}>
                        {it.desc}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ),
        })}
      </div>
    </AbsoluteFill>
  );
};

export const BulletsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();

  if (hasTieredBullets(frame.tieredBullets)) {
    return <TieredBulletsSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} />;
  }

  const items = Array.isArray(frame.items) ? frame.items : [];
  const subtitle = String(frame.subtitle || "").trim();
  const layout = String(frame.style || "").toLowerCase();
  if (layout === "stage") {
    return <StageBulletsSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} />;
  }
  if (layout === "takeaways") {
    return <TakeawaysBulletsSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} />;
  }
  if (layout === "checklist") {
    return <ChecklistBulletsSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} />;
  }
  if (layout === "pain-pair") {
    return <PainPairBulletsSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} />;
  }
  if (layout === "timeline") {
    return <TimelineBulletsSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} />;
  }
  if (layout === "agent-map") {
    return <AgentMapBulletsSlide frame={frame} colors={colors} opacity={opacity} localFrame={localFrame} />;
  }
  /** 显式 grid：双列 + 卡片衬底，层次更清晰 */
  const gridCards = layout === "grid";
  /** 恰好 3 条时用三列一行，避免「2+1」第三块顶满宽、与上排挤成一坨 */
  const gridTriple = gridCards && items.length === 3;
  /** 条目多时用双列；行高用 1fr 均分剩余竖向空间 */
  const dense = layout === "dense" || gridCards || items.length >= 5;
  const tight = items.length >= 7;

  const titleFs = dense ? (tight ? 36 : 40) : 44;
  const subFs = dense ? (tight ? 20 : 22) : 26;
  const subMb = dense ? (tight ? 12 : 14) : 22;
  const badgePx = dense ? (tight ? 28 : 30) : 36;
  const badgeFs = dense ? (tight ? 15 : 16) : 18;
  const itemTitleFs = dense ? (tight ? 20 : 22) : 26;
  const descFs = dense ? (tight ? 17 : 19) : 23;
  const descFsNoTitle = dense ? (tight ? 18 : 20) : 26;
  const gapMain = dense ? (gridTriple ? 20 : tight ? 13 : 16) : 14;
  const colGap = dense ? (gridTriple ? 26 : tight ? 22 : 28) : 0;
  const pad = dense ? `52px ${tight ? 52 : gridTriple ? 48 : 56}px 48px` : "56px 72px 48px";

  const gridRows = gridTriple ? 1 : Math.ceil(items.length / 2);
  /** 代码块占位高，避免 column + height:100% 子项互相叠盖 */
  const hasCodeBlock = items.some((it) => Boolean(it.code));
  const columnGapY = gapMain + (hasCodeBlock && !dense ? 10 : 0);

  return (
    <AbsoluteFill
      style={{
        padding: pad,
        opacity,
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          fontSize: titleFs,
          fontWeight: 800,
          color: colors.primary,
          marginBottom: subtitle ? (dense ? 8 : 12) : dense ? 14 : 28,
          lineHeight: 1.2,
          flexShrink: 0,
        }}
      >
        {frame.title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: subFs,
            fontWeight: 500,
            color: colors.muted,
            lineHeight: 1.4,
            marginBottom: subMb,
            maxWidth: dense ? "100%" : 1040,
            flexShrink: 0,
          }}
        >
          {subtitle}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          display: dense ? "grid" : "flex",
          gridTemplateColumns: dense
            ? gridTriple
              ? "repeat(3, minmax(0, 1fr))"
              : "repeat(2, minmax(0, 1fr))"
            : undefined,
          gridTemplateRows: dense
            ? hasCodeBlock
              ? `repeat(${gridRows}, auto)`
              : `repeat(${gridRows}, minmax(0, 1fr))`
            : undefined,
          columnGap: dense ? colGap : undefined,
          rowGap: dense ? (hasCodeBlock ? gapMain + 8 : gridTriple ? gapMain + 6 : gapMain) : undefined,
          flexDirection: dense ? undefined : "column",
          justifyContent: dense ? undefined : hasCodeBlock ? "flex-start" : "space-evenly",
          alignContent: dense && hasCodeBlock ? "start" : undefined,
          gap: dense ? undefined : columnGapY,
          overflowY: !dense && hasCodeBlock ? "auto" : undefined,
          overflowX: "hidden",
        }}
      >
        {items.map((it, i) => {
          const rawTitle = String(it.title ?? "").trim();
          const redundantIndex =
            /^\d+$/.test(rawTitle) && Number.parseInt(rawTitle, 10) === i + 1;
          const showTitle = Boolean(rawTitle) && !redundantIndex;
          const bodySize = showTitle ? descFs : descFsNoTitle;
          const lastSpansFullRow = dense && !gridTriple && items.length % 2 === 1 && i === items.length - 1;
          const isCode = Boolean(it.code);
          const codeLabel = String(it.codeLabel ?? "").trim();

          const rowInner = gridTriple ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 14,
                width: "100%",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "linear-gradient(145deg, rgba(167,139,250,0.5) 0%, rgba(99,102,241,0.35) 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 18,
                  color: "#f5f3ff",
                  flexShrink: 0,
                  border: "1px solid rgba(255,255,255,0.18)",
                }}
              >
                {i + 1}
              </div>
              <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                {showTitle ? (
                  <div
                    style={{
                      fontSize: itemTitleFs,
                      fontWeight: 800,
                      color: colors.primary,
                      lineHeight: 1.3,
                    }}
                  >
                    {it.title}
                  </div>
                ) : null}
                {isCode ? (
                  <BulletCodeEditor desc={String(it.desc ?? "")} codeLabel={codeLabel || undefined} compact={dense} />
                ) : (
                  <div
                    style={{
                      fontSize: bodySize,
                      fontWeight: showTitle ? 400 : 600,
                      color: colors.muted,
                      lineHeight: 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    {it.desc}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                gap: dense ? 12 : 16,
                alignItems: "flex-start",
                width: "100%",
              }}
            >
              <div
                style={{
                  minWidth: badgePx,
                  width: badgePx,
                  height: badgePx,
                  borderRadius: dense ? 8 : 10,
                  background: "rgba(167,139,250,0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: badgeFs,
                  color: "#e9d5ff",
                  flexShrink: 0,
                }}
              >
                {i + 1}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "stretch" }}>
                {showTitle ? (
                  <div
                    style={{
                      fontSize: itemTitleFs,
                      fontWeight: 700,
                      color: colors.primary,
                      lineHeight: 1.35,
                      marginBottom: isCode ? 10 : 0,
                      flexShrink: 0,
                    }}
                  >
                    {it.title}
                  </div>
                ) : null}
                {isCode ? (
                  <BulletCodeEditor desc={String(it.desc ?? "")} codeLabel={codeLabel || undefined} compact={dense} />
                ) : (
                  <div
                    style={{
                      fontSize: bodySize,
                      fontWeight: showTitle ? 400 : 600,
                      color: colors.muted,
                      marginTop: showTitle ? (dense ? 4 : 6) : 0,
                      lineHeight: dense ? 1.48 : 1.5,
                      wordBreak: "break-word",
                    }}
                  >
                    {it.desc}
                  </div>
                )}
              </div>
            </div>
          );

          return (
            <div
              key={i}
              style={{
                opacity: staggerOpacity(localFrame, i),
                minWidth: 0,
                minHeight: 0,
                height: dense && !hasCodeBlock ? "100%" : "auto",
                flexShrink: !dense ? 0 : undefined,
                gridColumn: lastSpansFullRow ? "1 / -1" : undefined,
                display: "flex",
                flexDirection: "column",
                justifyContent: dense ? "center" : "flex-start",
                alignSelf: dense && hasCodeBlock ? "stretch" : undefined,
                ...(gridCards
                  ? {
                      borderRadius: gridTriple ? 20 : 18,
                      padding: gridTriple ? "22px 18px" : "20px 22px",
                      background: colors.card,
                      border: "1px solid rgba(255,255,255,0.12)",
                      boxShadow: gridTriple ? "0 16px 48px rgba(0,0,0,0.32)" : "0 14px 46px rgba(0,0,0,0.28)",
                      boxSizing: "border-box",
                    }
                  : {}),
              }}
            >
              {rowInner}
            </div>
          );
        })}
      </div>
      {gridCards && String(frame.insight || "").trim() ? (
        <SlideInsight text={frame.insight} colors={colors} marginTop={dense ? 14 : 18} fontSize={dense ? 21 : 24} />
      ) : null}
    </AbsoluteFill>
  );
};
