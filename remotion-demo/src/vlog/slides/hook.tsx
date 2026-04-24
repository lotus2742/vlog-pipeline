import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { useEnter } from "../utils";

export const HookSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const shinePos = interpolate(localFrame, [8, 96], [-40, 140], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shineOpacity = interpolate(localFrame, [0, 10, 96, 120], [0, 0.88, 0.88, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spotlight = String(frame.style || "").toLowerCase() === "spotlight";
  const listItems = Array.isArray(frame.list) ? frame.list : [];
  const isClosingHook = listItems.length >= 3;
  const listBlock = listItems.length > 0 ? (
    <ul style={{ marginTop: 24, marginBottom: 0, paddingLeft: 24, fontSize: isClosingHook ? 22 : 26, color: colors.muted, lineHeight: isClosingHook ? 1.6 : 1.55 }}>
      {listItems.map((t, i) => (
        <li key={i} style={{ marginBottom: isClosingHook ? 10 : 8 }}>{t}</li>
      ))}
    </ul>
  ) : null;

  const ShineText = ({ text, gradient }: { text?: string; gradient: string }) => (
    <span style={{ position: "relative", display: "inline-block", overflow: "hidden" }}>
      <span>{text}</span>
      <span style={{ position: "absolute", inset: 0, color: "transparent", background: gradient, WebkitBackgroundClip: "text", filter: "blur(1.2px)", opacity: shineOpacity, pointerEvents: "none" }}>
        {text}
      </span>
    </span>
  );

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 72, opacity }}>
      {spotlight ? (
        <div style={{ width: "min(980px, 92%)", borderRadius: 28, padding: isClosingHook ? "44px 50px" : "52px 56px", background: "radial-gradient(ellipse at 50% 0%, rgba(168,85,247,0.35), transparent 55%), rgba(0,0,0,0.25)", border: "1px solid rgba(255,255,255,0.14)", boxShadow: "0 24px 80px rgba(0,0,0,0.45)" }}>
          <div style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.12, color: colors.primary }}>
            <ShineText text={frame.title} gradient={`linear-gradient(110deg, rgba(255,255,255,0) ${shinePos - 34}%, rgba(255,255,255,0.16) ${shinePos - 16}%, rgba(255,255,255,0.46) ${shinePos}%, rgba(255,255,255,0.16) ${shinePos + 16}%, rgba(255,255,255,0) ${shinePos + 34}%)`} />
          </div>
          {frame.subtitle ? <div style={{ marginTop: isClosingHook ? 16 : 22, fontSize: isClosingHook ? 26 : 30, color: colors.muted, lineHeight: 1.45 }}>{frame.subtitle}</div> : null}
          {isClosingHook ? (
            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
              {listItems.map((t, i) => (
                <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.14)", background: "rgba(15,23,42,0.32)", padding: "10px 12px", fontSize: 20, lineHeight: 1.45, color: colors.muted }}>
                  <span style={{ color: "#a78bfa", fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>{t}
                </div>
              ))}
            </div>
          ) : listBlock}
        </div>
      ) : (
        <div style={{ textAlign: "center", maxWidth: 980 }}>
          <div style={{ fontSize: 62, fontWeight: 800, lineHeight: 1.1, color: colors.primary }}>
            <ShineText text={frame.title} gradient={`linear-gradient(110deg, rgba(255,255,255,0) ${shinePos - 34}%, rgba(255,255,255,0.18) ${shinePos - 16}%, rgba(255,255,255,0.5) ${shinePos}%, rgba(255,255,255,0.18) ${shinePos + 16}%, rgba(255,255,255,0) ${shinePos + 34}%)`} />
          </div>
          {frame.subtitle ? <div style={{ marginTop: 20, fontSize: 32, color: colors.muted }}>{frame.subtitle}</div> : null}
          {listItems.length > 0 ? <div style={{ textAlign: "left", maxWidth: 880, margin: "28px auto 0" }}>{listBlock}</div> : null}
        </div>
      )}
    </AbsoluteFill>
  );
};
