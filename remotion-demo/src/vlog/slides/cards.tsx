import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { SlideInsight } from "./insight";
import { staggerOpacity, useEnter } from "../utils";

export const CardsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const cards = Array.isArray(frame.cards) ? frame.cards : [];
  const style = String(frame.style || "").toLowerCase();
  const isFlowchart = style === "flowchart";
  const isCode = style === "code";
  const isStack = style === "stack";
  const isVerdict =
    style === "verdict" ||
    (cards.length === 2 && cards.every((c) => String(c.label || "").trim() && String(c.title || "").trim()));
  const subtitle = String(frame.subtitle || "").trim();
  const compact = !isFlowchart && !isCode && cards.length >= 5;
  const titleFs = compact ? 40 : 44;
  const subFs = compact ? 22 : 26;
  const cardTitleFs = compact ? 20 : 22;
  const cardDescFs = compact ? 19 : 24;
  const cardPad = compact ? "18px 20px" : "22px 24px";
  const stackInsight = isStack && Boolean(String(frame.insight || "").trim());
  const stackDense = stackInsight && cards.length >= 3;
  const stackTight = stackInsight && cards.length >= 4;
  const stackCardPad = stackTight ? "12px 20px" : stackDense ? "14px 20px" : compact ? "22px 24px" : "22px 28px";
  const stackCardGap = stackTight ? 6 : stackDense ? 8 : compact ? 12 : 12;
  const stackTitleFs = stackTight ? 19 : stackDense ? 20 : cardTitleFs;
  const stackDescFs = stackTight ? 19 : stackDense ? 20 : cardDescFs;
  const gridGap = compact ? 18 : 20;
  const stackGridGap = stackTight ? 8 : stackDense ? 10 : gridGap;
  /** 结论区固定在上方的卡片列表之下，间距可见且不参与 flex 拉伸 */
  const stackInsightSpacing = stackTight ? 18 : stackDense ? 22 : 40;
  const cardRows = Math.ceil(cards.length / 2);
  const shellPad = stackTight
    ? "40px 52px 28px"
    : stackDense
      ? "42px 54px 32px"
      : compact
        ? "52px 56px 48px"
        : "56px 64px 48px";
  const stackTitleMargin = stackDense ? 8 : subtitle ? (compact ? 8 : 12) : compact ? 14 : 28;
  const stackSubMargin = stackDense ? 12 : isFlowchart ? 18 : compact ? 14 : 22;
  const flowDense = isFlowchart && cards.length >= 4;
  const flowTight = isFlowchart && cards.length >= 5;
  const flowCardW = flowTight ? 200 : flowDense ? 248 : 290;
  const flowMinH = flowTight ? 148 : flowDense ? 168 : 192;
  const flowGap = flowDense ? 8 : 12;
  const flowArrowFs = flowDense ? 28 : 40;
  const flowStepFs = flowDense ? 17 : 20;
  const flowLabelFs = flowDense ? 26 : 30;
  const flowDescFs = flowDense ? 18 : 21;
  const flowPad = flowDense ? "16px 14px 14px" : "20px 20px 16px";

  return (
    <AbsoluteFill style={{ padding: shellPad, opacity, boxSizing: "border-box", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div
        style={{
          fontSize: stackDense ? 40 : titleFs,
          fontWeight: 800,
          color: colors.primary,
          marginBottom: subtitle ? stackTitleMargin : stackTitleMargin,
          lineHeight: 1.15,
          flexShrink: 0,
        }}
      >
        {frame.title}
      </div>
      {subtitle ? (
        <div
          style={{
            fontSize: stackDense ? 24 : subFs,
            fontWeight: 500,
            color: colors.muted,
            lineHeight: 1.4,
            marginBottom: stackSubMargin,
            maxWidth: compact ? "100%" : 1040,
            flexShrink: 0,
          }}
        >
          {subtitle}
        </div>
      ) : null}
      {isFlowchart ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: flowGap,
            paddingTop: flowDense ? 6 : 10,
            width: "100%",
            maxWidth: "100%",
            flexShrink: 0,
            overflow: "hidden",
          }}
        >
          {cards.map((c, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: flowGap,
                opacity: staggerOpacity(localFrame, i),
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: flowCardW,
                  minHeight: flowMinH,
                  borderRadius: flowDense ? 16 : 18,
                  padding: flowPad,
                  background: colors.card,
                  border: "1px solid rgba(255,255,255,0.12)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: flowStepFs, fontWeight: 700, color: "#a78bfa", marginBottom: flowDense ? 8 : 10 }}>
                  {c.title || c.label || "步骤"}
                </div>
                {c.label ? (
                  <div style={{ fontSize: flowLabelFs, fontWeight: 800, color: colors.primary, marginBottom: flowDense ? 6 : 8 }}>
                    {c.label}
                  </div>
                ) : null}
                <div style={{ fontSize: flowDescFs, color: colors.muted, lineHeight: 1.45 }}>{c.desc}</div>
              </div>
              {i < cards.length - 1 ? (
                <div style={{ fontSize: flowArrowFs, fontWeight: 800, color: "rgba(148,163,184,0.9)", flexShrink: 0 }}>→</div>
              ) : null}
            </div>
          ))}
        </div>
      ) : isCode ? (
        <div
          style={{
            borderRadius: 18,
            padding: "22px 24px",
            background: "linear-gradient(180deg, rgba(15,23,42,0.82) 0%, rgba(2,6,23,0.88) 100%)",
            border: "1px solid rgba(148,163,184,0.28)",
            boxShadow: "0 16px 50px rgba(2,6,23,0.35)",
          }}
        >
          <div style={{ fontSize: 18, color: "rgba(148,163,184,0.95)", marginBottom: 10, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            minimal_react_agent.py
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {cards.map((c, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 12,
                  padding: "14px 16px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(15,23,42,0.45)",
                  opacity: staggerOpacity(localFrame, i),
                }}
              >
                <div
                  style={{
                    fontSize: 21,
                    fontWeight: 700,
                    color: "#93c5fd",
                    marginBottom: 6,
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                >
                  {`# ${i + 1}. ${c.title || c.label || "关键步骤"}`}
                </div>
                <div style={{ fontSize: 23, color: colors.muted, lineHeight: 1.45 }}>{c.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ) : isVerdict ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 24,
            alignItems: "stretch",
          }}
        >
          {cards.map((c, i) => {
            const accent = String(c.color || "").trim() || (i === 0 ? "#34d399" : "#fbbf24");
            return (
              <div
                key={i}
                style={{
                  borderRadius: 20,
                  padding: "28px 26px",
                  background: colors.card,
                  border: `1px solid ${accent}44`,
                  borderLeft: `6px solid ${accent}`,
                  boxShadow: `0 18px 48px rgba(0,0,0,0.32), inset 0 1px 0 ${accent}22`,
                  opacity: staggerOpacity(localFrame, i),
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  minHeight: 0,
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: colors.muted,
                    marginBottom: 12,
                  }}
                >
                  {c.title}
                </div>
                <div style={{ fontSize: 36, fontWeight: 900, color: accent, lineHeight: 1.15, marginBottom: 14 }}>
                  {c.label}
                </div>
                <div style={{ fontSize: 21, fontWeight: 500, color: colors.muted, lineHeight: 1.48 }}>{c.desc}</div>
              </div>
            );
          })}
        </div>
      ) : isStack ? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            gap: stackInsight ? 0 : stackGridGap,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              flex: stackInsight ? "1 1 0" : "0 1 auto",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              gap: stackGridGap,
              overflow: "hidden",
            }}
          >
            {cards.map((c, i) => {
              const accent = String(c.color || "").trim();
              return (
                <div
                  key={i}
                  style={{
                    flex: stackInsight ? "1 1 0" : "0 0 auto",
                    minHeight: stackInsight ? 0 : undefined,
                    borderRadius: compact ? 16 : 18,
                    padding: stackCardPad,
                    background: colors.card,
                    border: accent ? `1px solid ${accent}33` : "1px solid rgba(255,255,255,0.12)",
                    borderLeft: accent ? `4px solid ${accent}` : undefined,
                    opacity: staggerOpacity(localFrame, i),
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: stackInsight ? "flex-start" : "center",
                    gap: stackCardGap,
                    boxSizing: "border-box",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      fontSize: stackTitleFs,
                      fontWeight: 700,
                      color: accent || "#a78bfa",
                      lineHeight: 1.25,
                      flexShrink: 0,
                    }}
                  >
                    {c.title || c.label || "要点"}
                  </div>
                  <div
                    style={{
                      fontSize: stackDescFs,
                      color: colors.muted,
                      lineHeight: 1.42,
                      flexShrink: 0,
                    }}
                  >
                    {c.desc}
                  </div>
                </div>
              );
            })}
          </div>
          {stackInsight ? (
            <SlideInsight
              text={frame.insight}
              colors={colors}
              marginTop={stackInsightSpacing}
              padding={stackTight ? "12px 18px" : stackDense ? "14px 20px" : "20px 28px"}
              fontSize={stackTight ? 22 : stackDense ? 23 : undefined}
            />
          ) : null}
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            width: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gridTemplateRows: `repeat(${cardRows}, minmax(0, 1fr))`,
            gap: gridGap,
          }}
        >
          {cards.map((c, i) => {
            const lastSpans = cards.length % 2 === 1 && i === cards.length - 1;
            return (
              <div
                key={i}
                style={{
                  borderRadius: compact ? 16 : 18,
                  padding: cardPad,
                  background: colors.card,
                  border: "1px solid rgba(255,255,255,0.12)",
                  opacity: staggerOpacity(localFrame, i),
                  minWidth: 0,
                  minHeight: 0,
                  height: "100%",
                  gridColumn: lastSpans ? "1 / -1" : undefined,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ fontSize: cardTitleFs, fontWeight: 700, color: "#a78bfa", marginBottom: compact ? 8 : 10 }}>{c.title || c.label || "要点"}</div>
                <div style={{ fontSize: cardDescFs, color: colors.muted, lineHeight: 1.46 }}>{c.desc}</div>
              </div>
            );
          })}
        </div>
      )}
      {!stackInsight ? <SlideInsight text={frame.insight} colors={colors} /> : null}
    </AbsoluteFill>
  );
};
