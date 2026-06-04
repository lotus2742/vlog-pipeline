import { AbsoluteFill, Img, staticFile } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { useEnter } from "../utils";

function splitDialogueQuote(raw: string): [string, string] | null {
  const t = String(raw ?? "").trim();
  if (!t) return null;
  for (const sep of ["\n---\n", "\n——\n", "\n––\n"]) {
    const i = t.indexOf(sep);
    if (i >= 0) {
      const a = t.slice(0, i).trim();
      const b = t.slice(i + sep.length).trim();
      if (a && b) return [a, b];
    }
  }
  return null;
}

const QuoteTextBlock: React.FC<{
  frame: VlogFrame;
  colors: ThemeText;
  mono: boolean;
  dialogue: boolean;
  pair: [string, string] | null;
  bubble: (opts: { body: string; align: "left" | "right"; accent: string; mutedBg: string }) => React.ReactNode;
  compact?: boolean;
}> = ({ frame, colors, mono, dialogue, pair, bubble, compact }) => {
  const titleFs = compact ? 34 : mono ? 32 : dialogue ? 36 : 38;
  const quoteFs = compact ? 30 : 34;

  return (
    <>
      <div style={{ fontSize: titleFs, fontWeight: 800, color: colors.primary, marginBottom: compact ? 16 : mono ? 18 : dialogue ? 22 : 28, lineHeight: 1.15 }}>
        {frame.title}
      </div>
      {dialogue && pair ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20, width: "100%" }}>
          {bubble({
            body: pair[0],
            align: "left",
            accent: "#22d3ee",
            mutedBg: "rgba(15,23,42,0.55)",
          })}
          {bubble({
            body: pair[1],
            align: "right",
            accent: "#fb923c",
            mutedBg: "rgba(15,23,42,0.55)",
          })}
        </div>
      ) : null}
      {dialogue && !pair ? <div style={{ fontSize: 26, color: colors.muted, lineHeight: 1.55 }}>{frame.quote}</div> : null}
      {mono ? (
        <div
          style={{
            fontSize: 22,
            lineHeight: 1.5,
            color: "#e2e8f0",
            borderRadius: 16,
            padding: "20px 22px",
            background: "linear-gradient(180deg, rgba(15,23,42,0.92) 0%, rgba(2,6,23,0.94) 100%)",
            border: "1px solid rgba(251,191,36,0.35)",
            boxShadow: "0 18px 48px rgba(0,0,0,0.45)",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: compact ? 320 : "calc(100% - 120px)",
            overflow: "hidden",
          }}
        >
          {frame.quote}
        </div>
      ) : dialogue ? null : (
        <div
          style={{
            fontSize: quoteFs,
            fontStyle: "italic",
            lineHeight: 1.55,
            color: colors.muted,
            borderLeft: "5px solid rgba(167,139,250,0.8)",
            paddingLeft: compact ? 22 : 28,
          }}
        >
          {frame.quote}
        </div>
      )}
      {frame.attribution ? (
        <div style={{ marginTop: compact ? 16 : 20, fontSize: compact ? 22 : 24, color: colors.muted }}>— {frame.attribution}</div>
      ) : null}
    </>
  );
};

export const QuoteSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const layout = String(frame.style || "").toLowerCase();
  const mono = layout === "mono" || layout === "code";
  const dialogue = layout === "dialogue";
  const pair = dialogue ? splitDialogueQuote(String(frame.quote ?? "")) : null;
  const imageSrc = String(frame.imageSrc || "").trim();

  const bubble = (opts: { body: string; align: "left" | "right"; accent: string; mutedBg: string }) => (
    <div style={{ display: "flex", justifyContent: opts.align === "left" ? "flex-start" : "flex-end", width: "100%" }}>
      <div
        style={{
          maxWidth: "min(880px, 92%)",
          borderRadius: 18,
          padding: "18px 22px",
          background: opts.mutedBg,
          border: `1px solid ${opts.accent}44`,
          boxShadow: "0 14px 40px rgba(0,0,0,0.28)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 650, color: opts.accent, marginBottom: 8, letterSpacing: "0.02em" }}>
          {opts.align === "left" ? "你" : "AI"}
        </div>
        <div style={{ fontSize: 26, fontWeight: 600, color: colors.primary, lineHeight: 1.5, wordBreak: "break-word" }}>{opts.body}</div>
      </div>
    </div>
  );

  if (imageSrc && !dialogue && !mono) {
    return (
      <AbsoluteFill
        style={{
          padding: "52px 56px 48px",
          justifyContent: "center",
          opacity,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 40,
            width: "min(1100px, 96%)",
            margin: "0 auto",
            maxHeight: "100%",
          }}
        >
          <div style={{ flexShrink: 0, position: "relative" }}>
            <div
              style={{
                width: 260,
                height: 340,
                borderRadius: 22,
                overflow: "hidden",
                border: "3px solid rgba(167,139,250,0.45)",
                boxShadow: "0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.08)",
                background: "rgba(15,23,42,0.5)",
              }}
            >
              <Img
                src={staticFile(imageSrc)}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center top",
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                bottom: -10,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "6px 14px",
                borderRadius: 999,
                background: "rgba(167,139,250,0.92)",
                color: "#0f172a",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.06em",
                whiteSpace: "nowrap",
              }}
            >
              YC
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <QuoteTextBlock frame={frame} colors={colors} mono={mono} dialogue={dialogue} pair={pair} bubble={bubble} compact />
          </div>
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill
      style={{
        padding: dialogue ? "52px 64px 48px" : "64px 80px 48px",
        justifyContent: "flex-start",
        opacity,
        boxSizing: "border-box",
      }}
    >
      <QuoteTextBlock frame={frame} colors={colors} mono={mono} dialogue={dialogue} pair={pair} bubble={bubble} />
    </AbsoluteFill>
  );
};
