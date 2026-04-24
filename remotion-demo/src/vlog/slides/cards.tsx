import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { staggerOpacity, useEnter } from "../utils";

export const CardsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const cards = Array.isArray(frame.cards) ? frame.cards : [];
  return (
    <AbsoluteFill style={{ padding: "56px 64px", opacity }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: colors.primary, marginBottom: 28 }}>{frame.title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 20 }}>
        {cards.map((c, i) => (
          <div key={i} style={{ borderRadius: 18, padding: "22px 24px", background: colors.card, border: "1px solid rgba(255,255,255,0.12)", opacity: staggerOpacity(localFrame, i) }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#a78bfa", marginBottom: 10 }}>{c.title || c.label || "要点"}</div>
            <div style={{ fontSize: 24, color: colors.muted, lineHeight: 1.45 }}>{c.desc}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
