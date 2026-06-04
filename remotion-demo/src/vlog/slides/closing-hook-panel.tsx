import { interpolate } from "remotion";
import type { ThemeText, VlogFrame } from "../types";

const stripListMarker = (raw: string) =>
  String(raw || "")
    .replace(/^[①②③④⑤⑩]+[\s.、·]*/u, "")
    .replace(/^\d{1,2}[.、)]\s+/u, "")
    .trim();

const listMarker = (raw: string) => {
  const m = String(raw || "").match(/^([①②③④⑤⑥⑦⑧⑨⑩]|\d{1,2}[.、)])/u);
  return m ? m[1].replace(/[.、)]$/, "") : null;
};

type ClosingHookPanelProps = {
  frame: VlogFrame;
  colors: ThemeText;
  hookLine: string;
  topics: string[];
  bookmarkItems: string[];
  followItems: string[];
  otherCtaItems: string[];
  portrait: boolean;
  height: number;
  localFrame: number;
  shinePos: number;
  ShineText: React.FC<{ text?: string; gradient: string }>;
};

/** 片尾 CTA：纵向分区 — 标题 / 三选一 / 下期预告 / 关注引导 */
export const ClosingHookPanel: React.FC<ClosingHookPanelProps> = ({
  frame,
  colors,
  hookLine,
  topics,
  bookmarkItems,
  followItems,
  otherCtaItems,
  portrait,
  height,
  localFrame,
  shinePos,
  ShineText,
}) => {
  const tight = portrait || height <= 720;
  const kicker = String(frame.kicker || "").trim();
  const hasNextPreview = Boolean(hookLine);

  const titleFs = tight ? 34 : 40;
  const subFs = tight ? 17 : 19;
  const topicFs = tight ? 17 : 19;
  const previewFs = tight ? 18 : 21;
  const ctaFs = tight ? 17 : 19;
  const badgeSize = tight ? 34 : 38;

  const enter = (i: number) =>
    interpolate(localFrame, [4 + i * 5, 16 + i * 5], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  let enterIdx = 0;

  const shineGradient = `linear-gradient(110deg, rgba(255,255,255,0) ${shinePos - 34}%, rgba(255,255,255,0.16) ${shinePos - 16}%, rgba(255,255,255,0.46) ${shinePos}%, rgba(255,255,255,0.16) ${shinePos + 16}%, rgba(255,255,255,0) ${shinePos + 34}%)`;

  const ctaPills = [
    ...bookmarkItems.map((t) => ({ text: stripListMarker(t), accent: "#fcd34d", icon: "🔖" })),
    ...followItems.map((t) => ({ text: stripListMarker(t), accent: "#67e8f9", icon: "👋" })),
    ...otherCtaItems.map((t) => ({ text: stripListMarker(t), accent: colors.muted, icon: "" })),
  ];

  const topicCards = topics.slice(0, 3);
  const topicCols = portrait ? 1 : topicCards.length;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        minHeight: 0,
        boxSizing: "border-box",
        padding: portrait ? "0 6px" : "0 8px",
      }}
    >
      <div
        style={{
          width: portrait ? "min(100%, 520px)" : "min(980px, 94%)",
          maxHeight: "100%",
          borderRadius: portrait ? 20 : 22,
          padding: portrait ? "24px 20px 22px" : "28px 32px 26px",
          background: "linear-gradient(165deg, rgba(15,23,42,0.62) 0%, rgba(2,6,23,0.72) 100%)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.38)",
          boxSizing: "border-box",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: tight ? 14 : 16,
        }}
      >
        {/* 头部 */}
        <div style={{ opacity: enter(enterIdx++), flexShrink: 0, textAlign: portrait ? "center" : "left" }}>
          {kicker ? (
            <div
              style={{
                display: "inline-block",
                fontSize: tight ? 11 : 12,
                fontWeight: 800,
                letterSpacing: "0.12em",
                color: "#c4b5fd",
                padding: "4px 10px",
                borderRadius: 8,
                background: "rgba(167,139,250,0.16)",
                border: "1px solid rgba(167,139,250,0.32)",
                marginBottom: tight ? 10 : 12,
              }}
            >
              {kicker}
            </div>
          ) : null}
          <div style={{ fontSize: titleFs, fontWeight: 800, lineHeight: 1.12, color: colors.primary }}>
            <ShineText text={frame.title} gradient={shineGradient} />
          </div>
          {frame.subtitle ? (
            <div style={{ marginTop: tight ? 8 : 10, fontSize: subFs, fontWeight: 500, color: colors.muted, lineHeight: 1.4 }}>
              {frame.subtitle}
            </div>
          ) : null}
        </div>

        {/* 三选一 */}
        <div
          style={{
            opacity: enter(enterIdx++),
            flexShrink: 0,
            display: "grid",
            gridTemplateColumns: portrait ? "1fr" : `repeat(${topicCols}, minmax(0, 1fr))`,
            gap: tight ? 10 : 12,
          }}
        >
          {topicCards.map((t, i) => {
            const marker = listMarker(t) || String(i + 1);
            const label = stripListMarker(t);
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: tight ? 10 : 12,
                  padding: tight ? "12px 14px" : "14px 16px",
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    width: badgeSize,
                    height: badgeSize,
                    borderRadius: 10,
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: tight ? 15 : 17,
                    fontWeight: 900,
                    color: "#0f172a",
                    background: "linear-gradient(145deg, #22d3ee 0%, #0891b2 100%)",
                    boxShadow: "0 4px 14px rgba(34,211,238,0.35)",
                  }}
                >
                  {marker}
                </div>
                <span style={{ flex: 1, minWidth: 0, fontSize: topicFs, fontWeight: 700, color: colors.primary, lineHeight: 1.35 }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* 下期预告 */}
        {hasNextPreview ? (
          <div
            style={{
              opacity: enter(enterIdx++),
              flexShrink: 0,
              padding: tight ? "14px 16px" : "16px 20px",
              borderRadius: 14,
              background: "linear-gradient(105deg, rgba(34,211,238,0.12) 0%, rgba(167,139,250,0.1) 100%)",
              border: "1px solid rgba(34,211,238,0.28)",
              borderLeft: "3px solid #22d3ee",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                fontSize: tight ? 10 : 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                color: "#67e8f9",
                marginBottom: tight ? 6 : 8,
              }}
            >
              下期预告
            </div>
            <div style={{ fontSize: previewFs, fontWeight: 800, lineHeight: 1.42, color: colors.primary }}>{hookLine}</div>
          </div>
        ) : null}

        {/* 关注 / 收藏 CTA */}
        {ctaPills.length > 0 ? (
          <div
            style={{
              opacity: enter(enterIdx++),
              flexShrink: 0,
              display: "flex",
              flexDirection: portrait ? "column" : "row",
              gap: 10,
            }}
          >
            {ctaPills.map((item, i) => (
              <div
                key={i}
                style={{
                  flex: portrait ? undefined : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: tight ? "12px 16px" : "14px 18px",
                  borderRadius: 12,
                  background: `${item.accent}18`,
                  border: `1.5px solid ${item.accent}55`,
                  fontSize: ctaFs,
                  fontWeight: 800,
                  color: item.accent,
                  lineHeight: 1.35,
                  textAlign: "center",
                  boxSizing: "border-box",
                }}
              >
                {item.icon ? <span>{item.icon}</span> : null}
                {item.text}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};
