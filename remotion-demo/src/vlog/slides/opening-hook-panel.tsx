import { interpolate } from "remotion";
import type { ThemeText, VlogFrame } from "../types";

const splitTopicLine = (raw: string): { label: string; body: string } => {
  const s = String(raw || "").trim();
  const idx = s.search(/[:：]/u);
  if (idx <= 0) return { label: "", body: s };
  return { label: s.slice(0, idx).trim(), body: s.slice(idx + 1).trim() };
};

type OpeningHookPanelProps = {
  frame: VlogFrame;
  colors: ThemeText;
  hookLine: string;
  listItems: string[];
  portrait: boolean;
  height: number;
  localFrame: number;
  shinePos: number;
  ShineText: React.FC<{ text?: string; gradient: string }>;
};

/**
 * 开篇「居中舞台」默认布局（首帧无特殊需求时用此版式）
 * 数据约定：style=spotlight + hookLine + kicker + title + list（2~3 条，「标签：正文」）
 * 片尾 CTA 用 ClosingHookPanel，勿混用同一卡片栈结构
 */
export const OpeningHookPanel: React.FC<OpeningHookPanelProps> = ({
  frame,
  colors,
  hookLine,
  listItems,
  portrait,
  height,
  localFrame,
  shinePos,
  ShineText,
}) => {
  const tight = portrait || height <= 720;
  const kicker = String(frame.kicker || "").trim();
  const topics = listItems.slice(0, 3);

  const titleFs = tight ? 42 : 54;
  const hookFs = tight ? 24 : 30;
  const flowFs = tight ? 17 : 20;
  const flowLabelFs = tight ? 12 : 14;
  const kickerFs = tight ? 12 : 14;
  const arrowFs = tight ? 18 : 22;

  const enter = (i: number) =>
    interpolate(localFrame, [4 + i * 5, 16 + i * 5], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  let enterIdx = 0;

  const shineGradient = `linear-gradient(110deg, rgba(255,255,255,0) ${shinePos - 34}%, rgba(255,255,255,0.16) ${shinePos - 16}%, rgba(255,255,255,0.46) ${shinePos}%, rgba(255,255,255,0.16) ${shinePos + 16}%, rgba(255,255,255,0) ${shinePos + 34}%)`;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        minHeight: 0,
        boxSizing: "border-box",
        padding: tight ? "44px 12px 10px" : "64px 24px 12px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 85% 55% at 50% 50%, rgba(168,85,247,0.32) 0%, transparent 68%), radial-gradient(ellipse 60% 40% at 50% 90%, rgba(34,211,238,0.1) 0%, transparent 55%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          width: portrait ? "100%" : "min(920px, 92%)",
          maxHeight: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: tight ? 22 : 26,
          transform: tight ? "translateY(8px)" : "translateY(14px)",
        }}
      >
        <div style={{ opacity: enter(enterIdx++), flexShrink: 0 }}>
          {kicker ? (
            <div
              style={{
                fontSize: kickerFs,
                fontWeight: 800,
                letterSpacing: "0.18em",
                color: "#67e8f9",
                marginBottom: tight ? 14 : 18,
              }}
            >
              {kicker.toUpperCase()}
            </div>
          ) : null}
          <div
            style={{
              fontSize: titleFs,
              fontWeight: 900,
              lineHeight: 1.14,
              color: colors.primary,
              letterSpacing: "-0.02em",
              maxWidth: portrait ? "100%" : 880,
              margin: "0 auto",
            }}
          >
            <ShineText text={frame.title} gradient={shineGradient} />
          </div>
        </div>

        {hookLine ? (
          <div
            style={{
              opacity: enter(enterIdx++),
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 14,
              maxWidth: portrait ? "100%" : 820,
            }}
          >
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(167,139,250,0.5))" }} />
            <div
              style={{
                fontSize: hookFs,
                fontWeight: 800,
                lineHeight: 1.35,
                color: "#e9d5ff",
                whiteSpace: portrait ? "normal" : "nowrap",
                textShadow: "0 0 24px rgba(167,139,250,0.35)",
              }}
            >
              {hookLine}
            </div>
            <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(167,139,250,0.5), transparent)" }} />
          </div>
        ) : null}

        {topics.length > 0 ? (
          <div
            style={{
              opacity: enter(enterIdx++),
              flexShrink: 0,
              width: "100%",
              maxWidth: portrait ? "100%" : 900,
              marginTop: tight ? 4 : 6,
              padding: tight ? "14px 18px" : "16px 22px",
              borderRadius: 999,
              background: "rgba(15,23,42,0.45)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: portrait ? "column" : "row",
              alignItems: "center",
              justifyContent: "center",
              gap: portrait ? 10 : 8,
              flexWrap: "wrap",
            }}
          >
            {topics.map((t, i) => {
              const { label, body } = splitTopicLine(t);
              const accent = i === 0 ? "#22d3ee" : "#a78bfa";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: portrait ? 8 : 10 }}>
                  {i > 0 ? (
                    <div
                      style={{
                        fontSize: arrowFs,
                        fontWeight: 800,
                        color: "rgba(148,163,184,0.5)",
                        padding: portrait ? 0 : "0 4px",
                      }}
                    >
                      →
                    </div>
                  ) : null}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
                    {label ? (
                      <span style={{ fontSize: flowLabelFs, fontWeight: 800, letterSpacing: "0.08em", color: accent }}>{label}</span>
                    ) : null}
                    <span style={{ fontSize: flowFs, fontWeight: 700, color: colors.primary }}>{body || t}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
};
