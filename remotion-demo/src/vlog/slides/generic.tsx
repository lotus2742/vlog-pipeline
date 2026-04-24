import { AbsoluteFill } from "remotion";
import type { ThemeText, VlogFrame } from "../types";
import { useEnter } from "../utils";

export const GenericSlide: React.FC<{ frame: VlogFrame; colors: ThemeText }> = ({ frame, colors }) => {
  const opacity = useEnter();
  const script = String(frame.script || "").slice(0, 280);
  return (
    <AbsoluteFill style={{ padding: "56px 64px", opacity }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: colors.primary, marginBottom: 20 }}>{frame.title || frame.type}</div>
      <div style={{ fontSize: 26, color: colors.muted, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{script}</div>
    </AbsoluteFill>
  );
};
