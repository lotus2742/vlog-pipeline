import { AbsoluteFill, useCurrentFrame } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { staggerOpacity, useEnter } from "../utils";

export const BulletsSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const localFrame = useCurrentFrame();
  const items = Array.isArray(frame.items) ? frame.items : [];
  return (
    <AbsoluteFill style={{ padding: "56px 72px", opacity }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: colors.primary, marginBottom: 28 }}>{frame.title}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start", opacity: staggerOpacity(localFrame, i) }}>
            <div style={{ minWidth: 36, height: 36, borderRadius: 10, background: "rgba(167,139,250,0.35)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18, color: "#e9d5ff" }}>{i + 1}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: colors.primary }}>{it.title}</div>
              <div style={{ fontSize: 23, color: colors.muted, marginTop: 6, lineHeight: 1.5 }}>{it.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
